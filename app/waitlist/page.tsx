"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function WaitlistPage() {
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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ background: "#000" }}>
      {/* Background grid effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        {/* Logo / back link */}
        <a href="/" className="flex items-center gap-3 mb-12 group">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[var(--text-ghost)] group-hover:text-[var(--text-muted)] transition-colors">
            &larr; baseclaw.dev
          </span>
        </a>

        {/* Section label */}
        <div className="flex items-center gap-3 w-full mb-8">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[var(--text-muted)]">
            {"// JOIN_WAITLIST"}
          </span>
          <div className="flex-1 border-t border-[var(--border)]" />
          <span className="inline-block h-2 w-2 bg-[var(--rose)] animate-blink" />
        </div>

        {done ? (
          /* ── Success State ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease }}
            className="w-full border-2 border-[var(--foreground)] p-8 flex flex-col items-center gap-6"
          >
            <div className="flex items-center justify-center w-16 h-16 border-2 border-[var(--rose)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-mono font-bold tracking-tight uppercase mb-2">
                {status === "exists" ? "Already on the list" : "You're in"}
              </h2>
              <p className="text-sm font-mono text-[var(--text-secondary)]">{message}</p>
            </div>
            <a
              href="/"
              className="text-[10px] tracking-[0.15em] uppercase font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-2"
            >
              &larr; back to baseclaw
            </a>
          </motion.div>
        ) : (
          /* ── Form State ── */
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease }}
              className="mb-8"
            >
              <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight uppercase mb-4">
                Pro Access is{" "}
                <span className="text-[var(--rose)]">coming</span>
              </h1>
              <p className="text-sm font-mono text-[var(--text-muted)] leading-relaxed">
                Managed API keys. Team workspaces. Usage analytics. Custom fine-tuning. Dedicated support.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex gap-0">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent border-2 border-[var(--foreground)] px-5 py-4 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--text-ghost)] outline-none focus:border-[var(--rose)] transition-colors"
                  disabled={status === "loading"}
                  required
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !email.trim()}
                  className="bg-[var(--foreground)] text-[var(--background)] px-6 py-4 text-xs tracking-[0.15em] uppercase font-mono cursor-pointer disabled:opacity-40 hover:bg-[var(--rose)] transition-colors shrink-0"
                >
                  {status === "loading" ? (
                    <div className="h-4 w-4 border-2 border-[var(--background)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Join"
                  )}
                </button>
              </div>

              {status === "error" && (
                <p className="text-xs font-mono text-[var(--rose)]">{message}</p>
              )}
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6 flex flex-col gap-4"
            >
              <p className="text-[10px] font-mono text-[var(--text-ghost)]">
                No spam. Just one email when we launch.
              </p>

              {/* Feature preview */}
              <div className="border-t border-[var(--border)] pt-5 mt-2">
                <span className="text-[9px] tracking-[0.2em] uppercase font-mono text-[var(--text-ghost)] mb-3 block">
                  What&apos;s included in Pro
                </span>
                <div className="flex flex-col gap-2.5">
                  {[
                    "Everything in Hybrid Mode",
                    "Managed API keys",
                    "Team workspaces",
                    "Usage analytics dashboard",
                    "Custom model fine-tuning",
                    "24/7 dedicated support",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center gap-4 mt-12"
        >
          <a href="https://github.com/hxsteric/baseclaw" target="_blank" rel="noopener noreferrer" className="text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
          </a>
          <a href="https://x.com/baseclawai" target="_blank" rel="noopener noreferrer" className="text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <span className="w-px h-3 bg-[var(--border)]" />
          <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-[var(--text-ghost)]">
            baseclaw v0.2.0
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
