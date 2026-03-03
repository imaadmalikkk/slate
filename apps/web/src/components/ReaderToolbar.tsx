"use client";

import type { ReaderSettings, Theme, FontFamily, LineWidth } from "@/lib/types";

interface ToolbarProps {
  settings: ReaderSettings;
  onCycleTheme: () => void;
  onCycleFont: () => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onCycleLineWidth: () => void;
  onShowShortcuts: () => void;
  onClose: () => void;
}

const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  sepia: "Sepia",
};

const fontLabels: Record<FontFamily, string> = {
  serif: "Serif",
  sans: "Sans",
  mono: "Mono",
};

const widthLabels: Record<LineWidth, string> = {
  narrow: "Narrow",
  medium: "Medium",
  wide: "Wide",
};

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  if (theme === "sepia") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function ReaderToolbar({
  settings,
  onCycleTheme,
  onCycleFont,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onCycleLineWidth,
  onShowShortcuts,
  onClose,
}: ToolbarProps) {
  const btnBase =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors";

  const btnStyle =
    settings.theme === "dark"
      ? `${btnBase} text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800`
      : settings.theme === "sepia"
        ? `${btnBase} text-[var(--color-sepia-muted)] hover:text-[var(--color-sepia-text)] hover:bg-[var(--color-sepia-border)]/30`
        : `${btnBase} text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100`;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md">
      <div
        className={`border-b ${
          settings.theme === "dark"
            ? "bg-neutral-950/80 border-neutral-800"
            : settings.theme === "sepia"
              ? "bg-[var(--color-sepia-bg)]/80 border-[var(--color-sepia-border)]"
              : "bg-white/80 border-neutral-200"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between">
          {/* Left — back */}
          <button onClick={onClose} className={btnStyle} title="Back (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="hidden sm:inline">Slate</span>
          </button>

          {/* Center — controls */}
          <div className="flex items-center gap-1">
            <button onClick={onCycleTheme} className={btnStyle} title="Toggle theme (T)">
              <ThemeIcon theme={settings.theme} />
              <span className="hidden sm:inline">{themeLabels[settings.theme]}</span>
            </button>

            <button onClick={onCycleFont} className={btnStyle} title="Toggle font (F)">
              <span className="text-sm font-serif">A</span>
              <span className="hidden sm:inline">{fontLabels[settings.fontFamily]}</span>
            </button>

            <div className="flex items-center">
              <button onClick={onDecreaseFontSize} className={btnStyle} title="Decrease font size (-)">
                <span className="text-xs">A-</span>
              </button>
              <span className={`text-xs px-1 ${
                settings.theme === "dark" ? "text-neutral-500" : settings.theme === "sepia" ? "text-[var(--color-sepia-muted)]" : "text-neutral-400"
              }`}>
                {settings.fontSize}
              </span>
              <button onClick={onIncreaseFontSize} className={btnStyle} title="Increase font size (+)">
                <span className="text-xs">A+</span>
              </button>
            </div>

            <button onClick={onCycleLineWidth} className={btnStyle} title="Toggle line width (W)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
              <span className="hidden sm:inline">{widthLabels[settings.lineWidth]}</span>
            </button>
          </div>

          {/* Right — shortcuts */}
          <button onClick={onShowShortcuts} className={btnStyle} title="Keyboard shortcuts (?)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
