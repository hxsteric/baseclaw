"use client";

import { useEffect, useRef, useState } from "react";

/* ===========================================
   DVD-screensaver bouncing crabs
   5 crabs at ~75% opacity that bounce off
   the edges of the page.
   =========================================== */

interface CrabState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  flipped: boolean;
  rotation: number;
}

function CrabSVG({ size, flipped, rotation }: { size: number; flipped: boolean; rotation: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `${flipped ? "scaleX(-1)" : ""} rotate(${rotation}deg)`,
        opacity: 0.75,
      }}
    >
      {/* Body */}
      <ellipse cx="32" cy="36" rx="14" ry="10" fill="var(--rose)" opacity="0.85" />
      {/* Shell */}
      <ellipse cx="32" cy="34" rx="10" ry="7" fill="var(--rose)" opacity="0.5" />
      {/* Shell ridges */}
      <path d="M24 33 Q32 28 40 33" stroke="var(--rose)" strokeWidth="0.8" fill="none" opacity="0.35" />
      <path d="M26 36 Q32 31 38 36" stroke="var(--rose)" strokeWidth="0.6" fill="none" opacity="0.25" />
      {/* Eyes */}
      <circle cx="27" cy="28" r="2.5" fill="var(--text-primary)" opacity="0.9" />
      <circle cx="37" cy="28" r="2.5" fill="var(--text-primary)" opacity="0.9" />
      <circle cx="27.5" cy="27.5" r="1.2" fill="var(--bg-primary)" />
      <circle cx="37.5" cy="27.5" r="1.2" fill="var(--bg-primary)" />
      {/* Eye stalks */}
      <line x1="27" y1="28" x2="25" y2="22" stroke="var(--rose)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      <line x1="37" y1="28" x2="39" y2="22" stroke="var(--rose)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      {/* Left claw */}
      <path d="M18 34C14 30 10 32 8 35C6 38 10 40 14 38L18 36" stroke="var(--rose)" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      {/* Right claw */}
      <path d="M46 34C50 30 54 32 56 35C58 38 54 40 50 38L46 36" stroke="var(--rose)" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      {/* Legs */}
      <line x1="20" y1="40" x2="14" y2="48" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <line x1="22" y1="42" x2="16" y2="50" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <line x1="24" y1="43" x2="19" y2="51" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <line x1="44" y1="40" x2="50" y2="48" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <line x1="42" y1="42" x2="48" y2="50" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <line x1="40" y1="43" x2="45" y2="51" stroke="var(--rose)" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

const CRAB_COUNT = 5;
const SIZES = [110, 95, 85, 100, 78];

function randomSpeed() {
  const speed = 0.4 + Math.random() * 0.6;
  return Math.random() > 0.5 ? speed : -speed;
}

export function FloatingCreatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const crabsRef = useRef<CrabState[]>([]);
  const crabElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<number>(0);
  const [initialCrabs, setInitialCrabs] = useState<CrabState[]>([]);

  // Initialize crabs once
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const initial: CrabState[] = [];
    for (let i = 0; i < CRAB_COUNT; i++) {
      const size = SIZES[i];
      initial.push({
        x: Math.random() * (w - size),
        y: Math.random() * (h - size),
        vx: randomSpeed(),
        vy: randomSpeed(),
        size,
        flipped: Math.random() > 0.5,
        rotation: 0,
      });
    }
    crabsRef.current = initial;
    setInitialCrabs([...initial]);
  }, []);

  // Animation loop — direct DOM updates, no React re-renders
  useEffect(() => {
    if (initialCrabs.length === 0) return;

    let lastTime = performance.now();

    function animate(now: number) {
      const delta = Math.min(now - lastTime, 32);
      lastTime = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      crabsRef.current.forEach((crab, i) => {
        crab.x += crab.vx * delta * 0.06;
        crab.y += crab.vy * delta * 0.06;

        if (crab.x <= 0) {
          crab.x = 0;
          crab.vx = Math.abs(crab.vx);
          crab.flipped = !crab.flipped;
          crab.rotation = (Math.random() - 0.5) * 15;
        } else if (crab.x >= w - crab.size) {
          crab.x = w - crab.size;
          crab.vx = -Math.abs(crab.vx);
          crab.flipped = !crab.flipped;
          crab.rotation = (Math.random() - 0.5) * 15;
        }

        if (crab.y <= 0) {
          crab.y = 0;
          crab.vy = Math.abs(crab.vy);
          crab.rotation = (Math.random() - 0.5) * 15;
        } else if (crab.y >= h - crab.size) {
          crab.y = h - crab.size;
          crab.vy = -Math.abs(crab.vy);
          crab.rotation = (Math.random() - 0.5) * 15;
        }

        crab.rotation *= 0.995;

        // Direct DOM update — no React re-render
        const el = crabElsRef.current[i];
        if (el) {
          el.style.transform = `translate3d(${crab.x}px, ${crab.y}px, 0)`;
          const svg = el.firstChild as SVGElement | null;
          if (svg) {
            svg.style.transform = `${crab.flipped ? "scaleX(-1)" : ""} rotate(${crab.rotation}deg)`;
          }
        }
      });

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [initialCrabs]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {initialCrabs.map((crab, i) => (
        <div
          key={i}
          ref={(el) => { crabElsRef.current[i] = el; }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${crab.x}px, ${crab.y}px, 0)`,
            willChange: "transform",
          }}
        >
          <CrabSVG size={crab.size} flipped={crab.flipped} rotation={crab.rotation} />
        </div>
      ))}
    </div>
  );
}
