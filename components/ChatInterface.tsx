"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useChat } from "@/hooks/useChat";
import type { MoltbookResponseData } from "@/hooks/useChat";
import { useConfig } from "@/hooks/useConfig";
import { useAgentStore } from "@/hooks/useAgentStore";
import { useApp } from "./Providers";
import { BackButton } from "./BackButton";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { MoltbookPanel } from "./MoltbookPanel";
import type { MoltbookPanelHandle } from "./MoltbookPanel";

export function ChatInterface() {
  const { auth, activeAgentId, setActiveAgentId, setStep, setConfig } = useApp();
  const { config } = useConfig();
  const { activeAgent, addAgent, getMessages, saveMessages, updateLastUsed, renameAgent, updateMoltbook } = useAgentStore();

  // Track if this session is saved
  const [isSaved, setIsSaved] = useState(!!activeAgentId);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [agentName, setAgentName] = useState("");
  const moltbookPanelRef = useRef<MoltbookPanelHandle>(null);

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

  const onMoltbookResponse = useCallback(
    (response: MoltbookResponseData) => {
      moltbookPanelRef.current?.handleResponse(response);
    },
    []
  );

  const { messages, isConnected, isStreaming, sendMessage, sendMoltbookAction } = useChat(config, auth.token, auth.fid, {
    initialMessages,
    onMessagesUpdate,
    onMoltbookResponse,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const modelLabel = config?.model?.split("/").pop() || config?.model || "agent";
  const agentDisplayName = activeAgent?.name || "New Agent";
  const isManaged = config?.keyMode === "managed";
  const isUncensored = config?.uncensored === true;

  // Toggle uncensored crypto mode — updates config → triggers WebSocket reconnect
  function handleToggleUncensored() {
    if (!config) return;
    setConfig({ ...config, uncensored: !config.uncensored });
  }

  // Save Agent handler
  function handleSaveAgent() {
    setAgentName("");
    setShowNameModal(true);
  }

  function handleConfirmSave() {
    if (!config) return;
    const name = agentName.trim() || `Agent #${Date.now()}`;

    if (activeAgentId) {
      // Already saved — just rename
      renameAgent(activeAgentId, name);
    } else {
      // New agent — create and save messages
      const agent = addAgent(config);
      setActiveAgentId(agent.id);
      renameAgent(agent.id, name);
      saveMessages(agent.id, messages);
    }

    setIsSaved(true);
    setShowNameModal(false);
  }

  // Back handler
  function handleBack() {
    if (isSaved && activeAgentId) {
      // Saved agent — persist messages and go back
      saveMessages(activeAgentId, messages);
      updateLastUsed(activeAgentId);
      setStep("agents");
    } else if (messages.length > 0) {
      // Unsaved with messages — show warning
      setShowLeaveWarning(true);
    } else {
      // Unsaved with no messages — just leave
      setStep("onboarding");
    }
  }

  function handleLeaveWithoutSaving() {
    setShowLeaveWarning(false);
    setStep("onboarding");
  }

  function handleCancelLeave() {
    setShowLeaveWarning(false);
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <BackButton onClick={handleBack} label={isSaved ? "Agents" : "Home"} />

      {/* Save Agent button — top right */}
      {!isSaved && (
        <button
          onClick={handleSaveAgent}
          className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-code text-[10px] text-[var(--rose)] hover:bg-[rgba(224,137,137,0.1)] transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Agent
        </button>
      )}

      {/* Saved indicator */}
      {isSaved && (
        <div className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-code text-[10px] text-[var(--success)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved
        </div>
      )}

      {/* Chat header bar */}
      <div className="flex items-center justify-center gap-2.5 px-5 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="h-5 w-5 rounded-md bg-[var(--accent)] flex items-center justify-center">
          <span className="text-[9px] font-bold text-black" style={{ fontFamily: "var(--font-display)" }}>B</span>
        </div>
        <h1 className="text-code text-xs text-[var(--text-secondary)]">{agentDisplayName} — {modelLabel}</h1>
        {isManaged && (
          <span className="text-code text-[8px] px-1.5 py-0.5 rounded bg-[rgba(224,137,137,0.15)] text-[var(--rose)]">
            managed
          </span>
        )}

        {config?.provider === "venice" && (
          <span className="text-code text-[8px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-green-400 flex items-center gap-1">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            {config.model?.startsWith("tee-") ? "TEE encrypted" : "private"}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-code text-[9px] text-[var(--text-ghost)]">live</span>
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse-glow" />
        </div>
      </div>

      {/* Uncensored Crypto Mode toggle — full-width bar below header */}
      {isManaged && (
        <div className="flex items-center justify-center px-5 py-2 border-b border-[var(--border)]">
          <button
            onClick={handleToggleUncensored}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-code text-[11px] font-medium transition-all w-full max-w-sm justify-center ${
              isUncensored
                ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-400/40 shadow-[0_0_12px_rgba(255,165,0,0.15)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--text-ghost)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {/* Toggle track */}
            <div className={`relative w-8 h-[18px] rounded-full transition-all ${
              isUncensored ? "bg-orange-500" : "bg-[var(--bg-primary)] border border-[var(--border)]"
            }`}>
              <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
                isUncensored ? "right-[2px] bg-white" : "left-[2px] bg-[var(--text-ghost)]"
              }`} />
            </div>
            <span>{isUncensored ? "\uD83D\uDD13 Uncensored Crypto Mode" : "\uD83D\uDD12 Standard Mode"}</span>
          </button>
        </div>
      )}

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

      {/* Moltbook social panel — only for saved agents */}
      {isSaved && activeAgentId && (
        <MoltbookPanel
          ref={moltbookPanelRef}
          agentId={activeAgentId}
          agentName={activeAgent?.name || "Agent"}
          moltbook={activeAgent?.moltbook}
          onUpdateMoltbook={(config) => {
            if (activeAgentId) updateMoltbook(activeAgentId, config);
          }}
          sendMoltbookAction={sendMoltbookAction}
          lastAssistantMessage={
            [...messages].reverse().find((m) => m.role === "assistant" && !m.streaming)?.content
          }
        />
      )}

      <ChatInput onSend={sendMessage} disabled={!isConnected || isStreaming} />

      {/* Name your agent modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs glass rounded-2xl p-6 space-y-5 animate-fade-up">
            <div className="text-center space-y-1.5">
              <h2 className="text-heading text-base">Name your agent</h2>
              <p className="text-code text-[10px] text-[var(--text-ghost)]">
                give your clawdbot a name to find it later
              </p>
            </div>

            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Code Helper, DeFi Advisor..."
              autoFocus
              className="w-full py-3 px-4 rounded-xl glass text-code text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(224,137,137,0.3)] transition-all bg-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmSave();
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-2.5 btn-cute text-code text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 btn-cute-primary text-heading text-xs"
              >
                <span className="relative z-10">Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave without saving warning */}
      {showLeaveWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs glass rounded-2xl p-6 space-y-5 animate-fade-up">
            <div className="text-center space-y-2">
              <h2 className="text-heading text-base">Leave without saving?</h2>
              <p className="text-code text-[11px] text-[var(--text-muted)] leading-relaxed">
                Are you sure you want to leave without saving? Your session will end.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLeaveWithoutSaving}
                className="flex-1 py-2.5 btn-cute text-code text-xs text-[var(--rose)]"
              >
                Don&apos;t save
              </button>
              <button
                onClick={handleCancelLeave}
                className="flex-1 py-2.5 btn-cute-primary text-heading text-xs"
              >
                <span className="relative z-10">Stay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
