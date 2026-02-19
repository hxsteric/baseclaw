"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface SwipeToStartProps {
  onSwipeComplete: () => void;
}

export function SwipeToStart({ onSwipeComplete }: SwipeToStartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [completed, setCompleted] = useState(false);

  const thumbSize = 48;
  const padding = 4;
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
      // Small delay so the user sees the completion state
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[56px] overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "28px",
      }}
    >
      {/* Shimmer hint animation on track */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: "28px" }}
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
          background: "linear-gradient(90deg, rgba(224,137,137,0.15) 0%, rgba(224,137,137,0.25) 100%)",
          borderRadius: "28px",
        }}
      />

      {/* Text label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span className="text-[11px] sm:text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-mono">
          Slide to launch
        </span>
      </motion.div>

      {/* Draggable thumb */}
      <motion.div
        className="absolute top-1 left-1 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
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
            boxShadow: "0 2px 12px rgba(224, 137, 137, 0.3)",
            transition: "background 0.3s ease",
          }}
        >
          {completed ? (
            <svg
              width="18"
              height="18"
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
              width="18"
              height="18"
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
