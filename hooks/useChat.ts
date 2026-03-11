"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import type { ChatMessage, UserConfig, ImageAttachment } from "@/lib/types";
import { WS_PROXY_URL } from "@/lib/constants";

export interface MoltbookAction {
  subaction: string;
  moltbookApiKey?: string;
  [key: string]: unknown;
}

export interface MoltbookResponseData {
  subaction: string;
  success: boolean;
  data?: unknown;
  error?: string;
  hint?: string;
}

interface UseChatOptions {
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  onMoltbookResponse?: (response: MoltbookResponseData) => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1500;

/** Build the config message to send over WebSocket */
function buildConfigMsg(cfg: UserConfig, fid?: number | null): Record<string, unknown> {
  const msg: Record<string, unknown> = {
    action: "config",
    model: cfg.model,
    provider: cfg.provider,
    keyMode: cfg.keyMode || "byok",
  };

  if (cfg.keyMode === "managed") {
    msg.fid = fid;
  } else {
    msg.apiKey = cfg.apiKey;
  }

  if (cfg.uncensored) {
    msg.uncensored = true;
  }

  return msg;
}

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

  // Track uncensored separately so toggling it doesn't reconnect
  const uncensoredRef = useRef(config?.uncensored ?? false);

  // Connection key: excludes `uncensored` so toggling it does NOT tear down the WebSocket.
  // Only reconnects when provider/model/apiKey/keyMode actually change.
  const connectionKey = useMemo(() => {
    if (!config) return null;
    const { uncensored, ...connectionFields } = config;
    return JSON.stringify(connectionFields);
  }, [config]);

  // Connect to proxy — only runs when connection-critical fields change
  useEffect(() => {
    if (!connectionKey || !config) return;

    // Snapshot the full config (including current uncensored) for initial connect
    const cfg: UserConfig = { ...config };
    uncensoredRef.current = cfg.uncensored ?? false;
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
        reconnectCountRef.current = 0;
        ws.send(JSON.stringify(buildConfigMsg(cfg, fid)));
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

          case "moltbook":
            options?.onMoltbookResponse?.(data as MoltbookResponseData);
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
  }, [connectionKey, fid]);

  // Live-update uncensored mode over existing WebSocket (no reconnect)
  useEffect(() => {
    const currentUncensored = config?.uncensored ?? false;

    // Skip if value hasn't actually changed (including initial mount)
    if (currentUncensored === uncensoredRef.current) return;
    uncensoredRef.current = currentUncensored;

    // Send config update over existing connection
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !config) return;

    console.log(`[WS] Updating uncensored mode: ${currentUncensored}`);
    ws.send(JSON.stringify(buildConfigMsg(config, fid)));
  }, [config?.uncensored, config, fid]);

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
    (text: string, images?: ImageAttachment[]) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        ...(images && images.length > 0 ? { images } : {}),
      };

      setMessages((prev) => [...prev, userMsg]);

      wsRef.current.send(
        JSON.stringify({
          action: "send",
          message: text.trim(),
          ...(images && images.length > 0 ? { images } : {}),
        })
      );
    },
    [isStreaming]
  );

  const sendMoltbookAction = useCallback(
    (action: MoltbookAction) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ action: "moltbook", ...action }));
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isStreaming,
    sendMessage,
    sendMoltbookAction,
    clearMessages,
  };
}
