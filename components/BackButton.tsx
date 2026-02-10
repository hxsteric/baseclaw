"use client";

/*
  Floating back button — clean circle with left arrow.
  Fixed position, mobile-friendly touch target.
  Matches our dark pastel design system.
*/

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-50 group flex items-center gap-2.5"
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      aria-label={label || "Go back"}
    >
      {/* Circle with arrow */}
      <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full btn-cute flex items-center justify-center !border-[rgba(255,255,255,0.1)] group-hover:!border-[rgba(224,137,137,0.3)]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </div>

      {/* Optional label — only visible on hover / larger screens */}
      {label && (
        <span className="hidden sm:block text-code text-[11px] text-[var(--text-ghost)] group-hover:text-[var(--text-muted)] transition-colors duration-300">
          {label}
        </span>
      )}
    </button>
  );
}
