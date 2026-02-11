"use client";

import { useApp } from "./Providers";
import { useAgentStore } from "@/hooks/useAgentStore";
import { BackButton } from "./BackButton";
import { SUPPORTED_MODELS } from "@/lib/types";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getModelLabel(modelId: string): string {
  for (const provider of Object.values(SUPPORTED_MODELS)) {
    const found = provider.find((m) => m.id === modelId);
    if (found) return found.label;
  }
  return modelId;
}

export function MyAgents() {
  const { setStep, setConfig, setActiveAgentId } = useApp();
  const { agents, toggleAgent, updateLastUsed, getMessages, removeAgent } = useAgentStore();

  function handleOpenAgent(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent || !agent.enabled) return;
    setConfig(agent.config);
    setActiveAgentId(agentId);
    updateLastUsed(agentId);
    setStep("chat");
  }

  function handleDeployNew() {
    setStep("setup");
  }

  function handleBack() {
    setStep("onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <BackButton onClick={handleBack} label="Home" />

      {/* Page title + Launch New Agent button */}
      <div className="pt-16 sm:pt-20 px-5 sm:px-8 pb-2">
        <div className="max-w-sm mx-auto flex items-end justify-between">
          <div>
            <p className="text-label tracking-[0.2em] mb-1">Manage</p>
            <h1 className="text-display text-xl sm:text-2xl">My Agents</h1>
          </div>
          {agents.length > 0 && (
            <button
              onClick={handleDeployNew}
              className="btn-cute px-3.5 py-2 text-code text-[11px] sm:text-xs flex items-center gap-1.5 shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>New Agent</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 sm:px-8 py-6 sm:py-8 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto space-y-4">

          {/* Empty state */}
          {agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 gap-6 animate-fade-up">
              <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center">
                <span className="text-display text-2xl text-[var(--rose)]">B</span>
              </div>
              <div className="text-center space-y-3">
                <p className="text-heading text-sm">You haven&apos;t launched an agent yet</p>
                <p className="text-body text-xs text-[var(--text-muted)] max-w-[260px] leading-relaxed">
                  But don&apos;t worry — it&apos;s very easy. Pick a model, paste your API key, and your agent will be ready in seconds.
                </p>
              </div>
              <button
                onClick={handleDeployNew}
                className="btn-cute-primary px-8 py-3.5 text-heading text-[15px] tracking-tight"
              >
                <span className="relative z-10">Launch your first agent</span>
              </button>
            </div>
          )}

          {/* Agent cards */}
          {agents.length > 0 && (
            <>
              {agents.map((agent, idx) => {
                const msgs = getMessages(agent.id);
                const modelLabel = getModelLabel(agent.config.model);
                const providerLabel = agent.config.provider.charAt(0).toUpperCase() + agent.config.provider.slice(1);

                return (
                  <div
                    key={agent.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <div
                      onClick={() => handleOpenAgent(agent.id)}
                      className={`glass-card rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 ${
                        agent.enabled
                          ? "hover:border-[rgba(224,137,137,0.25)] hover:shadow-[0_4px_20px_rgba(224,137,137,0.08)]"
                          : "opacity-50 cursor-default"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Agent info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                              <span className="text-code text-[9px] font-bold text-[var(--rose)]">
                                {agent.name.replace("Agent #", "")}
                              </span>
                            </div>
                            <h3 className="text-heading text-[13px] sm:text-sm truncate">
                              {agent.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-code text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                              {providerLabel}
                            </span>
                            <span className="text-code text-[10px] text-[var(--text-muted)] truncate">
                              {modelLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-code text-[9px] text-[var(--text-ghost)]">
                              {timeAgo(agent.lastUsedAt)}
                            </span>
                            {msgs.length > 0 && (
                              <span className="text-code text-[9px] text-[var(--text-ghost)]">
                                {msgs.length} message{msgs.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {agent.enabled && (
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse-glow" />
                                <span className="text-code text-[9px] text-[var(--text-ghost)]">active</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Toggle switch */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAgent(agent.id);
                          }}
                          className={`toggle-switch shrink-0 mt-1 ${agent.enabled ? "active" : ""}`}
                          aria-label={agent.enabled ? "Disable agent" : "Enable agent"}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
