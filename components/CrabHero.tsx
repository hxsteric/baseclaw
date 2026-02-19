"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PixelCrab } from "./PixelCrab";

/*
  CrabHero — Floating 3D Crab Aquarium Background

  - Straight-line drift, bouncing off screen edges
  - Soft cushioned bounce with squish on impact
  - Smooth glide, no bobbing
  - Slow gentle banking into direction (no flips)
  - Medium speed (~15-20s to cross screen)
  - ~300px on desktop, ~180px on mobile
  - Behind all content (z-index 0)
  - Minimal — just a soft shadow underneath
  - Pure rAF physics loop for 60fps
*/

function getCrabSize() {
  if (typeof window === "undefined") return 300;
  return window.innerWidth < 640 ? 180 : 300;
}

const SPEED = 1.6; // px per frame at 60fps

export function CrabHero() {
  const crabRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const state = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    bankX: 0,
    bankY: 0,
    squishX: 1,
    squishY: 1,
    squishRecovery: 0,
    crabSize: 300,
    entered: false,
  });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const initPhysics = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = state.current;
    s.crabSize = getCrabSize();

    s.x = Math.random() * (vw - s.crabSize);
    s.y = Math.random() * (vh - s.crabSize);

    // Random diagonal direction
    const angle = (Math.random() * 0.8 + 0.1) * Math.PI * 0.5 +
      (Math.floor(Math.random() * 4) * Math.PI) / 2;
    s.vx = Math.cos(angle) * SPEED;
    s.vy = Math.sin(angle) * SPEED;
    s.entered = true;
  }, []);

  const animate = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;

      const s = state.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dt = delta / 16.667;

      if (!s.entered) initPhysics();

      // Recalc size on resize
      const newSize = getCrabSize();
      if (newSize !== s.crabSize) {
        s.crabSize = newSize;
        // Clamp position
        s.x = Math.min(s.x, vw - s.crabSize);
        s.y = Math.min(s.y, vh - s.crabSize);
      }

      /* ── Move ── */
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      /* ── Bounce with squish ── */
      if (s.x + s.crabSize > vw) {
        s.x = vw - s.crabSize;
        s.vx = -Math.abs(s.vx);
        s.squishX = 0.84;
        s.squishY = 1.10;
        s.squishRecovery = 1;
      }
      if (s.x < 0) {
        s.x = 0;
        s.vx = Math.abs(s.vx);
        s.squishX = 0.84;
        s.squishY = 1.10;
        s.squishRecovery = 1;
      }
      if (s.y + s.crabSize > vh) {
        s.y = vh - s.crabSize;
        s.vy = -Math.abs(s.vy);
        s.squishY = 0.84;
        s.squishX = 1.10;
        s.squishRecovery = 1;
      }
      if (s.y < 0) {
        s.y = 0;
        s.vy = Math.abs(s.vy);
        s.squishY = 0.84;
        s.squishX = 1.10;
        s.squishRecovery = 1;
      }

      /* ── Squish recovery (elastic spring) ── */
      if (s.squishRecovery > 0) {
        s.squishRecovery -= 0.025 * dt;
        if (s.squishRecovery <= 0) {
          s.squishRecovery = 0;
          s.squishX = 1;
          s.squishY = 1;
        } else {
          const t = 1 - s.squishRecovery;
          const elastic = 1 + Math.sin(t * Math.PI * 2.5) * (1 - t) * 0.12;
          s.squishX = 1 + (s.squishX - 1) * s.squishRecovery * elastic;
          s.squishY = 1 + (s.squishY - 1) * s.squishRecovery * elastic;
        }
      }

      /* ── Slow gentle banking (very subtle 3D tilt) ── */
      const targetBankY = (s.vx / SPEED) * 8; // max ±8deg — very gentle
      const targetBankX = (-s.vy / SPEED) * 4; // max ±4deg

      // Very slow interpolation for smooth, barely-noticeable tilting
      s.bankY += (targetBankY - s.bankY) * 0.015 * dt;
      s.bankX += (targetBankX - s.bankX) * 0.015 * dt;

      /* ── Apply ── */
      if (crabRef.current) {
        crabRef.current.style.transform = `
          translate3d(${s.x}px, ${s.y}px, 0)
          rotateX(${s.bankX}deg)
          rotateY(${s.bankY}deg)
          scaleX(${s.squishX})
          scaleY(${s.squishY})
        `;
      }

      if (shadowRef.current) {
        shadowRef.current.style.transform = `
          translate3d(${s.x + s.crabSize * 0.15}px, ${s.y + s.crabSize * 0.85}px, 0)
          scaleX(${0.7 * s.squishX})
          scaleY(${0.25 * s.squishY})
        `;
        const distFromBottom = vh - (s.y + s.crabSize);
        const shadowOpacity = Math.max(0.04, Math.min(0.2, 0.2 - (distFromBottom / vh) * 0.16));
        shadowRef.current.style.opacity = String(shadowOpacity);
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [initPhysics]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {
        // Video can't play at all — fall back to PixelCrab
        setVideoFailed(true);
        setVideoReady(true);
      });
    });

    // Timeout fallback: if video hasn't loaded after 3s, show PixelCrab
    const timeout = setTimeout(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        setVideoFailed(true);
        setVideoReady(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {/* Shadow */}
      <div
        ref={shadowRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: getCrabSize() * 0.7,
          height: getCrabSize() * 0.25,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.06) 50%, transparent 80%)",
          filter: "blur(10px)",
          pointerEvents: "none",
          willChange: "transform, opacity",
          zIndex: 0,
          opacity: 0,
        }}
      />

      {/* Floating crab */}
      <div
        ref={crabRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: getCrabSize(),
          height: getCrabSize(),
          pointerEvents: "none",
          willChange: "transform",
          zIndex: 0,
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.8s ease-out",
        }}
      >
        {videoFailed ? (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <PixelCrab size={getCrabSize() < 200 ? 10 : 16} />
          </div>
        ) : (
          <video
            ref={videoRef}
            src="/crab-v2.webm"
            autoPlay
            loop
            muted
            playsInline
            onCanPlayThrough={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
            onError={() => {
              setVideoFailed(true);
              setVideoReady(true);
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "contrast(1.05) saturate(1.08) brightness(1.02)",
            }}
          />
        )}
      </div>
    </>
  );
}
