"use client";

/*
  BASECLAW hero text with animated gradient fill.
  Responsive — uses clamp() for mobile.
*/

interface TextVideoMaskProps {
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  className?: string;
}

export function TextVideoMask({
  text = "BASECLAW",
  fontSize = 120,
  fontWeight = 900,
  letterSpacing = -4,
  className = "",
}: TextVideoMaskProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <h1
        className="text-shimmer select-none"
        style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontSize: `clamp(48px, 12vw, ${fontSize}px)`,
          fontWeight,
          letterSpacing: `${letterSpacing}px`,
          lineHeight: 0.95,
          textAlign: "center",
          background: "linear-gradient(90deg, var(--rose), var(--indigo), var(--rose), var(--indigo), var(--rose))",
          backgroundSize: "400% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 6s linear infinite",
        }}
      >
        {text}
      </h1>
    </div>
  );
}
