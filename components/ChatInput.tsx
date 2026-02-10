"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [text]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2.5 px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/60 backdrop-blur-xl"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message baseclaw..."
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl glass px-4 py-2.5 text-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(224,137,137,0.3)] transition-all disabled:opacity-40 bg-transparent"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="btn-cute-primary h-10 w-10 !rounded-xl flex items-center justify-center flex-shrink-0"
      >
        <svg className="relative z-10" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
