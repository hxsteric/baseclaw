"use client";

import React, { useRef, useEffect, useState } from "react";

/*
  ParticleTitle — "BASECLAW" rendered as interactive particles.
  Particles form the text, scatter on mouse/touch hover with a
  rose glow, then drift back into place.

  Adapted from v0.dev Vercel/AWS particle demo.
  Colors: white particles → pastel rose (#e08989) on scatter.
  Background: transparent (works over AquariumBg).
*/

interface ParticleTitleProps {
  className?: string;
}

export function ParticleTitle({ className = "" }: ParticleTitleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const isTouchingRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      setIsMobile(window.innerWidth < 768);
    };
    updateCanvasSize();

    let particles: {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      life: number;
    }[] = [];

    let textImageData: ImageData | null = null;

    function createTextImage() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw "BASECLAW" as one string — no per-char rendering to avoid alignment bugs
      const fontSize = isMobile ? 38 : 68;
      ctx.fillStyle = "white";
      ctx.font = `900 ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      // alphabetic baseline is most reliable — offset from center by ascent
      ctx.fillText("BASECLAW", canvas.width / 2, canvas.height / 2 + fontSize * 0.33);

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function createParticle() {
      if (!ctx || !canvas || !textImageData) return null;
      const data = textImageData.data;

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1.2 + 0.4,
            life: Math.random() * 200 + 100,
          };
        }
      }
      return null;
    }

    function createInitialParticles() {
      if (!canvas) return;
      // Scale particle count to canvas size
      const baseCount = isMobile ? 2500 : 5000;
      const scale = Math.sqrt(
        (canvas.width * canvas.height) / (1920 * 400)
      );
      const count = Math.floor(baseCount * Math.max(0.5, scale));

      for (let i = 0; i < count; i++) {
        const p = createParticle();
        if (p) particles.push(p);
      }
    }

    let animationFrameId: number;

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: mouseX, y: mouseY } = mousePositionRef.current;
      const maxDistance = isMobile ? 120 : 200;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (
          distance < maxDistance &&
          (isTouchingRef.current || !("ontouchstart" in window))
        ) {
          // Scatter away from mouse
          const force = (maxDistance - distance) / maxDistance;
          const angle = Math.atan2(dy, dx);
          const moveX = Math.cos(angle) * force * 50;
          const moveY = Math.sin(angle) * force * 50;
          p.x = p.baseX - moveX;
          p.y = p.baseY - moveY;

          // Rose color when scattered — intensity based on force
          const r = 224;
          const g = Math.floor(137 + (255 - 137) * (1 - force));
          const b = Math.floor(137 + (255 - 137) * (1 - force));
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.7 + force * 0.3})`;
        } else {
          // Drift back to base position
          p.x += (p.baseX - p.x) * 0.08;
          p.y += (p.baseY - p.y) * 0.08;

          // White when in place
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        }

        ctx.fillRect(p.x, p.y, p.size, p.size);

        p.life--;
        if (p.life <= 0) {
          const newP = createParticle();
          if (newP) {
            particles[i] = newP;
          } else {
            particles.splice(i, 1);
            i--;
          }
        }
      }

      // Maintain particle count
      const baseCount = isMobile ? 2500 : 5000;
      const scale = Math.sqrt(
        (canvas.width * canvas.height) / (1920 * 400)
      );
      const targetCount = Math.floor(baseCount * Math.max(0.5, scale));

      while (particles.length < targetCount) {
        const newP = createParticle();
        if (newP) particles.push(newP);
        else break;
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    // Wait for fonts to load before drawing text — prevents misaligned glyphs
    async function init() {
      await document.fonts.ready;
      createTextImage();
      createInitialParticles();
      animate();
    }
    init();

    // ── Event handlers ──

    const handleResize = async () => {
      updateCanvasSize();
      await document.fonts.ready;
      createTextImage();
      particles = [];
      createInitialParticles();
    };

    const handleMove = (x: number, y: number) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePositionRef.current = { x: x - rect.left, y: y - rect.top };
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = () => {
      isTouchingRef.current = true;
    };

    const handleTouchEnd = () => {
      isTouchingRef.current = false;
      mousePositionRef.current = { x: 0, y: 0 };
    };

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: 0, y: 0 };
      }
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{ height: isMobile ? "80px" : "120px" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        aria-label="Interactive particle text: BASECLAW"
      />
    </div>
  );
}
