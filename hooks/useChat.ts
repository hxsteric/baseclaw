"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import type { ChatMessage, UserConfig } from "@/lib/types";
import { WS_PROXY_URL } from "@/lib/constants";

interface UseChatOptions {
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1500;

export function useChat(config: UserConfig | null, token: string | null, fid?: number | null, options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(options?.initialMessages || []);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentRunRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  // Stabilize config into a string key so the useEffect only re-runs
  // when actual config values change, not on every React re-render.
  const configKey = useMemo(
    () => (config ? JSON.stringify(config) : null),
    [config]
  );

  // Connect to proxy
  useEffect(() => {
    if (!configKey) return;

    const cfg: UserConfig = JSON.parse(configKey);
    intentionalCloseRef.current = false;
    reconnectCountRef.current = 0;

    function connect() {
      // Clean up any existing connection
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }

      const ws = new WebSocket(WS_PROXY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectCountRef.current = 0; // Reset on successful connect

        // Send config on connect
        const configMsg: Record<string, unknown> = {
          action: "config",
          model: cfg.model,
          provider: cfg.provider,
          keyMode: cfg.keyMode || "byok",
        };

        if (cfg.keyMode === "managed") {
          configMsg.fid = fid;
        } else {
          configMsg.apiKey = cfg.apiKey;
        }

        if (cfg.uncensored) {
          configMsg.uncensored = true;
        }

        ws.send(JSON.stringify(configMsg));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setIsConnected(true);
            break;

          case "delta":
            currentRunRef.current = data.runId;
            setIsStreaming(true);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.text },
                ];
              }
              return [
                ...prev,
                {
                  id: data.runId || nanoid(),
                  role: "assistant",
                  content: data.text,
                  timestamp: Date.now(),
                  streaming: true,
                },
              ];
            });
            break;

          case "final":
            setIsStreaming(false);
            currentRunRef.current = null;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: data.message || last.content,
                    streaming: false,
                  },
                ];
              }
              return prev;
            });
            break;

          case "history":
            if (data.messages) {
              setMessages(data.messages);
            }
            break;

          case "error":
            setIsStreaming(false);
            setMessages((prev) => [
              ...prev,
              {
                id: nanoid(),
                role: "assistant",
                content: `Error: ${data.message}`,
                timestamp: Date.now(),
              },
            ]);
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);

        // Auto-reconnect on unexpected close
        if (!intentionalCloseRef.current && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current++;
          console.log(`[WS] Connection lost, reconnecting (${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [configKey, fid]);

  // Debounced persistence of messages
  useEffect(() => {
    if (!options?.onMessagesUpdate || messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      options.onMessagesUpdate!(messages);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, options?.onMessagesUpdate]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      wsRef.current.send(
        JSON.stringify({
          action: "send",
          message: text.trim(),
        })
      );
    },
    [isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
