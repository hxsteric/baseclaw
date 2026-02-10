"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@/hooks/useChat";
import { useConfig } from "@/hooks/useConfig";
import { useAgentStore } from "@/hooks/useAgentStore";
import { useApp } from "./Providers";
import { BackButton } from "./BackButton";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function ChatInterface() {
  const { auth, activeAgentId, setStep } = useApp();
  const { config } = useConfig();
  const { activeAgent, getMessages, saveMessages, updateLastUsed } = useAgentStore();

  const initialMessages = useMemo(
    () => (activeAgentId ? getMessages(activeAgentId) : []),
    [activeAgentId, getMessages]
  );

  const onMessagesUpdate = useCallback(
    (msgs: import("@/lib/types").ChatMessage[]) => {
      if (activeAgentId) saveMessages(activeAgentId, msgs);
    },
    [activeAgentId, saveMessages]
  );

  const { messages, isConnected, isStreaming, sendMessage } = useChat(config, auth.token, {
    initialMessages,
    onMessagesUpdate,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const modelLabel = config?.model?.split("/").pop() || config?.model || "agent";
  const agentName = activeAgent?.name || "Agent";

  function handleBack() {
    if (activeAgentId) {
      saveMessages(activeAgentId, messages);
      updateLastUsed(activeAgentId);
    }
    setStep("agents");
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <BackButton onClick={handleBack} label="Agents" />

      {/* Chat header bar */}
      <div className="flex items-center justify-center gap-2.5 px-5 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="h-5 w-5 rounded-md bg-[var(--accent)] flex items-center justify-center">
          <span className="text-[9px] font-bold text-black" style={{ fontFamily: "var(--font-display)" }}>B</span>
        </div>
        <h1 className="text-code text-xs text-[var(--text-secondary)]">{agentName} — {modelLabel}</h1>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-code text-[9px] text-[var(--text-ghost)]">live</span>
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse-glow" />
        </div>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="px-5 py-2 bg-[var(--bg-tertiary)]/50 backdrop-blur flex items-center justify-center gap-2">
          <div className="h-3 w-3 rounded-full border border-[var(--text-ghost)] border-t-[var(--rose)] animate-spin" />
          <p className="text-code text-[10px] text-[var(--text-muted)]">
            establishing connection...
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl glass flex items-center justify-center">
                <span className="text-display text-lg text-[var(--rose)]">B</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--success)] border-2 border-[var(--bg-primary)]" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-heading text-sm">Agent ready</p>
              <p className="text-code text-[10px] text-[var(--text-ghost)] max-w-[200px]">
                send a message to begin your session with {modelLabel}
              </p>
            </div>
            {/* Starter prompts */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {[
                "Explain how you can help me",
                "Write a smart contract",
                "Analyze this code for bugs",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => isConnected && sendMessage(prompt)}
                  disabled={!isConnected}
                  className="text-left text-body text-xs px-4 py-2.5 btn-cute"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      <ChatInput onSend={sendMessage} disabled={!isConnected || isStreaming} />
    </div>
  );
}
