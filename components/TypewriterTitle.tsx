"use client";

import { useState, useEffect, useCallback } from "react";

/*
  TypewriterTitle — "Baseclaw" with typewriter effect

  - Types out slowly
  - Holds for 3 seconds
  - Deletes character by character
  - Waits 0.5 seconds
  - Loops forever
  - Bold, white, Grange-style font
  - Blinking cursor
*/

const TEXT = "Baseclaw";
const TYPE_SPEED = 120; // ms per character typing
const DELETE_SPEED = 80; // ms per character deleting
const HOLD_DURATION = 3000; // 3 seconds hold after typing
const PAUSE_AFTER_DELETE = 500; // 0.5 seconds pause after deleting

export function TypewriterTitle() {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  /* Cursor blink */
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  /* Typewriter loop */
  const tick = useCallback(() => {
    if (!isDeleting) {
      // Typing
      if (displayText.length < TEXT.length) {
        return {
          next: displayText + TEXT[displayText.length],
          deleting: false,
          delay: TYPE_SPEED,
        };
      } else {
        // Fully typed — hold then start deleting
        return {
          next: displayText,
          deleting: true,
          delay: HOLD_DURATION,
        };
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        return {
          next: displayText.slice(0, -1),
          deleting: true,
          delay: DELETE_SPEED,
        };
      } else {
        // Fully deleted — pause then start typing
        return {
          next: "",
          deleting: false,
          delay: PAUSE_AFTER_DELETE,
        };
      }
    }
  }, [displayText, isDeleting]);

  useEffect(() => {
    const { next, deleting, delay } = tick();
    const timeout = setTimeout(() => {
      setDisplayText(next);
      setIsDeleting(deleting);
    }, delay);
    return () => clearTimeout(timeout);
  }, [tick]);

  return (
    <div className="flex items-center justify-center w-full">
      <h1
        className="typewriter-title"
        style={{
          fontSize: "clamp(48px, 10vw, 96px)",
          fontWeight: 800,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          fontFamily: "var(--font-title), 'Space Grotesk', 'Inter', system-ui, sans-serif",
          minHeight: "1.2em",
          textAlign: "center",
        }}
      >
        {displayText}
        <span
          style={{
            display: "inline-block",
            width: "3px",
            height: "0.85em",
            backgroundColor: "#e8796e",
            marginLeft: "4px",
            verticalAlign: "baseline",
            opacity: showCursor ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />
      </h1>
    </div>
  );
}
