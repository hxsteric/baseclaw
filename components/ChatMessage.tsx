"use client";

import { clsx } from "clsx";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// Parse tool steps from message content (Hermes format: 🔧 **toolName**: input)
function parseToolSteps(content: string): { text: string; tools: { name: string; input: string }[] } {
  const tools: { name: string; input: string }[] = [];
  const lines = content.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const toolMatch = line.match(/^🔧 \*\*(.+?)\*\*:\s*(.+)$/);
    const resultMatch = line.match(/^📊 Result received$/);
    if (toolMatch) {
      tools.push({ name: toolMatch[1], input: toolMatch[2] });
    } else if (resultMatch) {
      // Skip result lines — they're part of tool flow
    } else {
      textLines.push(line);
    }
  }

  return { text: textLines.join("\n").trim(), tools };
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const { text, tools } = isUser ? { text: message.content, tools: [] } : parseToolSteps(message.content);

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
        {/* Render images if present */}
        {message.images && message.images.length > 0 && (
          <div className="mb-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mimeType};base64,${img.data}`}
                alt="Uploaded"
                className="max-w-full max-h-48 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {/* Tool steps (Hermes agent actions) */}
        {tools.length > 0 && (
          <div className="mb-2 space-y-1">
            {tools.map((tool, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--text-muted)] bg-[rgba(255,255,255,0.03)] rounded-lg px-2 py-1.5 border border-[var(--border)]">
                <span className="text-amber-400 flex-shrink-0">🔧</span>
                <div>
                  <span className="text-[var(--text-secondary)] font-medium">{tool.name}</span>
                  <span className="text-[var(--text-ghost)] ml-1">{tool.input.slice(0, 100)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-body text-[13px] whitespace-pre-wrap break-words leading-relaxed relative z-10 text-[var(--text-primary)]">{text}</p>
        {message.streaming && (
          <span className="inline-block ml-0.5 w-[2px] h-[14px] bg-[var(--rose)] animate-blink align-text-bottom" />
        )}

        {/* TEE Attestation badge */}
        {message.attestation && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px]">
            <div className={clsx(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border",
              message.attestation.verified
                ? "bg-[rgba(16,185,129,0.1)] border-green-500/30 text-green-400"
                : "bg-[rgba(239,68,68,0.1)] border-red-500/30 text-red-400"
            )}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <span>{message.attestation.verified ? "TEE Verified" : "Unverified"}</span>
            </div>
            <span className="text-[var(--text-ghost)]">{message.attestation.teeProvider}</span>
          </div>
        )}

        {/* Powered by badge for assistant messages */}
        {!isUser && !message.streaming && tools.length > 0 && (
          <div className="mt-1.5 text-[8px] text-[var(--text-ghost)] opacity-60">
            Powered by Hermes Agent + OpenClaw
          </div>
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
