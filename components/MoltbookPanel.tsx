"use client";

import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import type { MoltbookAction, MoltbookResponseData } from "@/hooks/useChat";
import type { MoltbookConfig } from "@/lib/types";

interface MoltbookPanelProps {
  agentId: string | null;
  agentName: string;
  moltbook?: MoltbookConfig;
  onUpdateMoltbook: (config: MoltbookConfig) => void;
  sendMoltbookAction: (action: MoltbookAction) => void;
  lastAssistantMessage?: string;
}

export interface MoltbookPanelHandle {
  handleResponse: (response: MoltbookResponseData) => void;
}

export const MoltbookPanel = forwardRef<MoltbookPanelHandle, MoltbookPanelProps>(function MoltbookPanel({
  agentId,
  agentName,
  moltbook,
  onUpdateMoltbook,
  sendMoltbookAction,
  lastAssistantMessage,
}, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSubmolt, setPostSubmolt] = useState("general");
  const [postTitle, setPostTitle] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [feedData, setFeedData] = useState<unknown[]>([]);

  // New states for editable name + conflict handling
  const [moltbookName, setMoltbookName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  const isRegistered = moltbook?.registered === true;

  // Phase 1: Show the name input form
  const handleStartRegister = useCallback(() => {
    setShowNameInput(true);
    setMoltbookName(agentName.replace(/\s+/g, "_").toLowerCase());
    setNameError("");
    setStatusMessage("");
  }, [agentName]);

  // Phase 2: Confirm registration with the chosen name
  const handleConfirmRegister = useCallback(() => {
    if (!agentId) return;

    const trimmed = moltbookName.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setNameError("Only lowercase letters, numbers, and underscores");
      return;
    }
    if (trimmed.length < 3) {
      setNameError("Name must be at least 3 characters");
      return;
    }

    setIsRegistering(true);
    setNameError("");
    setStatusMessage("Registering on Moltbook...");

    sendMoltbookAction({
      subaction: "register",
      name: trimmed,
      description: `BaseClaw crypto research agent — ${agentName}. Specializes in token analysis, X/Twitter sentiment, DeFi data, and on-chain research on Base.`,
    });
  }, [agentId, moltbookName, agentName, sendMoltbookAction]);

  const handlePost = useCallback(() => {
    if (!moltbook?.apiKey || !lastAssistantMessage) return;
    setIsPosting(true);
    setStatusMessage("Posting to Moltbook...");

    sendMoltbookAction({
      subaction: "post",
      moltbookApiKey: moltbook.apiKey,
      submolt: postSubmolt,
      title: postTitle || `${agentName} Research — ${new Date().toLocaleDateString()}`,
      content: lastAssistantMessage.slice(0, 40000),
    });

    setShowPostForm(false);
    setPostTitle("");
  }, [moltbook?.apiKey, lastAssistantMessage, postSubmolt, postTitle, agentName, sendMoltbookAction]);

  const handleLoadFeed = useCallback(() => {
    if (!moltbook?.apiKey) return;
    sendMoltbookAction({
      subaction: "feed",
      moltbookApiKey: moltbook.apiKey,
      sort: "hot",
    });
  }, [moltbook?.apiKey, sendMoltbookAction]);

  // Called from parent when moltbook response arrives
  const handleMoltbookResponse = useCallback(
    (response: MoltbookResponseData) => {
      if (response.subaction === "register") {
        setIsRegistering(false);
        if (response.success && response.data) {
          const regData = response.data as { api_key: string; claim_url: string; agent_name?: string; verification_code?: string };
          onUpdateMoltbook({
            registered: true,
            apiKey: regData.api_key,
            claimUrl: regData.claim_url,
            claimed: false,
            agentName: regData.agent_name || moltbookName,
          });
          setStatusMessage("Registered successfully!");
          setShowNameInput(false);
          setNameError("");
        } else {
          // Check for conflict specifically (name already taken)
          const errorMsg = response.error || "Unknown error";
          const isConflict =
            errorMsg.toLowerCase().includes("conflict") ||
            errorMsg.includes("409") ||
            errorMsg.toLowerCase().includes("already") ||
            errorMsg.toLowerCase().includes("taken");

          if (isConflict) {
            setNameError(response.hint || "This name is already taken. Try a different one.");
            setStatusMessage("");
          } else {
            setStatusMessage(`Registration failed: ${errorMsg}`);
            setNameError("");
          }
        }
      } else if (response.subaction === "post") {
        setIsPosting(false);
        setStatusMessage(response.success ? "Posted to Moltbook!" : `Post failed: ${response.error}`);
        setTimeout(() => setStatusMessage(""), 4000);
      } else if (response.subaction === "feed" && response.success) {
        setFeedData((response.data as { posts?: unknown[] })?.posts || []);
      }
    },
    [moltbookName, onUpdateMoltbook]
  );

  // Expose handler to parent via ref
  useImperativeHandle(ref, () => ({
    handleResponse: handleMoltbookResponse,
  }), [handleMoltbookResponse]);

  if (!agentId) return null;

  return (
    <div className="border-t border-[var(--border)]">
      {/* Toggle bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-code text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/moltbook-logo.png"
            alt="Moltbook"
            className="w-5 h-5 rounded-sm object-contain"
          />
          <span>Moltbook</span>
          {isRegistered && (
            <span className="px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.15)] text-[var(--success)] text-[9px]">
              active
            </span>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-up">
          {/* Status message with color coding */}
          {statusMessage && (
            <div className={`text-code text-xs px-4 py-3 rounded-xl ${
              statusMessage.toLowerCase().includes("failed") || statusMessage.toLowerCase().includes("error")
                ? "bg-[rgba(224,137,137,0.1)] text-[var(--rose)] border border-[rgba(224,137,137,0.2)]"
                : statusMessage.includes("successfully") || statusMessage.includes("Posted")
                  ? "bg-[rgba(74,222,128,0.08)] text-[var(--success)] border border-[rgba(74,222,128,0.15)]"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
            }`}>
              {statusMessage}
            </div>
          )}

          {/* ─── Not registered: Phase 1 — Big CTA button ─── */}
          {!isRegistered && !showNameInput && (
            <div className="space-y-3">
              <p className="text-code text-xs text-[var(--text-muted)]">
                Register this agent on Moltbook — the social network for AI agents.
              </p>
              <button
                onClick={handleStartRegister}
                className="glass-button-rose w-full py-3.5 rounded-2xl text-code text-sm flex items-center justify-center gap-3 transition-all"
              >
                <img
                  src="/moltbook-logo.png"
                  alt="Moltbook"
                  className="w-6 h-6 object-contain"
                />
                <span className="relative z-10 text-[var(--rose)]">Register on Moltbook</span>
              </button>
            </div>
          )}

          {/* ─── Not registered: Phase 2 — Name input form ─── */}
          {!isRegistered && showNameInput && (
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-2.5 mb-1">
                <img
                  src="/moltbook-logo.png"
                  alt="Moltbook"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-code text-xs text-[var(--text-secondary)]">
                  Choose your Moltbook name
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-code text-sm text-[var(--text-muted)]">@</span>
                  <input
                    type="text"
                    value={moltbookName}
                    onChange={(e) => {
                      setMoltbookName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                      setNameError("");
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRegister(); }}
                    placeholder="your_agent_name"
                    maxLength={32}
                    className="flex-1 py-2.5 px-3 rounded-xl glass text-code text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] bg-transparent focus:outline-none transition-all"
                    autoFocus
                  />
                </div>
                {nameError && (
                  <p className="text-code text-[11px] text-[var(--rose)] px-1">
                    {nameError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowNameInput(false); setNameError(""); setStatusMessage(""); }}
                  className="flex-1 py-2.5 btn-cute text-code text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegister}
                  disabled={isRegistering || !moltbookName.trim()}
                  className="flex-1 py-2.5 btn-cute-primary text-code text-xs flex items-center justify-center gap-2"
                >
                  <span className="relative z-10">
                    {isRegistering ? "Registering..." : "Register"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ─── Registered: Actions ─── */}
          {isRegistered && (
            <div className="space-y-4">
              {/* Claim URL (if not yet claimed) */}
              {moltbook?.claimUrl && !moltbook.claimed && (
                <div className="space-y-2 p-3 rounded-xl bg-[rgba(224,137,137,0.06)] border border-[rgba(224,137,137,0.15)]">
                  <p className="text-code text-xs text-[var(--rose)]">
                    Verify ownership to claim this agent:
                  </p>
                  <a
                    href={moltbook.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-code text-[11px] text-[var(--accent)] underline break-all hover:text-[var(--accent-hover)] transition-colors"
                  >
                    {moltbook.claimUrl}
                  </a>
                </div>
              )}

              {/* Agent name on Moltbook */}
              {moltbook?.agentName && (
                <div className="flex items-center gap-2.5">
                  <img src="/moltbook-logo.png" alt="" className="w-4 h-4 object-contain" />
                  <span className="text-code text-[11px] text-[var(--text-ghost)]">Moltbook:</span>
                  <span className="text-code text-xs text-[var(--text-secondary)]">
                    @{moltbook.agentName}
                  </span>
                </div>
              )}

              {/* Share to Moltbook button */}
              {lastAssistantMessage && !showPostForm && (
                <button
                  onClick={() => setShowPostForm(true)}
                  className="w-full py-3 btn-cute text-code text-xs flex items-center justify-center gap-2"
                >
                  <img src="/moltbook-logo.png" alt="" className="w-4 h-4 object-contain" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Share last response to Moltbook
                </button>
              )}

              {/* Post form */}
              {showPostForm && (
                <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-tertiary)]">
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Post title (optional)"
                    className="w-full py-2.5 px-3 rounded-xl glass text-code text-xs text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] bg-transparent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={postSubmolt}
                    onChange={(e) => setPostSubmolt(e.target.value)}
                    placeholder="Submolt (community)"
                    className="w-full py-2.5 px-3 rounded-xl glass text-code text-xs text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] bg-transparent focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPostForm(false)}
                      className="flex-1 py-2.5 btn-cute text-code text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePost}
                      disabled={isPosting}
                      className="flex-1 py-2.5 btn-cute-primary text-code text-xs"
                    >
                      <span className="relative z-10">{isPosting ? "Posting..." : "Post"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Load feed button */}
              <button
                onClick={handleLoadFeed}
                className="w-full py-2.5 btn-cute text-code text-xs"
              >
                Load Feed
              </button>

              {/* Feed items */}
              {feedData.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {feedData.slice(0, 10).map((post: unknown, i: number) => {
                    const p = post as { title?: string; author_name?: string; score?: number; id?: string };
                    return (
                      <div key={p.id || i} className="p-3 rounded-xl bg-[var(--bg-primary)] text-code text-[11px]">
                        <div className="text-[var(--text-secondary)] truncate">{p.title}</div>
                        <div className="flex gap-2 text-[var(--text-ghost)] mt-1">
                          <span>@{p.author_name}</span>
                          <span>{p.score} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
