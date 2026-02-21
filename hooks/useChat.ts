"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import type { ChatMessage, UserConfig } from "@/lib/types";
import { WS_PROXY_URL } from "@/lib/constants";

interface UseChatOptions {
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

export function useChat(config: UserConfig | null, token: string | null, fid?: number | null, options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(options?.initialMessages || []);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentRunRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to proxy
  useEffect(() => {
    if (!config) return;

    const ws = new WebSocket(WS_PROXY_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send config on connect
      const configMsg: Record<string, unknown> = {
        action: "config",
        model: config.model,
        provider: config.provider,
        keyMode: config.keyMode || "byok",
      };

      if (config.keyMode === "managed") {
        // Managed mode — send fid instead of apiKey
        configMsg.fid = fid;
      } else {
        // BYOK mode — send user's API key
        configMsg.apiKey = config.apiKey;
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
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [config, fid]);

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
      if (!wsRef.current || !text.trim() || isStreaming) return;

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
