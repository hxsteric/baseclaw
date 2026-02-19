"use client";

import { useEffect, useState } from "react";

const REGIONS = [
  { name: "BASE-MAINNET", status: "ONLINE", latency: "3.8ms" },
  { name: "VIRTUALS-NODE", status: "ONLINE", latency: "4.1ms" },
  { name: "OPENCLAW-GW", status: "ONLINE", latency: "4.6ms" },
];

export function StatusCard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b-2 border-[var(--foreground)] px-4 py-2">
        <span className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
          edge_nodes.status
        </span>
        <span className="text-[10px] tracking-widest text-[var(--text-muted)]">
          {`TICK:${String(tick).padStart(4, "0")}`}
        </span>
      </div>
      <div className="flex-1 flex flex-col p-4 gap-0">
        {/* Table header */}
        <div className="grid grid-cols-3 gap-2 border-b border-[var(--border)] pb-2 mb-2">
          <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--text-muted)]">Node</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--text-muted)]">Status</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--text-muted)] text-right">Latency</span>
        </div>
        {REGIONS.map((region) => (
          <div
            key={region.name}
            className="grid grid-cols-3 gap-2 py-2 border-b border-[var(--border)] last:border-none"
          >
            <span className="text-xs font-mono text-[var(--text-primary)]">{region.name}</span>
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5"
                style={{
                  backgroundColor: region.status === "ONLINE" ? "var(--rose)" : "var(--text-muted)",
                }}
              />
              <span className="text-xs font-mono text-[var(--text-secondary)]">{region.status}</span>
            </div>
            <span className="text-xs font-mono text-[var(--text-primary)] text-right">{region.latency}</span>
          </div>
        ))}
        {/* Throughput bar */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--text-muted)]">
              Global Throughput
            </span>
            <span className="text-[9px] font-mono text-[var(--text-primary)]">87%</span>
          </div>
          <div className="h-2 w-full border border-[var(--foreground)]">
            <div className="h-full bg-[var(--foreground)]" style={{ width: "87%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
