"use client";

import { useState, useEffect, useMemo } from "react";

/*
  AsciiCrab — Animated ASCII art of the Baseclaw crab mascot.
  Cute, round body matching the SVG: oval shell, eye stalks,
  round eyes, curved claws, small legs, cute smile.
  Uses standard monospace characters for reliable rendering.
*/

// ── Crab frames — cute & round like the SVG mascot ──
// Width: 25 chars. Height: 9 lines.
// Features: eye stalks (top), round body, side claws, legs, smile

const IDLE_1 = [
  "       o   o       ",
  "       |   |       ",
  "   ___/     \\___   ",
  " _/    @   @    \\_ ",
  "|      \\___/      |",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

const IDLE_2 = [
  "       o   o       ",
  "       |   |       ",
  "   ___/     \\___   ",
  " _/    @   @    \\_ ",
  "|      \\___/      |",
  " \\_              _/ ",
  "    \\__________/    ",
  "   | |        | |   ",
  "   |_|        |_|   ",
];

const BLINK = [
  "       o   o       ",
  "       |   |       ",
  "   ___/     \\___   ",
  " _/    -   -    \\_ ",
  "|      \\___/      |",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

const HAPPY = [
  "       o   o       ",
  "       |   |       ",
  "   ___/     \\___   ",
  " _/    ^   ^    \\_ ",
  "|      \\___/      |",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

const WAVE_R = [
  "       o   o       ",
  "       |   |   _/  ",
  "   ___/     \\___/   ",
  " _/    @   @    \\   ",
  "|      \\___/     |  ",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

const WAVE_R2 = [
  "       o   o   _   ",
  "       |   |  / |  ",
  "   ___/     \\_/  |  ",
  " _/    @   @    /   ",
  "|      \\___/    |   ",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

const SCUTTLE_R = [
  "        o   o      ",
  "        |   |      ",
  "    ___/     \\___  ",
  "  _/    @   @    \\_",
  " |      \\___/      |",
  "  \\_              _/",
  "     \\__________/   ",
  "     | |      | |   ",
  "     |_|      |_|   ",
];

const SCUTTLE_L = [
  "      o   o        ",
  "      |   |        ",
  "  ___/     \\___    ",
  "_/    @   @    \\_  ",
  "|      \\___/      | ",
  " \\_              _/ ",
  "   \\__________/     ",
  "   | |      | |     ",
  "   |_|      |_|     ",
];

const SLEEPY = [
  "       o   o       ",
  "       |   |     z ",
  "   ___/     \\___  Z",
  " _/    ~   ~    \\_ ",
  "|      \\_~_/      |",
  " \\_              _/ ",
  "    \\__________/    ",
  "    | |      | |    ",
  "    |_|      |_|    ",
];

// ── Animation sequence: [frame, duration_ms] ──

type FrameData = [string[], number];

const SEQUENCE: FrameData[] = [
  [IDLE_1, 700],
  [IDLE_2, 700],
  [IDLE_1, 600],
  [BLINK, 100],
  [IDLE_1, 500],
  [IDLE_2, 600],
  [IDLE_1, 400],
  [WAVE_R, 300],
  [WAVE_R2, 300],
  [WAVE_R, 300],
  [WAVE_R2, 300],
  [WAVE_R, 250],
  [IDLE_1, 500],
  [BLINK, 100],
  [IDLE_2, 400],
  [IDLE_1, 600],
  [SCUTTLE_R, 200],
  [SCUTTLE_L, 200],
  [SCUTTLE_R, 200],
  [SCUTTLE_L, 200],
  [IDLE_1, 500],
  [HAPPY, 1000],
  [BLINK, 100],
  [HAPPY, 600],
  [IDLE_1, 800],
  [BLINK, 100],
  [IDLE_2, 500],
  [SLEEPY, 1000],
  [BLINK, 100],
  [IDLE_1, 1400],
];

// ── Colorize characters ──

function getCharStyle(ch: string, _y: number, glitchLine: number, y: number) {
  const isGlitch = y === glitchLine;

  if (isGlitch) {
    return { color: "rgba(224,137,137,0.6)", glow: false };
  }

  // Eye stalks top (o)
  if (ch === "o") return { color: "#f2e0e0", glow: true };

  // Eyes
  if (ch === "@") return { color: "#ffffff", glow: true };
  if (ch === "^") return { color: "#ffffff", glow: true };
  if (ch === "~") return { color: "#a0a0b0", glow: false };

  // Blink eyes
  if (ch === "-") return { color: "#9896a1", glow: false };

  // Zzz
  if (ch === "z" || ch === "Z") return { color: "#7180c7", glow: true };

  // Body curves and structure
  if (ch === "/" || ch === "\\") return { color: "#e08989", glow: false };
  if (ch === "|") return { color: "#d07070", glow: false };
  if (ch === "_") return { color: "#c07070", glow: false };

  // Default structural
  return { color: "rgba(224,137,137,0.35)", glow: false };
}

// ── Component ──

interface AsciiCrabProps {
  className?: string;
  scale?: number;
}

export function AsciiCrab({ className = "", scale = 14 }: AsciiCrabProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [glitchLine, setGlitchLine] = useState(-1);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function next() {
      setFrameIdx(prev => {
        const nextIdx = (prev + 1) % SEQUENCE.length;
        timeout = setTimeout(next, SEQUENCE[nextIdx][1]);
        return nextIdx;
      });
    }
    timeout = setTimeout(next, SEQUENCE[0][1]);
    return () => clearTimeout(timeout);
  }, []);

  // Subtle glitch
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.12) {
        const line = Math.floor(Math.random() * 9);
        setGlitchLine(line);
        setTimeout(() => setGlitchLine(-1), 50 + Math.random() * 80);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const frame = SEQUENCE[frameIdx][0];

  const rendered = useMemo(() => {
    return frame.map((line, y) => {
      const chars = [...line].map((ch, x) => {
        if (ch === " ") return <span key={x}>{"\u00A0"}</span>;
        const style = getCharStyle(ch, y, glitchLine, y);
        return (
          <span
            key={x}
            style={{
              color: style.color,
              textShadow: style.glow ? `0 0 8px rgba(242,240,239,0.4)` : "none",
            }}
          >
            {ch}
          </span>
        );
      });
      return (
        <div
          key={y}
          style={{
            transform: y === glitchLine ? `translateX(${Math.random() * 4 - 2}px)` : "none",
            height: `${scale * 1.25}px`,
          }}
        >
          {chars}
        </div>
      );
    });
  }, [frame, glitchLine, scale]);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Ambient glow behind crab */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
          background: "radial-gradient(ellipse, rgba(224,137,137,0.1) 0%, transparent 50%)",
          filter: "blur(25px)",
        }}
      />
      <pre
        style={{
          fontFamily: "var(--font-mono), 'JetBrains Mono', 'Courier New', monospace",
          fontSize: scale,
          lineHeight: 1.25,
          letterSpacing: "0.02em",
          textAlign: "center",
          margin: 0,
          padding: 0,
          userSelect: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        {rendered}
      </pre>
    </div>
  );
}
