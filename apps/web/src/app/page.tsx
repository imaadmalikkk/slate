"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getHistory, deleteHistoryEntry, formatRelativeTime } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();

  const loadHistory = useCallback(async () => {
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    try {
      new URL(normalized);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);
    router.push(`/read?url=${encodeURIComponent(normalized)}`);
  }

  async function handleDelete(entryUrl: string) {
    await deleteHistoryEntry(entryUrl);
    loadHistory();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Main content — centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="w-full max-w-xl">
          {/* Logo / Name */}
          <h1 className="text-4xl font-light tracking-tight text-center mb-2">
            Slate
          </h1>
          <p className="text-neutral-500 text-center text-sm mb-10">
            Paste a URL. Read without distraction.
          </p>

          {/* URL Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="Paste any article URL..."
                autoFocus
                disabled={loading}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3.5 text-base text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors disabled:opacity-50"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </form>

          <p className="text-neutral-700 text-xs text-center mt-3">
            Press Enter to read
          </p>
        </div>
      </main>

      {/* History */}
      {history.length > 0 && (
        <section className="w-full max-w-xl mx-auto px-4 pb-12">
          <h2 className="text-xs font-medium text-neutral-600 uppercase tracking-wider mb-3">
            Recently Read
          </h2>
          <div className="space-y-1">
            {history.slice(0, 20).map((entry) => (
              <div
                key={entry.url}
                className="group flex items-start gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(`/read?url=${encodeURIComponent(entry.url)}`)
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate leading-snug">
                    {entry.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {entry.siteName && (
                      <span>{entry.siteName} · </span>
                    )}
                    {entry.readingTime} min read ·{" "}
                    {formatRelativeTime(entry.lastReadAt)}
                    {entry.scrollPosition > 0 && entry.scrollPosition < 0.95 && (
                      <span>
                        {" "}
                        · {Math.round(entry.scrollPosition * 100)}%
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.url);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-neutral-400 transition-opacity p-1 -mr-1"
                  title="Remove from history"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
