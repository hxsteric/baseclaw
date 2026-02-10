"use client";

export function Header({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <header className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl">
      {onBack && (
        <button
          onClick={onBack}
          className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1 -ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2.5">
        <div className="h-5 w-5 rounded-md bg-[var(--accent)] flex items-center justify-center">
          <span className="text-[9px] font-bold text-black" style={{ fontFamily: "var(--font-display)" }}>B</span>
        </div>
        <h1 className="text-code text-xs text-[var(--text-secondary)]">{title || "baseclaw"}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-code text-[9px] text-[var(--text-ghost)]">live</span>
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse-glow" />
      </div>
    </header>
  );
}
