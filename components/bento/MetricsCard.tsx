"use client";

import { useEffect, useState } from "react";

interface ScrambleNumberProps {
  target: string;
  label: string;
  delay?: number;
}

function ScrambleNumber({ target, label, delay = 0 }: ScrambleNumberProps) {
  const [display, setDisplay] = useState(target.replace(/[0-9]/g, "0"));

  useEffect(() => {
    const timeout = setTimeout(() => {
      let iterations = 0;
      const maxIterations = 20;

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
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, delay]);

  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-3xl lg:text-4xl font-mono font-bold tracking-tight text-[var(--text-primary)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {display}
      </span>
      <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export function MetricsCard() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b-2 border-[var(--foreground)] px-4 py-2">
        <span className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
          inference.metrics
        </span>
        <span className="inline-block h-2 w-2 bg-[var(--rose)]" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-5 p-5">
        <ScrambleNumber target="4.2ms" label="Avg Latency" delay={500} />
        <ScrambleNumber target="12.8K" label="Requests / sec" delay={800} />
        <ScrambleNumber target="99.97%" label="Uptime" delay={1100} />
      </div>
    </div>
  );
}
