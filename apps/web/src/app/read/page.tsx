"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import { ReaderToolbar } from "@/components/ReaderToolbar";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { saveToHistory, getHistoryEntry, updateScrollPosition } from "@/lib/history";
import type { ArticleContent, LineWidth } from "@/lib/types";

const lineWidthClass: Record<LineWidth, string> = {
  narrow: "max-w-lg",
  medium: "max-w-2xl",
  wide: "max-w-4xl",
};

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  const {
    settings,
    cycleTheme,
    cycleFont,
    increaseFontSize,
    decreaseFontSize,
    cycleLineWidth,
  } = useReaderSettings();

  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [progress, setProgress] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const paragraphsRef = useRef<HTMLElement[]>([]);
  const currentParagraphRef = useRef(-1);
  const hasRestoredScroll = useRef(false);

  // Fetch article
  useEffect(() => {
    if (!url) {
      setError("No URL provided");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchArticle() {
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to extract content");
          setLoading(false);
          return;
        }

        setArticle(data);
        setLoading(false);

        // Save to history
        const existing = await getHistoryEntry(url!);
        await saveToHistory({
          url: url!,
          title: data.title,
          author: data.author,
          excerpt: data.excerpt,
          siteName: data.siteName,
          readingTime: data.readingTime,
          savedAt: existing?.savedAt || Date.now(),
          lastReadAt: Date.now(),
          scrollPosition: existing?.scrollPosition || 0,
        });
      } catch {
        if (!cancelled) {
          setError("Failed to fetch article. Check the URL and try again.");
          setLoading(false);
        }
      }
    }

    fetchArticle();
    return () => { cancelled = true; };
  }, [url]);

  // Index paragraphs for keyboard navigation
  useEffect(() => {
    if (!contentRef.current || !article) return;
    const els = contentRef.current.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre"
    );
    paragraphsRef.current = Array.from(els) as HTMLElement[];
  }, [article]);

  // Restore scroll position from history
  useEffect(() => {
    if (!article || !url || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;

    async function restore() {
      const entry = await getHistoryEntry(url!);
      if (entry && entry.scrollPosition > 0.01) {
        requestAnimationFrame(() => {
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, entry.scrollPosition * maxScroll);
        });
      }
    }
    restore();
  }, [article, url]);

  // Track scroll progress + save position
  useEffect(() => {
    if (!article || !url) return;

    let ticking = false;
    let saveTimeout: ReturnType<typeof setTimeout>;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          const p = maxScroll > 0 ? scrollTop / maxScroll : 0;
          setProgress(p);

          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            updateScrollPosition(url!, p);
          }, 1000);

          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(saveTimeout);
    };
  }, [article, url]);

  // Keyboard navigation
  const navigateParagraph = useCallback(
    (direction: "next" | "prev") => {
      const paragraphs = paragraphsRef.current;
      if (!paragraphs.length) return;

      if (direction === "next") {
        currentParagraphRef.current = Math.min(
          currentParagraphRef.current + 1,
          paragraphs.length - 1
        );
      } else {
        currentParagraphRef.current = Math.max(
          currentParagraphRef.current - 1,
          0
        );
      }

      const target = paragraphs[currentParagraphRef.current];
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    []
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "j":
          e.preventDefault();
          navigateParagraph("next");
          break;
        case "k":
          e.preventDefault();
          navigateParagraph("prev");
          break;
        case "t":
          e.preventDefault();
          cycleTheme();
          break;
        case "f":
          e.preventDefault();
          cycleFont();
          break;
        case "=":
        case "+":
          e.preventDefault();
          increaseFontSize();
          break;
        case "-":
          e.preventDefault();
          decreaseFontSize();
          break;
        case "w":
          e.preventDefault();
          cycleLineWidth();
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((s) => !s);
          break;
        case "Escape":
          e.preventDefault();
          if (showShortcuts) {
            setShowShortcuts(false);
          } else {
            router.push("/");
          }
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    navigateParagraph,
    cycleTheme,
    cycleFont,
    increaseFontSize,
    decreaseFontSize,
    cycleLineWidth,
    showShortcuts,
    router,
  ]);

  const themeClasses = settings
    ? settings.theme === "dark"
      ? "bg-neutral-950 text-neutral-200"
      : settings.theme === "sepia"
        ? "bg-[var(--color-sepia-bg)] text-[var(--color-sepia-text)]"
        : "bg-white text-neutral-800"
    : "bg-white text-neutral-800";

  const fontClass = settings
    ? settings.fontFamily === "serif"
      ? "font-serif"
      : settings.fontFamily === "mono"
        ? "font-mono"
        : "font-sans"
    : "font-serif";

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Extracting content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="text-neutral-400 hover:text-neutral-200 text-sm underline underline-offset-2"
          >
            Try another URL
          </button>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const metaParts: string[] = [];
  if (article.author) metaParts.push(article.author);
  if (article.siteName) metaParts.push(article.siteName);
  if (article.date) {
    try {
      metaParts.push(
        new Date(article.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    } catch {
      metaParts.push(article.date);
    }
  }

  return (
    <div
      className={`min-h-screen ${themeClasses} transition-colors duration-200`}
      data-theme={settings.theme}
    >
      <div
        className="reading-progress"
        style={{ width: `${progress * 100}%` }}
      />

      <ReaderToolbar
        settings={settings}
        onCycleTheme={cycleTheme}
        onCycleFont={cycleFont}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onCycleLineWidth={cycleLineWidth}
        onShowShortcuts={() => setShowShortcuts(true)}
        onClose={() => router.push("/")}
      />

      {showShortcuts && (
        <ShortcutsOverlay
          theme={settings.theme}
          onClose={() => setShowShortcuts(false)}
        />
      )}

      <article
        className={`mx-auto px-6 pt-20 pb-32 ${lineWidthClass[settings.lineWidth]} ${fontClass}`}
        style={{ fontSize: `${settings.fontSize}px` }}
      >
        <header className="mb-10">
          <h1
            className="font-bold leading-tight mb-4"
            style={{ fontSize: `${settings.fontSize * 1.6}px` }}
          >
            {article.title}
          </h1>

          {metaParts.length > 0 && (
            <p
              className={`text-sm ${
                settings.theme === "dark"
                  ? "text-neutral-500"
                  : settings.theme === "sepia"
                    ? "text-[var(--color-sepia-muted)]"
                    : "text-neutral-500"
              }`}
            >
              {metaParts.join(" · ")}
            </p>
          )}

          <p
            className={`text-sm mt-1 ${
              settings.theme === "dark"
                ? "text-neutral-600"
                : settings.theme === "sepia"
                  ? "text-[var(--color-sepia-muted)]"
                  : "text-neutral-400"
            }`}
          >
            {article.wordCount.toLocaleString()} words · {article.readingTime}{" "}
            min read
          </p>
        </header>

        <div
          ref={contentRef}
          className="reader-content"
          // Content is sanitized server-side with DOMPurify in /api/extract
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      }
    >
      <ReaderContent />
    </Suspense>
  );
}
