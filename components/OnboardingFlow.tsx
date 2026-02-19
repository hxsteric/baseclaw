"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "./Providers";
import { ScrollProgress } from "./ScrollProgress";
import { AquariumBg } from "./AquariumBg";
import { TypewriterTitle } from "./TypewriterTitle";
import { ScrambleText } from "./ScrambleText";
import { TerminalCard } from "./bento/TerminalCard";
import { MetricsCard } from "./bento/MetricsCard";
import { StatusCard } from "./bento/StatusCard";
import { PartnerMarquee } from "./PartnerMarquee";
import { PricingSection } from "./PricingSection";
import { SwipeToStart } from "./SwipeToStart";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Blinking dot indicator ── */
function BlinkDot() {
  return <span className="inline-block h-2 w-2 bg-[var(--rose)] animate-blink" />;
}

/* ── Live uptime counter ── */
function UptimeCounter() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const base = 31536000 + Math.floor(Math.random() * 1000000);
    setSeconds(base);
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const format = (n: number) => {
    const d = Math.floor(n / 86400);
    const h = Math.floor((n % 86400) / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  return (
    <span className="font-mono text-[var(--rose)]" style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(seconds)}
    </span>
  );
}

/* ── Stat block ── */
const STATS = [
  { label: "MODELS_AVAILABLE", value: "12+" },
  { label: "PROVIDERS", value: "6" },
  { label: "AVG_LATENCY", value: "4.2ms" },
  { label: "COST", value: "$0" },
];

function StatBlock({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.5, ease }}
      className="flex flex-col gap-1 border-2 border-[var(--foreground)] px-4 py-3"
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">
        {label}
      </span>
      <span className="text-xl lg:text-2xl font-mono font-bold tracking-tight">
        <ScrambleText text={value} />
      </span>
    </motion.div>
  );
}

/* FAQ data */
const FAQ_ITEMS = [
  {
    q: "What is Baseclaw?",
    a: "Baseclaw is an AI assistant launcher on Base. Bring your own API key, choose any model, and chat instantly. No accounts, no middleman — just a direct bridge between you and the model.",
  },
  {
    q: "What is OpenClaw?",
    a: "OpenClaw is the open-source gateway that powers Baseclaw. One unified interface to connect any AI provider. Baseclaw is the product — OpenClaw is the infrastructure.",
  },
  {
    q: "What is Hybrid Mode?",
    a: "Hybrid Mode is Baseclaw's smart routing system. Instead of manually picking a model, Hybrid Mode automatically selects the most cost-efficient model that fits your query. Simple questions go to lightweight models, complex ones go to frontier models. You get the best output at the lowest cost — automatically.",
  },
  {
    q: "Why is Baseclaw the most cost-efficient AI bot?",
    a: "Three reasons:\n\n1. Zero platform fees — you only pay your API provider directly\n2. Hybrid Mode routes each query to the cheapest model that can handle it\n3. No subscriptions, no markup, no hidden costs\n\nMost AI tools charge $20/mo+ on top of API costs. Baseclaw charges $0. Combined with smart model routing, you save 60-80% compared to other AI assistants.",
  },
  {
    q: "What can Clawdbot do?",
    a: "Code generation, DeFi research, content drafting, web search, data analysis — anything you'd expect from a modern AI agent. Streaming responses, tool use, and real-time web access included.",
  },
  {
    q: "How do I get an API key?",
    a: "Sign up at your provider of choice:\n\n• Anthropic → console.anthropic.com\n• OpenAI → platform.openai.com\n• OpenRouter → openrouter.ai (all models, one key)\n• Kimi → platform.moonshot.cn\n\nCreate a key, paste it in, done.",
  },
  {
    q: "Which provider should I use?",
    a: "OpenRouter if you want flexibility — one key for Claude, GPT-4o, Gemini, DeepSeek, and more. Anthropic direct if you want the best Claude experience. Or just use Hybrid Mode and let Baseclaw pick the best model for each query automatically.",
  },
  {
    q: "Is my API key safe?",
    a: "Your key exists in memory only. Never persisted, never logged, never transmitted to our servers. Session ends, key is gone.",
  },
  {
    q: "Does it support web search?",
    a: "Yes. Brave Search is built in. When your query needs live data — prices, news, documentation — the agent searches automatically and responds with current information.",
  },
  {
    q: "What does it cost?",
    a: "Baseclaw is free. You pay only for the tokens you consume through your own API key. Most providers offer free credits to get started. With Hybrid Mode, your costs are optimized automatically.",
  },
];

/* FAQ Accordion Item */
function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen, answer]);

  return (
    <div className="faq-item">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-[18px] text-left cursor-pointer"
      >
        <span
          className={`text-heading text-[13px] sm:text-sm pr-4 transition-colors duration-300 ${
            isOpen ? "text-[var(--rose)]" : ""
          }`}
        >
          {question}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`shrink-0 transition-all duration-500 ${
            isOpen ? "text-[var(--rose)] rotate-45" : "text-[var(--text-ghost)]"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div
        className="overflow-hidden"
        style={{
          height: isOpen ? height : 0,
          transition: "height 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        <div ref={contentRef} className="px-5 sm:px-6 pb-5 sm:pb-6">
          <p className="text-body text-[12px] sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Interactive pill content */
const PILL_CONTENT: Record<string, React.ReactNode> = {
  "Multi-Model": (
    <div className="space-y-2">
      <p className="text-body text-sm text-[var(--text-secondary)]">Supported models:</p>
      <div className="flex flex-wrap gap-1.5">
        {["Claude Sonnet 4.5", "Claude Haiku 4.5", "GPT-4o", "GPT-4o Mini", "Kimi K2"].map((m) => (
          <span
            key={m}
            className="text-code text-[10px] px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
          >
            {m}
          </span>
        ))}
      </div>
      <p className="text-code text-[10px] text-[var(--text-muted)]">More models added regularly.</p>
    </div>
  ),
  BYOK: (
    <div className="space-y-2">
      <p className="text-body text-sm text-[var(--text-secondary)]">Bring Your Own Key:</p>
      <ol className="text-body text-sm text-[var(--text-muted)] space-y-1 pl-4 list-decimal">
        <li>Go to your provider&apos;s dashboard</li>
        <li>Create a new API key</li>
        <li>Paste it into Baseclaw</li>
      </ol>
      <p className="text-code text-[10px] text-[var(--text-ghost)]">Memory-only. Never stored, never logged.</p>
    </div>
  ),
  "Web Search": (
    <div>
      <p className="text-body text-sm text-[var(--text-secondary)]">
        Built-in Brave Search. Your agent fetches live data automatically when your question needs it — prices,
        docs, news, anything current.
      </p>
    </div>
  ),
};

/* ============================================
   MAIN COMPONENT
   ============================================ */
export function OnboardingFlow() {
  const { skip } = useAuth();
  const { setStep } = useApp();
  const [expandedPill, setExpandedPill] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function togglePill(label: string) {
    setExpandedPill(expandedPill === label ? null : label);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Pure black background — ready for crab aquarium */}
      <AquariumBg />

      {/* Scroll progress */}
      <ScrollProgress />

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-8 py-16 sm:py-20">
        <div className="w-full max-w-md sm:max-w-lg flex flex-col items-center">
          {/* BASECLAW — interactive particle text */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease }}
            className="w-full mb-5 sm:mb-7"
          >
            <TypewriterTitle />
          </motion.div>

          {/* Subtitle — monospace brutalist style */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="text-center mb-8 sm:mb-10"
          >
            <p className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono mb-3">
              {"// YOUR AI. YOUR KEYS. YOUR RULES."}
            </p>
            <p className="text-body text-[var(--text-secondary)] text-[15px] sm:text-base max-w-[340px] sm:max-w-[380px] mx-auto leading-relaxed">
              Connect any model. Bring your own API key. Start building in seconds.
            </p>
          </motion.div>

          {/* Interactive feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease }}
            className="w-full max-w-xs sm:max-w-sm mb-8 sm:mb-10"
          >
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {["Multi-Model", "BYOK", "Web Search"].map((label) => (
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
                    className={`inline-block ml-1.5 transition-transform duration-300 ${
                      expandedPill === label ? "rotate-180" : ""
                    }`}
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
          </motion.div>

          {/* CTA — iPhone-style swipe to launch */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease }}
            className="w-full max-w-xs space-y-3"
          >
            <SwipeToStart onSwipeComplete={skip} />

            {/* Secondary glass buttons */}
            <button
              onClick={() => setStep("plans")}
              className="btn-cute w-full py-3.5 text-heading text-[13px] sm:text-sm tracking-tight flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>View Plans</span>
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

            {/* Social links */}
            <div className="flex items-center justify-center gap-5 pt-4">
              <a href="https://github.com/hxsteric/baseclaw" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              </a>
              <a href="https://x.com/baseclawai" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="X">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-12 sm:mt-16 flex flex-col items-center gap-2"
          >
            <p className="text-code text-[9px] text-[var(--text-ghost)]">scroll to explore</p>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--text-ghost)] to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section className="relative z-10 w-full px-5 sm:px-6 lg:px-12 py-20">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease }} className="section-label max-w-5xl mx-auto">
          <span className="section-label-text">{"// SECTION: ABOUT_BASECLAW"}</span>
          <div className="section-label-line" />
          <BlinkDot />
          <span className="section-label-number">001</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-0 border-2 border-[var(--foreground)] max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30, filter: "blur(6px)" }} whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease }} className="w-full lg:w-1/2 border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--foreground)] min-h-[300px] lg:min-h-[480px]">
            <TerminalCard />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: 0.1, ease }} className="flex flex-col w-full lg:w-1/2">
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[var(--foreground)]">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">MANIFEST.md</span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">v0.2.0</span>
            </div>

            <div className="flex-1 flex flex-col justify-between px-5 py-6 lg:py-8">
              <div className="flex flex-col gap-6">
                <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.5, delay: 0.2, ease }} className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-balance">
                  Your AI gateway<br />on <span className="text-[var(--rose)]">Base</span>
                </motion.h2>

                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ delay: 0.3, duration: 0.5, ease }} className="flex flex-col gap-4">
                  <p className="text-xs lg:text-sm font-mono text-[var(--text-secondary)] leading-relaxed">
                    Baseclaw connects you directly to any AI model through a single interface. No abstractions. No middleman. Just bring your key, pick your model, and start chatting.
                  </p>
                  <p className="text-xs lg:text-sm font-mono text-[var(--text-secondary)] leading-relaxed">
                    Built on OpenClaw — the open-source AI gateway. Powered by Virtuals Protocol and deployed on Base. Infrastructure that&apos;s inspectable, auditable, and brutally fast.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scaleX: 0.8 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.5, ease }} style={{ transformOrigin: "left" }} className="flex items-center gap-3 py-3 border-t-2 border-b-2 border-[var(--foreground)]">
                  <span className="h-1.5 w-1.5 bg-[var(--rose)]" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">UPTIME:</span>
                  <UptimeCounter />
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-0 mt-6">
                {STATS.map((stat, i) => (
                  <StatBlock key={stat.label} {...stat} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 px-5 sm:px-6 lg:px-12 py-20">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease }} className="section-label max-w-5xl mx-auto">
          <span className="section-label-text">{"// SECTION: QUICK_START"}</span>
          <div className="section-label-line" />
          <span className="section-label-number">002</span>
        </motion.div>

        <div className="max-w-md sm:max-w-lg mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }} className="text-2xl sm:text-3xl font-mono font-bold tracking-tight uppercase text-center mb-12 sm:mb-16">
            Three steps. <span className="text-[var(--rose)]">That&apos;s it.</span>
          </motion.h2>

          <div className="space-y-0">
            {[
              { step: "01", title: "Pick a model", desc: "Claude, GPT-4o, Kimi, DeepSeek, Llama — choose from any major provider through a single interface." },
              { step: "02", title: "Enter your API key", desc: "Stored in memory only. Never persisted, never logged. Gone when your session ends." },
              { step: "03", title: "Start chatting", desc: "Streaming responses, web search, code execution. Your agent is ready." },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.1, duration: 0.5, ease }} className="flex gap-4 sm:gap-5 items-start p-5 sm:p-6 border-2 border-[var(--foreground)] -mt-[2px] first:mt-0">
                <span className="text-display text-xl sm:text-2xl text-[var(--rose)] shrink-0 w-8 sm:w-10 font-mono">{item.step}</span>
                <div>
                  <h3 className="text-heading text-[15px] sm:text-base mb-1 sm:mb-1.5">{item.title}</h3>
                  <p className="text-sm font-mono text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENTO GRID ===== */}
      <section className="relative z-10 w-full px-5 sm:px-6 lg:px-12 py-20">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease }} className="section-label max-w-5xl mx-auto">
          <span className="section-label-text">{"// SECTION: RAW_DATA"}</span>
          <div className="section-label-line" />
          <span className="section-label-number">003</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease }} className="grid grid-cols-1 md:grid-cols-3 border-2 border-[var(--foreground)] max-w-5xl mx-auto">
          <div className="border-b-2 md:border-b-0 md:border-r-2 border-[var(--foreground)] min-h-[280px]"><MetricsCard /></div>
          <div className="border-b-2 md:border-b-0 md:border-r-2 border-[var(--foreground)] min-h-[280px]"><StatusCard /></div>
          <div className="min-h-[280px]">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b-2 border-[var(--foreground)] px-4 py-2">
                <span className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">agent.config</span>
                <BlinkDot />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">INTERFACE</span>
                  <span className="text-lg font-mono font-bold tracking-tight"><ScrambleText text="OPENCLAW" /></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">NETWORK</span>
                  <span className="text-lg font-mono font-bold tracking-tight"><ScrambleText text="BASE L2" /></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">PROTOCOL</span>
                  <span className="text-lg font-mono font-bold tracking-tight text-[var(--rose)]"><ScrambleText text="VIRTUALS" /></span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== PRICING ===== */}
      <PricingSection />

      {/* ===== FAQ ===== */}
      <section className="relative z-10 px-5 sm:px-6 lg:px-12 py-20">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease }} className="section-label max-w-5xl mx-auto">
          <span className="section-label-text">{"// SECTION: FAQ"}</span>
          <div className="section-label-line" />
          <span className="section-label-number">006</span>
        </motion.div>

        <div className="max-w-md sm:max-w-lg mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }} className="text-2xl sm:text-3xl font-mono font-bold tracking-tight uppercase text-center mb-10 sm:mb-14">
            Common <span className="text-[var(--rose)]">questions</span>
          </motion.h2>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, ease }} className="faq-container rounded-[26px] overflow-hidden">
            <div className="faq-items-wrapper">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PARTNER MARQUEE ===== */}
      <PartnerMarquee />

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 px-5 sm:px-6 lg:px-12 py-10 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">
            BASECLAW v0.2.0
          </span>
          <div className="flex items-center gap-5">
            <a href="https://github.com/hxsteric/baseclaw" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
            <a href="https://x.com/baseclawai" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <span className="w-px h-3 bg-[var(--border)]" />
            <a href="https://openclaw.ai/" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] font-mono hover:text-[var(--text-primary)] transition-colors">OpenClaw</a>
            <a href="https://base.org/" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] font-mono hover:text-[var(--text-primary)] transition-colors">Base</a>
            <a href="https://virtuals.io/" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-muted)] font-mono hover:text-[var(--text-primary)] transition-colors">Virtuals</a>
          </div>
          <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-ghost)] font-mono">
            Built on Base
          </span>
        </div>
      </footer>
    </div>
  );
}
