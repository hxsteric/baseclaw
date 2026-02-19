"use client";

import { useEffect, useState, useRef } from "react";

interface ScrambleTextProps {
  text: string;
  className?: string;
  once?: boolean;
}

/**
 * Scramble text reveal effect — characters randomize then resolve
 * into the target string. Triggers when element scrolls into view.
 */
export function ScrambleText({ text, className = "", once = true }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const hasPlayed = useRef(false);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./:\\>";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasPlayed.current)) {
          hasPlayed.current = true;
          let iteration = 0;
          const interval = setInterval(() => {
            setDisplay(
              text
                .split("")
                .map((char, i) => {
                  if (char === " ") return " ";
                  if (i < iteration) return text[i];
                  return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("")
            );
            iteration += 0.5;
            if (iteration >= text.length) {
              setDisplay(text);
              clearInterval(interval);
            }
          }, 30);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [text, once]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
