"use client";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const PARTNERS = [
  "BASECLAW",
  "OPENCLAW",
  "VIRTUALS PROTOCOL",
  "BASE",
  "BASECLAW",
  "OPENCLAW",
  "VIRTUALS PROTOCOL",
  "BASE",
];

function LogoBlock({ name, glitch }: { name: string; glitch: boolean }) {
  return (
    <div
      className={`flex items-center justify-center px-8 py-4 border-r-2 border-[var(--foreground)] shrink-0 ${
        glitch ? "animate-glitch" : ""
      }`}
    >
      <span className="text-sm font-mono tracking-[0.15em] uppercase text-[var(--text-primary)] whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

export function PartnerMarquee() {
  const glitchIndices = [2, 5];

  return (
    <section className="w-full py-12 sm:py-16 px-5 sm:px-6 lg:px-12">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="section-label"
      >
        <span className="section-label-text">
          {"// POWERED_BY: ECOSYSTEM"}
        </span>
        <div className="section-label-line" />
        <span className="inline-block h-2 w-2 bg-[var(--rose)] animate-blink" />
        <span className="section-label-number">007</span>
      </motion.div>

      {/* Marquee */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden border-2 border-[var(--foreground)]"
      >
        <div className="flex animate-marquee" style={{ width: "max-content" }}>
          {[...PARTNERS, ...PARTNERS].map((name, i) => (
            <LogoBlock
              key={`${name}-${i}`}
              name={name}
              glitch={glitchIndices.includes(i % PARTNERS.length)}
            />
          ))}
        </div>
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        className="text-center text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono mt-6"
      >
        Powered by Base, Virtuals Protocol, and OpenClaw
      </motion.p>
    </section>
  );
}
