"use client";

import { useEffect, useState, useRef, useCallback, FormEvent } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useApp } from "./Providers";
import { useAuth } from "@/hooks/useAuth";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── scramble-in price effect ── */
function ScramblePrice({ target, prefix = "$" }: { target: string; prefix?: string }) {
  const [display, setDisplay] = useState(target.replace(/[0-9]/g, "0"));

  useEffect(() => {
    let iterations = 0;
    const maxIterations = 18;
    const interval = setInterval(() => {
      if (iterations >= maxIterations) {
        setDisplay(target);
        clearInterval(interval);
        return;
      }
      setDisplay(
        target
          .split("")
          .map((char, i) => {
            if (!/[0-9]/.test(char)) return char;
            if (iterations > maxIterations - 5 && i < iterations - (maxIterations - 5)) return char;
            return String(Math.floor(Math.random() * 10));
          })
          .join("")
      );
      iterations++;
    }, 50);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="font-mono font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
    </span>
  );
}

/* ── blinking dot ── */
function BlinkDot() {
  return <span className="inline-block h-2 w-2 bg-[var(--rose)] animate-blink" />;
}

/* ── mini swipe CTA for pricing cards ── */
function SwipeCTA({
  label,
  highlighted,
  onSwipeComplete,
}: {
  label: string;
  highlighted: boolean;
  onSwipeComplete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [completed, setCompleted] = useState(false);

  const thumbSize = 36;
  const padding = 3;
  const maxDrag = Math.max(0, containerWidth - thumbSize - padding * 2);
  const threshold = maxDrag * 0.75;

  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, maxDrag * 0.4], [1, 0]);
  const bgProgress = useTransform(x, [0, maxDrag], [0, 1]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleDragEnd = useCallback(() => {
    const current = x.get();
    if (current >= threshold && !completed) {
      setCompleted(true);
      animate(x, maxDrag, {
        type: "spring",
        stiffness: 400,
        damping: 30,
      });
      setTimeout(() => {
        onSwipeComplete();
      }, 300);
    } else {
      animate(x, 0, {
        type: "spring",
        stiffness: 500,
        damping: 35,
      });
    }
  }, [threshold, maxDrag, completed, onSwipeComplete, x]);

  const trackBg = highlighted
    ? "rgba(0, 0, 0, 0.15)"
    : "rgba(255, 255, 255, 0.04)";
  const trackBorder = highlighted
    ? "rgba(0, 0, 0, 0.2)"
    : "rgba(255, 255, 255, 0.08)";
  const fillFrom = highlighted
    ? "rgba(224,137,137,0.25)"
    : "rgba(224,137,137,0.15)";
  const fillTo = highlighted
    ? "rgba(224,137,137,0.4)"
    : "rgba(224,137,137,0.25)";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[42px] overflow-hidden"
      style={{
        background: trackBg,
        border: `1px solid ${trackBorder}`,
        borderRadius: "21px",
      }}
    >
      {/* Shimmer */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: "21px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(224,137,137,0.06) 50%, transparent 100%)",
            animation: completed ? "none" : "shimmer-track 2.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Fill progress */}
      <motion.div
        className="absolute top-0 left-0 bottom-0"
        style={{
          width: useTransform(bgProgress, (v) => `${(v * 100).toFixed(1)}%`),
          background: `linear-gradient(90deg, ${fillFrom} 0%, ${fillTo} 100%)`,
          borderRadius: "21px",
        }}
      />

      {/* Text label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span
          className={`text-[10px] tracking-[0.15em] uppercase font-mono ${
            highlighted ? "opacity-70" : "text-[var(--text-muted)]"
          }`}
        >
          {label}
        </span>
      </motion.div>

      {/* Draggable thumb */}
      <motion.div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{ top: padding, left: padding, x }}
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            background: completed
              ? "var(--rose)"
              : "linear-gradient(135deg, var(--rose) 0%, #c07070 100%)",
            boxShadow: "0 2px 8px rgba(224, 137, 137, 0.3)",
            transition: "background 0.3s ease",
          }}
        >
          {completed ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--background)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--background)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── tier config ── */
interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  tag: string | null;
  description: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "FREE_TIER",
    price: "0",
    period: "/ forever",
    tag: null,
    description: "Bring your own key. Zero platform fees. Unlimited usage.",
    features: [
      { text: "Unlimited messages", included: true },
      { text: "All supported models", included: true },
      { text: "Web search (Brave)", included: true },
      { text: "BYOK — your API key", included: true },
      { text: "Priority routing", included: false },
      { text: "Custom model config", included: false },
    ],
    cta: "GET STARTED",
    highlighted: false,
  },
  {
    id: "hybrid",
    name: "HYBRID_MODE",
    price: "0",
    period: "/ usage per month",
    tag: "MOST EFFICIENT",
    description: "Learn about the plans. Smart routing picks the cheapest model that fits your query.",
    features: [
      { text: "Unlimited messages", included: true },
      { text: "Auto model selection", included: true },
      { text: "Cost-optimized routing", included: true },
      { text: "Web search (Brave)", included: true },
      { text: "Priority routing", included: true },
      { text: "Real-time cost tracking", included: true },
    ],
    cta: "START BUILDING",
    highlighted: true,
  },
  {
    id: "pro",
    name: "PRO_ACCESS",
    price: "SOON",
    period: "",
    tag: null,
    description: "Managed keys, team features, and dedicated infrastructure. Coming soon.",
    features: [
      { text: "Everything in Hybrid", included: true },
      { text: "Managed API keys", included: true },
      { text: "Team workspaces", included: true },
      { text: "Usage analytics", included: true },
      { text: "Custom model fine-tuning", included: true },
      { text: "24/7 dedicated support", included: true },
    ],
    cta: "JOIN WAITLIST",
    highlighted: false,
  },
];

/* ── single pricing card ── */
function PricingCard({
  tier,
  index,
  onAction,
}: {
  tier: Tier;
  index: number;
  onAction: (tierId: string) => void;
}) {
  const isCustom = tier.price === "SOON";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.12, duration: 0.6, ease }}
      className={`flex flex-col h-full ${
        tier.highlighted
          ? "border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
          : "border-2 border-[var(--foreground)] bg-transparent text-[var(--foreground)]"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-center justify-between px-5 py-3 border-b-2 ${
          tier.highlighted ? "border-[var(--background)]/20" : "border-[var(--foreground)]"
        }`}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">{tier.name}</span>
        <div className="flex items-center gap-2">
          {tier.tag && (
            <span className="bg-[var(--rose)] text-[var(--background)] text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-mono">
              {tier.tag}
            </span>
          )}
          <span className="text-[10px] tracking-[0.2em] font-mono opacity-50">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Price block */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-baseline gap-1">
          {isCustom ? (
            <span className="text-3xl lg:text-4xl font-mono font-bold tracking-tight">SOON</span>
          ) : (
            <span className="text-3xl lg:text-4xl">
              <ScramblePrice target={tier.price} />
            </span>
          )}
          {tier.period && (
            <span
              className={`text-xs font-mono tracking-widest uppercase ${
                tier.highlighted ? "opacity-50" : "text-[var(--text-muted)]"
              }`}
            >
              {tier.period}
            </span>
          )}
        </div>
        <p
          className={`text-xs font-mono mt-3 leading-relaxed ${
            tier.highlighted ? "opacity-60" : "text-[var(--text-muted)]"
          }`}
        >
          {tier.description}
        </p>
      </div>

      {/* Feature list */}
      <div
        className={`flex-1 px-5 py-4 border-t-2 ${
          tier.highlighted ? "border-[var(--background)]/20" : "border-[var(--foreground)]"
        }`}
      >
        <div className="flex flex-col gap-3">
          {tier.features.map((feature, fi) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 + 0.3 + fi * 0.04, duration: 0.35, ease }}
              className="flex items-start gap-3"
            >
              {feature.included ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rose)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`mt-0.5 shrink-0 ${
                    tier.highlighted ? "opacity-30" : "text-[var(--text-muted)] opacity-40"
                  }`}
                >
                  <path d="M5 12h14" />
                </svg>
              )}
              <span
                className={`text-xs font-mono leading-relaxed ${
                  feature.included
                    ? ""
                    : tier.highlighted
                    ? "opacity-30 line-through"
                    : "text-[var(--text-muted)] opacity-40 line-through"
                }`}
              >
                {feature.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Swipeable CTA */}
      <div className="px-5 pb-5 pt-3">
        <SwipeCTA
          label={tier.cta}
          highlighted={tier.highlighted}
          onSwipeComplete={() => onAction(tier.id)}
        />
      </div>
    </motion.div>
  );
}

/* ── waitlist email modal ── */
function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "exists">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
        return;
      }

      if (data.message?.includes("already")) {
        setStatus("exists");
      } else {
        setStatus("success");
      }
      setMessage(data.message);
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  const done = status === "success" || status === "exists";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm border-2 border-[var(--foreground)] bg-[var(--background)] p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[var(--text-muted)]">
            // JOIN_WAITLIST
          </span>
          <button
            onClick={onClose}
            className="text-[var(--text-ghost)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {done ? (
          /* Success state */
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center justify-center w-12 h-12 border-2 border-[var(--rose)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm font-mono text-center text-[var(--text-secondary)]">{message}</p>
            <button
              onClick={onClose}
              className="text-[10px] tracking-[0.15em] uppercase font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mt-2"
            >
              close
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-mono font-bold tracking-tight uppercase mb-2">
                Pro Access is <span className="text-[var(--rose)]">coming</span>
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
                Drop your email and we&apos;ll notify you when Pro Access launches.
              </p>
            </div>

            <div className="flex gap-0">
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 bg-transparent border-2 border-[var(--foreground)] px-4 py-3 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--text-ghost)] outline-none focus:border-[var(--rose)] transition-colors"
                disabled={status === "loading"}
                required
              />
              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="bg-[var(--foreground)] text-[var(--background)] px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-mono cursor-pointer disabled:opacity-40 hover:bg-[var(--rose)] transition-colors shrink-0"
              >
                {status === "loading" ? (
                  <div className="h-3 w-3 border border-[var(--background)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Join"
                )}
              </button>
            </div>

            {status === "error" && (
              <p className="text-[10px] font-mono text-[var(--rose)]">{message}</p>
            )}

            <p className="text-[9px] font-mono text-[var(--text-ghost)]">
              No spam. Just one email when we launch.
            </p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── main pricing section ── */
export function PricingSection() {
  const { setStep } = useApp();
  const { skip, authenticate } = useAuth();
  async function handleTierAction(tierId: string) {
    switch (tierId) {
      case "free":
        // Go to BYOK model launcher (setup step)
        skip();
        break;
      case "hybrid":
        // Authenticate first (gets Farcaster fid or dev fid), then navigate to plans
        await authenticate({ skipNavigation: true });
        setStep("plans");
        break;
      case "pro":
        // Redirect to standalone waitlist page
        window.location.href = "/waitlist";
        break;
    }
  }

  return (
    <section className="relative z-10 w-full px-5 sm:px-6 lg:px-12 py-20">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="section-label max-w-5xl mx-auto"
      >
        <span className="section-label-text">{"// SECTION: PRICING_TIERS"}</span>
        <div className="section-label-line" />
        <BlinkDot />
        <span className="section-label-number">005</span>
      </motion.div>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 max-w-5xl mx-auto"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-balance">
            Select your <span className="text-[var(--rose)]">tier</span>
          </h2>
          <p className="text-xs lg:text-sm font-mono text-[var(--text-muted)] leading-relaxed max-w-md">
            All tiers include zero-config setup, built-in web search, and access to every supported model.
          </p>
        </div>
      </motion.div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-5xl mx-auto">
        {TIERS.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} index={i} onAction={handleTierAction} />
        ))}
      </div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="flex items-center gap-3 mt-6 max-w-5xl mx-auto"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">
          {"* You only pay your API provider. Baseclaw takes zero cut."}
        </span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </motion.div>
    </section>
  );
}
