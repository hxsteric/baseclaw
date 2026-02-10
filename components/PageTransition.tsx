"use client";

import { useEffect, useState, ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  pageKey: string;
  direction?: "forward" | "backward";
}

export function PageTransition({ children, pageKey, direction = "forward" }: PageTransitionProps) {
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [displayedKey, setDisplayedKey] = useState(pageKey);
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");

  useEffect(() => {
    if (pageKey !== displayedKey) {
      // New page incoming — exit current
      setPhase("exit");
      const timer = setTimeout(() => {
        setDisplayedChildren(children);
        setDisplayedKey(pageKey);
        setPhase("enter");
      }, 280);
      return () => clearTimeout(timer);
    } else {
      setDisplayedChildren(children);
    }
  }, [pageKey, children, displayedKey]);

  useEffect(() => {
    if (phase === "enter") {
      const timer = setTimeout(() => setPhase("idle"), 20);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const isForward = direction === "forward";

  const exitTransform = isForward ? "translateX(-6%) scale(0.97)" : "translateX(6%) scale(0.97)";
  const enterFromTransform = isForward ? "translateX(6%) scale(0.97)" : "translateX(-6%) scale(0.97)";

  let style: React.CSSProperties = {
    transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  if (phase === "exit") {
    style = {
      ...style,
      opacity: 0,
      transform: exitTransform,
      filter: "blur(4px)",
    };
  } else if (phase === "enter") {
    style = {
      ...style,
      opacity: 0,
      transform: enterFromTransform,
      filter: "blur(4px)",
      transition: "none",
    };
  } else {
    style = {
      ...style,
      opacity: 1,
      transform: "translateX(0) scale(1)",
      filter: "blur(0px)",
    };
  }

  return (
    <div style={style} className="w-full h-full">
      {displayedChildren}
    </div>
  );
}
