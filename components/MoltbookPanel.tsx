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

  const isRegistered = moltbook?.registered === true;

  const handleRegister = useCallback(() => {
    if (!agentId) return;
    setIsRegistering(true);
    setStatusMessage("Registering on Moltbook...");

    sendMoltbookAction({
      subaction: "register",
      name: agentName.replace(/\s+/g, "_").toLowerCase(),
      description: `BaseClaw crypto research agent — ${agentName}. Specializes in token analysis, X/Twitter sentiment, DeFi data, and on-chain research on Base.`,
    });
  }, [agentId, agentName, sendMoltbookAction]);

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
          const regData = response.data as { api_key: string; claim_url: string; agent_name?: string };
          onUpdateMoltbook({
            registered: true,
            apiKey: regData.api_key,
            claimUrl: regData.claim_url,
            claimed: false,
            agentName: regData.agent_name || agentName,
          });
          setStatusMessage("Registered! Verify ownership below.");
        } else {
          setStatusMessage(`Registration failed: ${response.error || "Unknown error"}`);
        }
      } else if (response.subaction === "post") {
        setIsPosting(false);
        setStatusMessage(response.success ? "Posted to Moltbook!" : `Post failed: ${response.error}`);
        setTimeout(() => setStatusMessage(""), 3000);
      } else if (response.subaction === "feed" && response.success) {
        setFeedData((response.data as { posts?: unknown[] })?.posts || []);
      }
    },
    [agentName, onUpdateMoltbook]
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
        className="w-full flex items-center justify-between px-5 py-2.5 text-code text-[10px] text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <span>Moltbook</span>
          {isRegistered && (
            <span className="px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.15)] text-[var(--success)] text-[8px]">
              active
            </span>
          )}
        </div>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-5 pb-4 space-y-3 animate-fade-up">
          {/* Status message */}
          {statusMessage && (
            <div className="text-code text-[10px] text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
              {statusMessage}
            </div>
          )}

          {/* Not registered — show register button */}
          {!isRegistered && (
            <div className="space-y-2">
              <p className="text-code text-[10px] text-[var(--text-ghost)]">
                Register this agent on Moltbook — the social network for AI agents.
              </p>
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full py-2 btn-cute-primary text-code text-[10px]"
              >
                <span className="relative z-10">
                  {isRegistering ? "Registering..." : "Register on Moltbook"}
                </span>
              </button>
            </div>
          )}

          {/* Registered — show claim URL + actions */}
          {isRegistered && (
            <div className="space-y-3">
              {/* Claim URL (if not yet claimed) */}
              {moltbook?.claimUrl && !moltbook.claimed && (
                <div className="space-y-1.5">
                  <p className="text-code text-[10px] text-[var(--rose)]">
                    Verify ownership to claim this agent:
                  </p>
                  <a
                    href={moltbook.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-code text-[9px] text-[var(--accent)] underline break-all"
                  >
                    {moltbook.claimUrl}
                  </a>
                </div>
              )}

              {/* Agent name on Moltbook */}
              {moltbook?.agentName && (
                <div className="flex items-center gap-2">
                  <span className="text-code text-[9px] text-[var(--text-ghost)]">Moltbook:</span>
                  <span className="text-code text-[10px] text-[var(--text-secondary)]">
                    @{moltbook.agentName}
                  </span>
                </div>
              )}

              {/* Share to Moltbook button */}
              {lastAssistantMessage && !showPostForm && (
                <button
                  onClick={() => setShowPostForm(true)}
                  className="w-full py-2 btn-cute text-code text-[10px] flex items-center justify-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Share last response to Moltbook
                </button>
              )}

              {/* Post form */}
              {showPostForm && (
                <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Post title (optional)"
                    className="w-full py-2 px-3 rounded-lg glass text-code text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] bg-transparent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={postSubmolt}
                    onChange={(e) => setPostSubmolt(e.target.value)}
                    placeholder="Submolt (community)"
                    className="w-full py-2 px-3 rounded-lg glass text-code text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] bg-transparent focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPostForm(false)}
                      className="flex-1 py-1.5 btn-cute text-code text-[9px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePost}
                      disabled={isPosting}
                      className="flex-1 py-1.5 btn-cute-primary text-code text-[9px]"
                    >
                      <span className="relative z-10">{isPosting ? "Posting..." : "Post"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Load feed button */}
              <button
                onClick={handleLoadFeed}
                className="w-full py-1.5 btn-cute text-code text-[9px]"
              >
                Load Feed
              </button>

              {/* Feed items */}
              {feedData.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {feedData.slice(0, 10).map((post: unknown, i: number) => {
                    const p = post as { title?: string; author_name?: string; score?: number; id?: string };
                    return (
                      <div key={p.id || i} className="p-2 rounded-lg bg-[var(--bg-primary)] text-code text-[9px]">
                        <div className="text-[var(--text-secondary)] truncate">{p.title}</div>
                        <div className="flex gap-2 text-[var(--text-ghost)] mt-0.5">
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
