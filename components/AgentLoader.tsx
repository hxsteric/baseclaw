"use client";

import { useEffect, useState, useRef } from "react";
import { BackButton } from "./BackButton";
import { AsciiCrab } from "./AsciiCrab";

interface AgentLoaderProps {
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = [
  "Initializing session...",
  "Connecting to provider...",
  "Loading model...",
  "Preparing workspace...",
  "Agent ready!",
];

export function AgentLoader({ onComplete, onCancel }: AgentLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const duration = 2800;
    const interval = 16;
    const increment = 100 / (duration / interval);
    let current = 0;

    const timer = setInterval(() => {
      if (cancelledRef.current) {
        clearInterval(timer);
        return;
      }
      current += increment + Math.random() * 0.5;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setTimeout(onComplete, 400);
      }
      setProgress(current);

      const idx = Math.min(Math.floor((current / 100) * STEPS.length), STEPS.length - 1);
      setStepIndex(idx);
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  function handleCancel() {
    cancelledRef.current = true;
    onCancel();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-[var(--bg-primary)]">
      <BackButton onClick={handleCancel} label="Cancel" />

      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        {/* ASCII Crab — animated loading mascot */}
        <AsciiCrab scale={14} />

        {/* Progress bar */}
        <div className="w-full space-y-3">
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--rose), var(--indigo))",
                boxShadow: "0 0 12px var(--rose-glow)",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-code text-[10px] text-[var(--text-muted)] transition-all duration-300">
              {STEPS[stepIndex]}
            </p>
            <p className="text-code text-[10px] text-[var(--text-ghost)]">
              {Math.round(progress)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
