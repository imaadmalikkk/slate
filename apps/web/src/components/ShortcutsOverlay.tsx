"use client";

import type { Theme } from "@/lib/types";

interface Props {
  theme: Theme;
  onClose: () => void;
}

const shortcuts = [
  { key: "j / k", action: "Next / previous paragraph" },
  { key: "Space", action: "Scroll down" },
  { key: "t", action: "Cycle theme" },
  { key: "f", action: "Cycle font" },
  { key: "+ / -", action: "Increase / decrease font size" },
  { key: "w", action: "Cycle line width" },
  { key: "Esc", action: "Back to home" },
  { key: "?", action: "Toggle this overlay" },
];

export function ShortcutsOverlay({ theme, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative rounded-xl p-6 max-w-sm w-full shadow-2xl ${
          theme === "dark"
            ? "bg-neutral-900 text-neutral-100"
            : theme === "sepia"
              ? "bg-[var(--color-sepia-bg)] text-[var(--color-sepia-text)]"
              : "bg-white text-neutral-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2.5">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className={theme === "dark" ? "text-neutral-400" : theme === "sepia" ? "text-[var(--color-sepia-muted)]" : "text-neutral-600"}>
                {action}
              </span>
              <span className="flex gap-1">
                {key.split(" / ").map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className={theme === "dark" ? "text-neutral-600" : "text-neutral-400"}>/</span>}
                    <kbd className="kbd">{k.trim()}</kbd>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className={`text-xs mt-4 ${
          theme === "dark" ? "text-neutral-600" : theme === "sepia" ? "text-[var(--color-sepia-muted)]" : "text-neutral-400"
        }`}>
          Press Esc or ? to close
        </p>
      </div>
    </div>
  );
}
