"use client";

import { useEffect, useState } from "react";

const LOG_LINES = [
  "> Initializing Baseclaw pipeline...",
  "> Loading model weights: 2.4GB",
  "> Connecting to Base network...",
  "> Analyzing agent config...",
  "> Running inference: batch_01",
  "> OpenClaw gateway: connected",
  "> Virtuals Protocol: synced",
  "> Streaming response...",
  "> 98% Optimized",
  "> Deploying to edge nodes...",
  "> Status: OPERATIONAL",
  "> Latency: 4.2ms p99",
  "> Throughput: 12.8K req/s",
  "> Memory: 847MB / 2048MB",
  "> --------- CYCLE COMPLETE ---------",
];

export function TerminalCard() {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);

  useEffect(() => {
    setLines([LOG_LINES[0]]);
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        const next = prev + 1;
        if (next >= LOG_LINES.length) {
          setLines([]);
          return 0;
        }
        setLines((l) => [...l.slice(-8), LOG_LINES[next]]);
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b-2 border-[var(--foreground)] px-4 py-2">
        <span className="h-2 w-2 bg-[var(--rose)]" />
        <span className="h-2 w-2 bg-[var(--foreground)]" />
        <span className="h-2 w-2 border border-[var(--foreground)]" />
        <span className="ml-auto text-[10px] tracking-widest text-[var(--text-muted)] uppercase font-mono">
          terminal.sys
        </span>
      </div>
      <div className="flex-1 bg-[var(--foreground)] p-4 overflow-hidden">
        <div className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <span
              key={`${currentLine}-${i}`}
              className="text-xs text-[var(--background)] font-mono block"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.6 }}
            >
              {line}
            </span>
          ))}
          <span className="text-xs text-[var(--rose)] font-mono animate-blink">{"_"}</span>
        </div>
      </div>
    </div>
  );
}
