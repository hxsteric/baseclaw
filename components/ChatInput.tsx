"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ImageAttachment } from "@/lib/types";

interface ChatInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1920;

/** Resize image if too large, convert to base64 */
async function processImage(file: File): Promise<ImageAttachment | null> {
  if (file.size > MAX_IMAGE_SIZE) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Resize if needed
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type || "image/jpeg", 0.85);
        // Strip "data:image/...;base64," prefix
        const base64 = dataUrl.split(",")[1];

        resolve({
          data: base64,
          mimeType: file.type || "image/jpeg",
        });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [text]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image must be under 5MB");
      return;
    }

    const processed = await processImage(file);
    if (processed) {
      setImage(processed);
      setImagePreview(`data:${processed.mimeType};base64,${processed.data}`);
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  function removeImage() {
    setImage(null);
    setImagePreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !image) || disabled) return;
    onSend(text || "Analyze this image", image ? [image] : undefined);
    setText("");
    removeImage();
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
      className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/60 backdrop-blur-xl"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="max-h-24 rounded-lg border border-[var(--border)] object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-2.5">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-10 w-10 rounded-xl glass flex items-center justify-center flex-shrink-0 hover:bg-[var(--border)] transition-colors disabled:opacity-40"
          title="Upload image for analysis"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={image ? "Describe what to analyze..." : "Message baseclaw..."}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl glass px-4 py-2.5 text-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(224,137,137,0.3)] transition-all disabled:opacity-40 bg-transparent"
        />

        <button
          type="submit"
          disabled={(!text.trim() && !image) || disabled}
          className="btn-cute-primary h-10 w-10 !rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <svg className="relative z-10" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}
