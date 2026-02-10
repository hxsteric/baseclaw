"use client";

import { clsx } from "clsx";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex gap-3 px-5 py-1.5", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={clsx(
          "h-6 w-6 rounded-lg flex-shrink-0 flex items-center justify-center",
          isUser
            ? "glass text-[var(--indigo)]"
            : "bg-[var(--rose-dim)] text-[var(--rose)] border border-[var(--rose-dim)]"
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="text-[9px] font-bold relative z-10">{isUser ? "U" : "B"}</span>
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          "max-w-[78%] rounded-2xl px-4 py-3",
          isUser
            ? "glass-button-indigo rounded-tr-lg"
            : "glass rounded-tl-lg"
        )}
      >
        <p className="text-body text-[13px] whitespace-pre-wrap break-words leading-relaxed relative z-10 text-[var(--text-primary)]">{message.content}</p>
        {message.streaming && (
          <span className="inline-block ml-0.5 w-[2px] h-[14px] bg-[var(--rose)] animate-blink align-text-bottom" />
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 px-5 py-1.5">
      <div className="h-6 w-6 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--rose-dim)] text-[var(--rose)] border border-[var(--rose-dim)]">
        <span className="text-[9px] font-bold" style={{ fontFamily: "var(--font-display)" }}>B</span>
      </div>
      <div className="glass rounded-2xl rounded-tl-lg px-4 py-3 flex items-center gap-1.5">
        <div className="h-1 w-1 rounded-full bg-[var(--text-muted)] typing-dot" />
        <div className="h-1 w-1 rounded-full bg-[var(--text-muted)] typing-dot" />
        <div className="h-1 w-1 rounded-full bg-[var(--text-muted)] typing-dot" />
      </div>
    </div>
  );
}
