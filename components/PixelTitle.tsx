"use client";

import { useState, useEffect } from "react";

/*
  PixelTitle — Retro pixel-style "BASECLAW" text.
  Uses CSS pixel rendering with glitch/shimmer effects.
  Responsive: scales with viewport.
*/

// 5x7 pixel font for each letter
const PIXEL_FONT: Record<string, number[][]> = {
  B: [
    [1,1,1,0],
    [1,0,0,1],
    [1,1,1,0],
    [1,0,0,1],
    [1,0,0,1],
    [1,1,1,0],
    [0,0,0,0],
  ],
  A: [
    [0,1,1,0],
    [1,0,0,1],
    [1,0,0,1],
    [1,1,1,1],
    [1,0,0,1],
    [1,0,0,1],
    [0,0,0,0],
  ],
  S: [
    [0,1,1,1],
    [1,0,0,0],
    [0,1,1,0],
    [0,0,0,1],
    [0,0,0,1],
    [1,1,1,0],
    [0,0,0,0],
  ],
  E: [
    [1,1,1,1],
    [1,0,0,0],
    [1,1,1,0],
    [1,0,0,0],
    [1,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
  ],
  C: [
    [0,1,1,1],
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
    [0,1,1,1],
    [0,0,0,0],
  ],
  L: [
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
  ],
  W: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,1,0,1,1],
    [1,0,0,0,1],
    [0,0,0,0,0],
  ],
};

function textToPixels(text: string): [number, number][] {
  const pixels: [number, number][] = [];
  let offsetX = 0;

  for (const char of text) {
    const glyph = PIXEL_FONT[char];
    if (!glyph) { offsetX += 3; continue; }

    for (let y = 0; y < glyph.length; y++) {
      for (let x = 0; x < glyph[y].length; x++) {
        if (glyph[y][x]) {
          pixels.push([offsetX + x, y]);
        }
      }
    }
    offsetX += glyph[0].length + 1; // letter spacing
  }

  return pixels;
}

interface PixelTitleProps {
  text?: string;
  pixelSize?: number;
  className?: string;
}

export function PixelTitle({ text = "BASECLAW", pixelSize = 6, className = "" }: PixelTitleProps) {
  const [glitchTick, setGlitchTick] = useState(0);
  const [shimmerPos, setShimmerPos] = useState(-5);

  useEffect(() => {
    // Shimmer sweep
    const shimmerInterval = setInterval(() => {
      setShimmerPos(prev => {
        if (prev > 45) return -5;
        return prev + 1;
      });
    }, 60);

    // Random glitch
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        setGlitchTick(prev => prev + 1);
      }
    }, 200);

    return () => {
      clearInterval(shimmerInterval);
      clearInterval(glitchInterval);
    };
  }, []);

  const pixels = textToPixels(text);
  const totalWidth = text === "BASECLAW" ? 40 : 30;
  const totalHeight = 7;

  // Generate box-shadow for all pixels with color effects
  const boxShadowParts = pixels.map(([x, y]) => {
    const distFromShimmer = Math.abs(x - shimmerPos);
    let color: string;

    if (distFromShimmer < 3) {
      // Shimmer highlight
      const brightness = 1 - distFromShimmer / 3;
      const r = Math.round(242 + brightness * 13);
      const g = Math.round(200 + brightness * 55);
      const b = Math.round(200 + brightness * 55);
      color = `rgb(${Math.min(r, 255)}, ${Math.min(g, 255)}, ${Math.min(b, 255)})`;
    } else {
      // Rose gradient from left to right
      const t = x / totalWidth;
      const r = Math.round(224 - t * 40);
      const g = Math.round(137 - t * 20);
      const b = Math.round(137 + t * 60);
      color = `rgb(${r}, ${g}, ${b})`;
    }

    // Apply glitch — random pixel displacement
    let gx = x * pixelSize;
    let gy = y * pixelSize;
    if (glitchTick > 0 && Math.random() < 0.03) {
      gx += Math.round((Math.random() - 0.5) * pixelSize * 3);
    }

    return `${gx}px ${gy}px 0 ${pixelSize * 0.5}px ${color}`;
  });

  return (
    <div
      className={`relative flex justify-center ${className}`}
      style={{
        width: "100%",
        height: totalHeight * pixelSize + pixelSize,
        imageRendering: "pixelated",
      }}
    >
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          position: "relative",
          left: `calc(50% - ${(totalWidth * pixelSize) / 2}px)`,
          boxShadow: boxShadowParts.join(", "),
          background: "transparent",
          transition: "box-shadow 0.05s linear",
        }}
      />

      {/* Subtle glow under text */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -pixelSize * 2,
          left: "50%",
          transform: "translateX(-50%)",
          width: totalWidth * pixelSize * 0.8,
          height: pixelSize * 4,
          background: "radial-gradient(ellipse, rgba(224,137,137,0.12) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}
