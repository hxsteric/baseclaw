"use client";

import { useState } from "react";
import { useConfig } from "@/hooks/useConfig";
import { useApp } from "./Providers";
import { SUPPORTED_MODELS, type UserConfig } from "@/lib/types";
import { BackButton } from "./BackButton";

export function ApiKeyForm() {
  const { saveConfig } = useConfig();
  const { setStep } = useApp();
  const [provider, setProvider] = useState<UserConfig["provider"]>("anthropic");
  const [model, setModel] = useState(SUPPORTED_MODELS.anthropic[0].id);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const models = SUPPORTED_MODELS[provider] || [];

  function handleProviderChange(p: UserConfig["provider"]) {
    setProvider(p);
    const firstModel = SUPPORTED_MODELS[p]?.[0];
    if (firstModel) setModel(firstModel.id);
    setApiKey("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    saveConfig({ apiKey: apiKey.trim(), model, provider });
  }

  const providers = [
    { id: "anthropic" as const, label: "Anthropic" },
    { id: "openai" as const, label: "OpenAI" },
    { id: "kimi" as const, label: "Kimi" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <BackButton onClick={() => setStep("onboarding")} label="Home" />

      {/* Page title */}
      <div className="pt-16 sm:pt-20 px-5 sm:px-8 pb-2">
        <div className="max-w-sm mx-auto">
          <p className="text-label tracking-[0.2em] mb-1">Setup</p>
          <h1 className="text-display text-xl sm:text-2xl">Configure your agent</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 sm:px-8 py-6 sm:py-8 overflow-y-auto">
        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-7 sm:space-y-8">

          {/* Provider */}
          <div className="animate-fade-up">
            <label className="text-label block mb-3">Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`py-3 px-3 text-code text-xs ${
                    provider === p.id ? "btn-cute-active" : "btn-cute"
                  }`}
                >
                  <span className="relative z-10">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="animate-fade-up-delay-1">
            <label className="text-label block mb-3">Model</label>
            <div className="space-y-2">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={`w-full py-3 px-4 text-left ${
                    model === m.id ? "btn-cute-active" : "btn-cute"
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-between">
                    <span className="text-heading text-[13px] sm:text-sm">{m.label}</span>
                    <span className="text-code text-[10px] text-[var(--text-muted)]">{m.id}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="animate-fade-up-delay-2">
            <label className="text-label block mb-3">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError("");
                }}
                placeholder="sk-..."
                className="w-full py-3 px-4 pr-12 rounded-xl glass text-code text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(224,137,137,0.3)] transition-all bg-transparent"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {showKey ? (
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {error && <p className="mt-2 text-code text-[10px] text-[var(--rose)]">{error}</p>}
            <p className="mt-2.5 text-code text-[10px] text-[var(--text-ghost)]">
              memory-only — never persisted, never logged
            </p>
          </div>

          {/* Submit */}
          <div className="animate-fade-up-delay-3 pt-2">
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="btn-cute-primary w-full py-3.5 sm:py-4 text-heading text-[15px] sm:text-base tracking-tight"
            >
              <span className="relative z-10">Launch Agent</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
