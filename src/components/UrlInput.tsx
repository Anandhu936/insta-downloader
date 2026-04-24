"use client";

import { useState, useRef, useCallback } from "react";
import { Link2, Search, X, Clipboard } from "lucide-react";
import toast from "react-hot-toast";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export default function UrlInput({ onFetch, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {
      toast.error("Clipboard access denied. Please paste manually.");
    }
  }, []);

  const handleClear = useCallback(() => {
    setUrl("");
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) {
        toast.error("Please paste an Instagram URL first!");
        return;
      }
      if (
        !trimmed.includes("instagram.com") &&
        !trimmed.includes("instagr.am")
      ) {
        toast.error("Please enter a valid Instagram URL.");
        return;
      }
      onFetch(trimmed);
    },
    [url, onFetch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <Link2 className="w-5 h-5 text-sky-400 opacity-70" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id="instagram-url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Instagram URL here (post, reel, story...)"
          disabled={isLoading}
          className="glass-input w-full rounded-2xl pl-14 pr-[180px] py-5 text-base text-white placeholder-gray-500 focus:placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Clear button */}
        {url && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-[145px] top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-20"
            aria-label="Clear input"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Paste button */}
        {!url && (
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-[145px] top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200 text-sm z-20"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          id="download-btn"
          disabled={isLoading || !url.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 ig-button flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm whitespace-nowrap shadow-lg z-20"
        >
          {isLoading ? (
            <>
              <svg
                className="spinner w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeOpacity="0.25"
                  className="opacity-25"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Download</span>
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-gray-600 mt-3">
        Supports public posts, reels, carousels, and IGTV
      </p>
    </form>
  );
}
