"use client";

import { useState, useEffect, useCallback } from "react";

/*
  PixelCrab — Animated pixel art crab mascot.
  Built with CSS box-shadow pixel rendering.
  Animations: idle breathing, wave, blink, walk.
*/

const PX = 1; // base pixel unit, scaled by size prop

// Color palette — pastel rose / cream / dark
const C = {
  body:     "#e08989",   // rose
  bodyL:    "#e8a0a0",   // light rose
  bodyD:    "#c47070",   // dark rose
  shell:    "#d47878",   // shell main
  shellL:   "#e89999",   // shell highlight
  shellD:   "#b85e5e",   // shell shadow
  eye:      "#f2f0ef",   // white
  pupil:    "#1a1a2e",   // dark
  claw:     "#e89999",   // claw color
  clawD:    "#c47070",   // claw dark
  leg:      "#c47070",   // legs
  mouth:    "#1a1a2e",   // mouth
  cheek:    "#f0b0b0",   // blush
};

// Each frame is an array of [x, y, color] pixels
// Grid: 16x16 pixel crab

function generateIdleFrame(tick: number): string {
  const breathe = Math.sin(tick * 0.15) * 0.5;
  const eyeY = 4 + (breathe > 0.3 ? 0 : 0);

  // Pixel positions: [x, y, color]
  const pixels: [number, number, string][] = [
    // Eye stalks
    [5, 2, C.bodyL], [10, 2, C.bodyL],
    [5, 3, C.body],  [10, 3, C.body],

    // Eyes
    [4, 3, C.eye], [5, 3, C.eye], [6, 3, C.eye],
    [9, 3, C.eye], [10, 3, C.eye], [11, 3, C.eye],
    [4, 4, C.eye], [5, 4, C.pupil], [6, 4, C.eye],
    [9, 4, C.eye], [10, 4, C.pupil], [11, 4, C.eye],

    // Shell top
    [5, 5, C.shellL], [6, 5, C.shellL], [7, 5, C.shellL], [8, 5, C.shellL], [9, 5, C.shellL], [10, 5, C.shellL],

    // Shell body
    [4, 6, C.shell], [5, 6, C.shellL], [6, 6, C.shell], [7, 6, C.shellL], [8, 6, C.shell], [9, 6, C.shellL], [10, 6, C.shell], [11, 6, C.shell],
    [3, 7, C.shell], [4, 7, C.shell], [5, 7, C.shell], [6, 7, C.shellL], [7, 7, C.shell], [8, 7, C.shellL], [9, 7, C.shell], [10, 7, C.shell], [11, 7, C.shell], [12, 7, C.shell],
    [3, 8, C.shellD], [4, 8, C.shell], [5, 8, C.shell], [6, 8, C.shell], [7, 8, C.shell], [8, 8, C.shell], [9, 8, C.shell], [10, 8, C.shell], [11, 8, C.shell], [12, 8, C.shellD],
    [4, 9, C.shellD], [5, 9, C.shellD], [6, 9, C.shell], [7, 9, C.shell], [8, 9, C.shell], [9, 9, C.shell], [10, 9, C.shellD], [11, 9, C.shellD],

    // Cheeks
    [4, 7, C.cheek], [11, 7, C.cheek],

    // Mouth
    [7, 8, C.mouth], [8, 8, C.mouth],

    // Left claw
    [1, 6, C.claw], [2, 6, C.claw],
    [0, 7, C.clawD], [1, 7, C.claw], [2, 7, C.body],
    [1, 8, C.clawD], [2, 8, C.claw],

    // Right claw
    [13, 6, C.claw], [14, 6, C.claw],
    [13, 7, C.body], [14, 7, C.claw], [15, 7, C.clawD],
    [13, 8, C.claw], [14, 8, C.clawD],

    // Legs
    [3, 10, C.leg], [4, 11, C.leg],
    [5, 10, C.leg], [5, 11, C.leg],
    [10, 10, C.leg], [10, 11, C.leg],
    [12, 10, C.leg], [11, 11, C.leg],
  ];

  return pixelsToBoxShadow(pixels);
}

function generateBlinkFrame(): string {
  const pixels: [number, number, string][] = [
    // Eye stalks
    [5, 2, C.bodyL], [10, 2, C.bodyL],
    [5, 3, C.body],  [10, 3, C.body],

    // Eyes CLOSED (horizontal line)
    [4, 4, C.eye], [5, 4, C.bodyD], [6, 4, C.eye],
    [9, 4, C.eye], [10, 4, C.bodyD], [11, 4, C.eye],

    // Shell top
    [5, 5, C.shellL], [6, 5, C.shellL], [7, 5, C.shellL], [8, 5, C.shellL], [9, 5, C.shellL], [10, 5, C.shellL],

    // Shell body
    [4, 6, C.shell], [5, 6, C.shellL], [6, 6, C.shell], [7, 6, C.shellL], [8, 6, C.shell], [9, 6, C.shellL], [10, 6, C.shell], [11, 6, C.shell],
    [3, 7, C.shell], [4, 7, C.shell], [5, 7, C.shell], [6, 7, C.shellL], [7, 7, C.shell], [8, 7, C.shellL], [9, 7, C.shell], [10, 7, C.shell], [11, 7, C.shell], [12, 7, C.shell],
    [3, 8, C.shellD], [4, 8, C.shell], [5, 8, C.shell], [6, 8, C.shell], [7, 8, C.shell], [8, 8, C.shell], [9, 8, C.shell], [10, 8, C.shell], [11, 8, C.shell], [12, 8, C.shellD],
    [4, 9, C.shellD], [5, 9, C.shellD], [6, 9, C.shell], [7, 9, C.shell], [8, 9, C.shell], [9, 9, C.shell], [10, 9, C.shellD], [11, 9, C.shellD],

    [4, 7, C.cheek], [11, 7, C.cheek],
    [7, 8, C.mouth], [8, 8, C.mouth],

    // Claws
    [1, 6, C.claw], [2, 6, C.claw],
    [0, 7, C.clawD], [1, 7, C.claw], [2, 7, C.body],
    [1, 8, C.clawD], [2, 8, C.claw],
    [13, 6, C.claw], [14, 6, C.claw],
    [13, 7, C.body], [14, 7, C.claw], [15, 7, C.clawD],
    [13, 8, C.claw], [14, 8, C.clawD],

    // Legs
    [3, 10, C.leg], [4, 11, C.leg],
    [5, 10, C.leg], [5, 11, C.leg],
    [10, 10, C.leg], [10, 11, C.leg],
    [12, 10, C.leg], [11, 11, C.leg],
  ];

  return pixelsToBoxShadow(pixels);
}

function generateWaveFrame(waveUp: boolean): string {
  const pixels: [number, number, string][] = [
    // Eye stalks
    [5, 2, C.bodyL], [10, 2, C.bodyL],
    [5, 3, C.body],  [10, 3, C.body],

    // Eyes (happy when waving)
    [4, 3, C.eye], [5, 3, C.eye], [6, 3, C.eye],
    [9, 3, C.eye], [10, 3, C.eye], [11, 3, C.eye],
    [4, 4, C.eye], [5, 4, C.pupil], [6, 4, C.eye],
    [9, 4, C.eye], [10, 4, C.pupil], [11, 4, C.eye],

    // Shell
    [5, 5, C.shellL], [6, 5, C.shellL], [7, 5, C.shellL], [8, 5, C.shellL], [9, 5, C.shellL], [10, 5, C.shellL],
    [4, 6, C.shell], [5, 6, C.shellL], [6, 6, C.shell], [7, 6, C.shellL], [8, 6, C.shell], [9, 6, C.shellL], [10, 6, C.shell], [11, 6, C.shell],
    [3, 7, C.shell], [4, 7, C.shell], [5, 7, C.shell], [6, 7, C.shellL], [7, 7, C.shell], [8, 7, C.shellL], [9, 7, C.shell], [10, 7, C.shell], [11, 7, C.shell], [12, 7, C.shell],
    [3, 8, C.shellD], [4, 8, C.shell], [5, 8, C.shell], [6, 8, C.shell], [7, 8, C.shell], [8, 8, C.shell], [9, 8, C.shell], [10, 8, C.shell], [11, 8, C.shell], [12, 8, C.shellD],
    [4, 9, C.shellD], [5, 9, C.shellD], [6, 9, C.shell], [7, 9, C.shell], [8, 9, C.shell], [9, 9, C.shell], [10, 9, C.shellD], [11, 9, C.shellD],

    [4, 7, C.cheek], [11, 7, C.cheek],
    [7, 8, C.mouth], [8, 8, C.mouth],

    // Left claw (normal)
    [1, 6, C.claw], [2, 6, C.claw],
    [0, 7, C.clawD], [1, 7, C.claw], [2, 7, C.body],
    [1, 8, C.clawD], [2, 8, C.claw],

    // Right claw WAVING (up or mid)
    ...(waveUp ? [
      [14, 3, C.claw] as [number, number, string], [15, 3, C.claw] as [number, number, string],
      [13, 4, C.body] as [number, number, string], [14, 4, C.claw] as [number, number, string], [15, 4, C.clawD] as [number, number, string],
      [13, 5, C.claw] as [number, number, string], [14, 5, C.clawD] as [number, number, string],
    ] : [
      [14, 4, C.claw] as [number, number, string], [15, 4, C.claw] as [number, number, string],
      [13, 5, C.body] as [number, number, string], [14, 5, C.claw] as [number, number, string], [15, 5, C.clawD] as [number, number, string],
      [13, 6, C.claw] as [number, number, string], [14, 6, C.clawD] as [number, number, string],
    ]),

    // Legs
    [3, 10, C.leg], [4, 11, C.leg],
    [5, 10, C.leg], [5, 11, C.leg],
    [10, 10, C.leg], [10, 11, C.leg],
    [12, 10, C.leg], [11, 11, C.leg],
  ];

  return pixelsToBoxShadow(pixels);
}

function generateWalkFrame(step: number): string {
  const legOffset = step % 2 === 0;

  const pixels: [number, number, string][] = [
    // Eye stalks
    [5, 2, C.bodyL], [10, 2, C.bodyL],
    [5, 3, C.body],  [10, 3, C.body],

    // Eyes
    [4, 3, C.eye], [5, 3, C.eye], [6, 3, C.eye],
    [9, 3, C.eye], [10, 3, C.eye], [11, 3, C.eye],
    [4, 4, C.eye], [5, 4, C.pupil], [6, 4, C.eye],
    [9, 4, C.eye], [10, 4, C.pupil], [11, 4, C.eye],

    // Shell
    [5, 5, C.shellL], [6, 5, C.shellL], [7, 5, C.shellL], [8, 5, C.shellL], [9, 5, C.shellL], [10, 5, C.shellL],
    [4, 6, C.shell], [5, 6, C.shellL], [6, 6, C.shell], [7, 6, C.shellL], [8, 6, C.shell], [9, 6, C.shellL], [10, 6, C.shell], [11, 6, C.shell],
    [3, 7, C.shell], [4, 7, C.shell], [5, 7, C.shell], [6, 7, C.shellL], [7, 7, C.shell], [8, 7, C.shellL], [9, 7, C.shell], [10, 7, C.shell], [11, 7, C.shell], [12, 7, C.shell],
    [3, 8, C.shellD], [4, 8, C.shell], [5, 8, C.shell], [6, 8, C.shell], [7, 8, C.shell], [8, 8, C.shell], [9, 8, C.shell], [10, 8, C.shell], [11, 8, C.shell], [12, 8, C.shellD],
    [4, 9, C.shellD], [5, 9, C.shellD], [6, 9, C.shell], [7, 9, C.shell], [8, 9, C.shell], [9, 9, C.shell], [10, 9, C.shellD], [11, 9, C.shellD],

    [4, 7, C.cheek], [11, 7, C.cheek],
    [7, 8, C.mouth], [8, 8, C.mouth],

    // Claws (slight bounce)
    [1, 6, C.claw], [2, 6, C.claw],
    [0, 7, C.clawD], [1, 7, C.claw], [2, 7, C.body],
    [1, 8, C.clawD], [2, 8, C.claw],
    [13, 6, C.claw], [14, 6, C.claw],
    [13, 7, C.body], [14, 7, C.claw], [15, 7, C.clawD],
    [13, 8, C.claw], [14, 8, C.clawD],

    // Legs — alternating walk animation
    ...(legOffset ? [
      [3, 10, C.leg] as [number, number, string], [3, 11, C.leg] as [number, number, string],
      [5, 10, C.leg] as [number, number, string], [6, 11, C.leg] as [number, number, string],
      [10, 10, C.leg] as [number, number, string], [9, 11, C.leg] as [number, number, string],
      [12, 10, C.leg] as [number, number, string], [12, 11, C.leg] as [number, number, string],
    ] : [
      [4, 10, C.leg] as [number, number, string], [4, 11, C.leg] as [number, number, string],
      [6, 10, C.leg] as [number, number, string], [5, 11, C.leg] as [number, number, string],
      [9, 10, C.leg] as [number, number, string], [10, 11, C.leg] as [number, number, string],
      [11, 10, C.leg] as [number, number, string], [11, 11, C.leg] as [number, number, string],
    ]),
  ];

  return pixelsToBoxShadow(pixels);
}

function pixelsToBoxShadow(pixels: [number, number, string][]): string {
  return pixels
    .map(([x, y, color]) => `${x}px ${y}px 0 0 ${color}`)
    .join(", ");
}

// Animation states
type AnimState = "idle" | "blink" | "wave" | "walk";

interface AnimFrame {
  state: AnimState;
  subFrame: number;
  duration: number; // ms
}

// Full animation sequence
const ANIM_SEQUENCE: AnimFrame[] = [
  // Idle
  { state: "idle", subFrame: 0, duration: 400 },
  { state: "idle", subFrame: 1, duration: 400 },
  { state: "idle", subFrame: 2, duration: 400 },
  // Blink
  { state: "blink", subFrame: 0, duration: 100 },
  { state: "idle", subFrame: 3, duration: 200 },
  // Idle
  { state: "idle", subFrame: 4, duration: 500 },
  { state: "idle", subFrame: 5, duration: 400 },
  // Wave
  { state: "wave", subFrame: 0, duration: 250 },
  { state: "wave", subFrame: 1, duration: 250 },
  { state: "wave", subFrame: 0, duration: 250 },
  { state: "wave", subFrame: 1, duration: 250 },
  { state: "wave", subFrame: 0, duration: 250 },
  // Idle
  { state: "idle", subFrame: 6, duration: 500 },
  // Blink
  { state: "blink", subFrame: 0, duration: 80 },
  { state: "idle", subFrame: 7, duration: 150 },
  // Walk
  { state: "walk", subFrame: 0, duration: 180 },
  { state: "walk", subFrame: 1, duration: 180 },
  { state: "walk", subFrame: 0, duration: 180 },
  { state: "walk", subFrame: 1, duration: 180 },
  { state: "walk", subFrame: 0, duration: 180 },
  { state: "walk", subFrame: 1, duration: 180 },
  // Idle
  { state: "idle", subFrame: 8, duration: 600 },
  { state: "idle", subFrame: 9, duration: 400 },
  // Blink
  { state: "blink", subFrame: 0, duration: 90 },
  { state: "idle", subFrame: 10, duration: 300 },
  { state: "idle", subFrame: 11, duration: 800 },
];

function getBoxShadow(frame: AnimFrame): string {
  switch (frame.state) {
    case "idle":
      return generateIdleFrame(frame.subFrame);
    case "blink":
      return generateBlinkFrame();
    case "wave":
      return generateWaveFrame(frame.subFrame === 0);
    case "walk":
      return generateWalkFrame(frame.subFrame);
    default:
      return generateIdleFrame(0);
  }
}

interface PixelCrabProps {
  size?: number;
  className?: string;
  loading?: boolean; // slower animation for loading state
}

export function PixelCrab({ size = 8, className = "", loading = false }: PixelCrabProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let glitchTimeout: NodeJS.Timeout;

    function nextFrame() {
      setFrameIdx(prev => {
        const next = (prev + 1) % ANIM_SEQUENCE.length;
        const duration = loading
          ? ANIM_SEQUENCE[next].duration * 1.5
          : ANIM_SEQUENCE[next].duration;
        timeout = setTimeout(nextFrame, duration);
        return next;
      });
    }

    timeout = setTimeout(nextFrame, ANIM_SEQUENCE[0].duration);

    // Random glitch effect
    function triggerGlitch() {
      const delay = 3000 + Math.random() * 5000;
      glitchTimeout = setTimeout(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100 + Math.random() * 150);
        triggerGlitch();
      }, delay);
    }
    triggerGlitch();

    return () => {
      clearTimeout(timeout);
      clearTimeout(glitchTimeout);
    };
  }, [loading]);

  const frame = ANIM_SEQUENCE[frameIdx];
  const boxShadow = getBoxShadow(frame);
  const walkOffset = frame.state === "walk"
    ? (frame.subFrame === 0 ? -1 : 1)
    : 0;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        width: 16 * size,
        height: 12 * size,
        imageRendering: "pixelated",
      }}
    >
      {/* Glow behind crab */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 16 * size * 1.5,
          height: 12 * size * 1.5,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(224,137,137,0.15) 0%, transparent 70%)",
          animation: "pulse-glow 3s ease-in-out infinite",
        }}
      />

      {/* The pixel crab — single div with box-shadow pixels */}
      <div
        style={{
          width: size,
          height: size,
          position: "absolute",
          left: `calc(50% - ${8 * size}px + ${walkOffset * size}px)`,
          top: `calc(50% - ${6 * size}px)`,
          boxShadow: boxShadow
            .split(", ")
            .map(s => {
              const parts = s.split(" ");
              const x = parseInt(parts[0]) * size;
              const y = parseInt(parts[1]) * size;
              return `${x}px ${y}px 0 ${size * 0.5}px ${parts[parts.length - 1]}`;
            })
            .join(", "),
          background: "transparent",
          transition: "box-shadow 0.08s ease",
          filter: glitch
            ? `hue-rotate(${Math.random() * 30 - 15}deg) brightness(1.3)`
            : "none",
          transform: glitch
            ? `translateX(${Math.random() * 4 - 2}px)`
            : "none",
        }}
      />

      {/* Glitch scan line */}
      {glitch && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${Math.random() * 100}%`,
            height: size,
            background: "rgba(224,137,137,0.3)",
            mixBlendMode: "screen",
          }}
        />
      )}
    </div>
  );
}
