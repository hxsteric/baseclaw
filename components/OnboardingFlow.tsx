"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "./Providers";
import { TextVideoMask } from "./TextVideoMask";
import { FloatingCreatures } from "./FloatingCreatures";
import { ScrollProgress } from "./ScrollProgress";
import { BaseclawLogo } from "./BaseclawLogo";

/* Interactive pill expand content */
const PILL_CONTENT: Record<string, React.ReactNode> = {
  "Multi-Model": (
    <div className="space-y-2">
      <p className="text-body text-sm text-[var(--text-secondary)]">Supported models:</p>
      <div className="flex flex-wrap gap-1.5">
        {["Claude Sonnet 4.5", "Claude Haiku 4.5", "GPT-4o", "GPT-4o Mini", "Kimi K2"].map((m) => (
          <span key={m} className="text-code text-[10px] px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {m}
          </span>
        ))}
      </div>
      <p className="text-code text-[10px] text-[var(--text-muted)]">More models coming soon.</p>
    </div>
  ),
  "Your Keys": (
    <div className="space-y-2">
      <p className="text-body text-sm text-[var(--text-secondary)]">How to get an API key:</p>
      <ol className="text-body text-sm text-[var(--text-muted)] space-y-1 pl-4 list-decimal">
        <li>Go to your provider&apos;s dashboard</li>
        <li>Navigate to API Keys section</li>
        <li>Create a new key &amp; copy it</li>
        <li>Paste it into Baseclaw — done!</li>
      </ol>
      <p className="text-code text-[10px] text-[var(--text-ghost)]">Your key is never stored. It lives in memory only.</p>
    </div>
  ),
  "Instant": (
    <div>
      <p className="text-body text-sm text-[var(--text-secondary)]">
        Instantly launch your agent and load its skills. No setup delays, no waiting rooms. Your assistant is ready the moment you are.
      </p>
    </div>
  ),
};

export function OnboardingFlow() {
  const { skip } = useAuth();
  const { setStep } = useApp();
  const [expandedPill, setExpandedPill] = useState<string | null>(null);

  function togglePill(label: string) {
    setExpandedPill(expandedPill === label ? null : label);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)]">
      {/* Scroll progress */}
      <ScrollProgress />

      {/* Ambient pastel glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] rounded-full bg-[var(--rose)] opacity-[0.05] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-[var(--indigo)] opacity-[0.05] blur-[180px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] rounded-full bg-[var(--rose)] opacity-[0.03] blur-[120px] pointer-events-none" />

      {/* Bouncing crabs */}
      <FloatingCreatures />

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-8 py-16 sm:py-20">
        <div className="w-full max-w-md sm:max-w-lg flex flex-col items-center">

          {/* Logo */}
          <div className="animate-fade-up mb-4 sm:mb-6">
            <BaseclawLogo size={72} />
          </div>

          {/* BASECLAW — massive hero text */}
          <div className="w-full animate-fade-up mb-4 sm:mb-6">
            <TextVideoMask
              text="BASECLAW"
              fontSize={68}
              fontWeight={900}
              letterSpacing={-2}
              className="sm-hero-text"
            />
          </div>

          {/* Subtitle */}
          <div className="text-center animate-fade-up-delay-1 mb-8 sm:mb-10">
            <p className="text-label mb-2 sm:mb-3 tracking-[0.2em]">Launch your personal assistant</p>
            <p className="text-body text-[var(--text-secondary)] text-[15px] sm:text-base max-w-[320px] sm:max-w-[360px] mx-auto leading-relaxed">
              It takes one click to deploy everything. Your assistant will be your life support.
            </p>
          </div>

          {/* Interactive feature pills */}
          <div className="w-full max-w-xs sm:max-w-sm animate-fade-up-delay-2 mb-8 sm:mb-10">
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {["Multi-Model", "Your Keys", "Instant"].map((label) => (
                <button
                  key={label}
                  onClick={() => togglePill(label)}
                  className={`text-code text-[11px] sm:text-xs px-4 py-2 !rounded-full transition-all duration-300 ${
                    expandedPill === label ? "btn-cute-active" : "btn-cute"
                  }`}
                >
                  {label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`inline-block ml-1.5 transition-transform duration-300 ${expandedPill === label ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Expanded pill content */}
            <div
              className={`overflow-hidden transition-all duration-400 ease-out ${
                expandedPill ? "max-h-48 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
              }`}
            >
              <div className="glass-card rounded-2xl p-4 sm:p-5">
                {expandedPill && PILL_CONTENT[expandedPill]}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full max-w-xs space-y-3 animate-fade-up-delay-3">
            <button
              onClick={skip}
              className="btn-cute-primary w-full py-4 sm:py-4.5 text-heading text-[15px] sm:text-base tracking-tight"
            >
              <span className="relative z-10">Launch your Clawdbot</span>
            </button>
            <button
              onClick={() => setStep("agents")}
              className="btn-cute w-full py-3.5 text-heading text-[13px] sm:text-sm tracking-tight flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span>My Agents</span>
            </button>
            <a
              href="https://openclaw.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cute w-full py-3.5 text-body text-[14px] sm:text-sm tracking-tight flex items-center justify-center gap-2"
            >
              <span>Learn about OpenClaw first</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>

          {/* Scroll hint */}
          <div className="mt-12 sm:mt-16 animate-fade-up-delay-4 flex flex-col items-center gap-2">
            <p className="text-code text-[9px] text-[var(--text-ghost)]">scroll to learn more</p>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--text-ghost)] to-transparent" />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-md sm:max-w-lg mx-auto">
          <p className="text-label tracking-[0.2em] text-center mb-3 sm:mb-4">How it works</p>
          <h2 className="text-display text-2xl sm:text-3xl text-center mb-12 sm:mb-16">
            Three steps. Zero complexity.
          </h2>

          <div className="space-y-5 sm:space-y-8">
            {[
              {
                step: "01",
                title: "Choose your model",
                desc: "Pick from Anthropic Claude, OpenAI GPT-4o, Kimi, and more. We support every major provider.",
              },
              {
                step: "02",
                title: "Paste your API key",
                desc: "Your key stays in memory only. Never saved, never logged. It vanishes when you close the session.",
              },
              {
                step: "03",
                title: "Start chatting",
                desc: "Your personal assistant is ready. Stream responses in real-time. Ask anything.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-2xl p-5 sm:p-6 flex gap-4 sm:gap-5 items-start">
                <span className="text-display text-xl sm:text-2xl text-[var(--rose)] shrink-0 w-8 sm:w-10">{item.step}</span>
                <div>
                  <h3 className="text-heading text-[15px] sm:text-base mb-1 sm:mb-1.5">{item.title}</h3>
                  <p className="text-body text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-md sm:max-w-lg mx-auto">
          <p className="text-label tracking-[0.2em] text-center mb-3 sm:mb-4">Why Baseclaw</p>
          <h2 className="text-display text-2xl sm:text-3xl text-center mb-12 sm:mb-16">
            Built different.
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { icon: "🔐", title: "Privacy first", desc: "Your API keys never touch our servers" },
              { icon: "⚡", title: "Instant deploy", desc: "No setup, no sign-ups, no waiting" },
              { icon: "🤖", title: "Multi-model", desc: "Claude, GPT-4o, Kimi — switch anytime" },
              { icon: "🌊", title: "Built on Base", desc: "Native Farcaster miniapp experience" },
            ].map((feat) => (
              <div key={feat.title} className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
                <span className="text-xl sm:text-2xl">{feat.icon}</span>
                <h3 className="text-heading text-[13px] sm:text-sm">{feat.title}</h3>
                <p className="text-body text-[11px] sm:text-xs text-[var(--text-muted)] leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MY AGENTS SECTION ===== */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-md sm:max-w-lg mx-auto text-center">
          <p className="text-label tracking-[0.2em] mb-3 sm:mb-4">Manage</p>
          <h2 className="text-display text-2xl sm:text-3xl mb-5 sm:mb-6">My Agents</h2>
          <p className="text-body text-[var(--text-secondary)] text-sm sm:text-[15px] max-w-[340px] sm:max-w-[380px] mx-auto leading-relaxed mb-6 sm:mb-8">
            Deploy multiple agents, switch between conversations, and control everything from one place.
          </p>
          <button
            onClick={() => setStep("agents")}
            className="btn-cute inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-heading text-sm sm:text-[15px] tracking-tight"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Open My Agents</span>
          </button>
        </div>
      </section>

      {/* ===== WHAT IS OPENCLAW SECTION ===== */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-md sm:max-w-lg mx-auto text-center">
          <p className="text-label tracking-[0.2em] mb-3 sm:mb-4">Powered by</p>
          <h2 className="text-display text-2xl sm:text-3xl mb-5 sm:mb-6">OpenClaw</h2>
          <p className="text-body text-[var(--text-secondary)] text-sm sm:text-[15px] max-w-[340px] sm:max-w-[380px] mx-auto leading-relaxed mb-6 sm:mb-8">
            OpenClaw is an open-source AI gateway that connects you to any model through a single, unified interface. Baseclaw brings this power to your pocket.
          </p>
          <a
            href="https://openclaw.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cute inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-body text-sm"
          >
            <span>Visit openclaw.ai</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </div>
      </section>

      {/* ===== CTA FOOTER ===== */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-display text-xl sm:text-2xl mb-3 sm:mb-4">Ready to launch?</h2>
          <p className="text-body text-sm text-[var(--text-secondary)] mb-6 sm:mb-8">
            Your AI assistant is one click away.
          </p>
          <button
            onClick={skip}
            className="btn-cute-primary px-8 sm:px-10 py-3.5 sm:py-4 text-heading text-[15px] sm:text-base tracking-tight"
          >
            <span className="relative z-10">Launch your Clawdbot</span>
          </button>
          <p className="text-code text-[9px] text-[var(--text-ghost)] mt-6 sm:mt-8">
            v0.1.0 — built on Base
          </p>
        </div>
      </section>
    </div>
  );
}
