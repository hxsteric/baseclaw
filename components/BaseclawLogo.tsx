"use client";

import { useState, useCallback } from "react";

/*
  BaseClaw animated logo — fully white cute crab icon.
  Tap/click triggers the crab to light up like a bright light bulb,
  glow intensely, then fade back to normal. Mobile touch-friendly.
*/

export function BaseclawLogo({ size = 64, className = "" }: { size?: number; className?: string }) {
  const [lit, setLit] = useState(false);

  const handleTap = useCallback(() => {
    if (lit) return;
    setLit(true);
    setTimeout(() => setLit(false), 900);
  }, [lit]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      onClick={handleTap}
      role="button"
      tabIndex={0}
    >
      {/* Layer 1: big soft ambient glow behind everything */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 3,
          height: size * 3,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,220,120,0.3) 0%, rgba(255,200,80,0.08) 35%, transparent 65%)",
          opacity: lit ? 1 : 0,
          transition: lit
            ? "opacity 0.1s ease-out"
            : "opacity 0.8s ease-in",
        }}
      />

      {/* Layer 2: sharp inner flash */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.6,
          height: size * 1.6,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,230,140,0.55) 0%, rgba(255,210,90,0.18) 40%, transparent 70%)",
          opacity: lit ? 1 : 0,
          transition: lit
            ? "opacity 0.05s ease-out"
            : "opacity 0.6s ease-in",
        }}
      />

      {/* Layer 3: expanding ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size,
          height: size,
          left: "50%",
          top: "50%",
          border: "2px solid rgba(255,220,120,0.4)",
          transform: lit ? "translate(-50%, -50%) scale(2.5)" : "translate(-50%, -50%) scale(1)",
          opacity: lit ? 0 : 0,
          transition: lit
            ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease-out"
            : "none",
          ...(lit ? { opacity: 0.8 } : {}),
        }}
      />

      {/* The crab SVG — lights up bright white when tapped */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-logo-breathe relative z-10"
        style={{
          filter: lit
            ? "brightness(2.5) drop-shadow(0 0 20px rgba(255,210,80,0.8)) drop-shadow(0 0 40px rgba(255,190,60,0.35))"
            : "drop-shadow(0 0 0px transparent)",
          transition: lit
            ? "filter 0.1s ease-out"
            : "filter 0.8s ease-in",
        }}
      >
        {/* Outer ring */}
        <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="1" opacity={lit ? "0.5" : "0.2"} />
        <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="0.5" opacity={lit ? "0.3" : "0.1"} />

        {/* Main body — rounded shell */}
        <ellipse cx="40" cy="42" rx="18" ry="14" fill="white" opacity={lit ? "0.6" : "0.2"} />
        <ellipse cx="40" cy="40" rx="16" ry="12" fill="white" opacity={lit ? "0.4" : "0.12"} />

        {/* Shell highlight */}
        <ellipse cx="40" cy="37" rx="12" ry="8" fill="white" opacity={lit ? "0.3" : "0.06"} />

        {/* Eyes — cute round */}
        <circle cx="34" cy="34" r="3.5" fill="white" opacity={lit ? "1" : "0.9"} />
        <circle cx="46" cy="34" r="3.5" fill="white" opacity={lit ? "1" : "0.9"} />
        {/* Pupils */}
        <circle cx="34.8" cy="33.5" r="1.5" fill={lit ? "rgba(17,17,20,0.3)" : "var(--bg-primary)"} />
        <circle cx="46.8" cy="33.5" r="1.5" fill={lit ? "rgba(17,17,20,0.3)" : "var(--bg-primary)"} />
        {/* Eye shine */}
        <circle cx="33" cy="32.5" r="0.8" fill="white" opacity="0.9" />
        <circle cx="45" cy="32.5" r="0.8" fill="white" opacity="0.9" />

        {/* Eye stalks */}
        <line x1="34" y1="34" x2="31" y2="26" stroke="white" strokeWidth="2" opacity={lit ? "0.7" : "0.3"} strokeLinecap="round" />
        <line x1="46" y1="34" x2="49" y2="26" stroke="white" strokeWidth="2" opacity={lit ? "0.7" : "0.3"} strokeLinecap="round" />

        {/* Left claw */}
        <path
          d="M22 42C17 37 12 39 11 43C10 47 14 48 18 46L22 44"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          opacity={lit ? "0.8" : "0.35"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right claw */}
        <path
          d="M58 42C63 37 68 39 69 43C70 47 66 48 62 46L58 44"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          opacity={lit ? "0.8" : "0.35"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tiny legs */}
        <line x1="28" y1="50" x2="22" y2="56" stroke="white" strokeWidth="1.5" opacity={lit ? "0.5" : "0.15"} strokeLinecap="round" />
        <line x1="32" y1="52" x2="27" y2="58" stroke="white" strokeWidth="1.5" opacity={lit ? "0.5" : "0.15"} strokeLinecap="round" />
        <line x1="52" y1="50" x2="58" y2="56" stroke="white" strokeWidth="1.5" opacity={lit ? "0.5" : "0.15"} strokeLinecap="round" />
        <line x1="48" y1="52" x2="53" y2="58" stroke="white" strokeWidth="1.5" opacity={lit ? "0.5" : "0.15"} strokeLinecap="round" />

        {/* Cute mouth — small smile */}
        <path d="M37 46 Q40 49 43 46" stroke="white" strokeWidth="1.2" fill="none" opacity={lit ? "0.6" : "0.25"} strokeLinecap="round" />
      </svg>
    </div>
  );
}
