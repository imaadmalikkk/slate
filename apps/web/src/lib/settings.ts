import { DEFAULT_READER_SETTINGS, type ReaderSettings } from "./types";

const SETTINGS_KEY = "slate-reader-settings";

export function loadSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_READER_SETTINGS;
    return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
