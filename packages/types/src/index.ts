export interface ArticleContent {
  url: string;
  title: string;
  author: string | null;
  date: string | null;
  siteName: string | null;
  excerpt: string | null;
  content: string; // Clean HTML
  wordCount: number;
  readingTime: number; // minutes
}

export interface HistoryEntry {
  url: string;
  title: string;
  author: string | null;
  excerpt: string | null;
  siteName: string | null;
  readingTime: number;
  savedAt: number; // timestamp
  lastReadAt: number; // timestamp
  scrollPosition: number; // 0-1 progress
}

export type Theme = "light" | "dark" | "sepia";
export type FontFamily = "serif" | "sans" | "mono";
export type LineWidth = "narrow" | "medium" | "wide";

export interface ReaderSettings {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: number;
  lineWidth: LineWidth;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: "light",
  fontFamily: "serif",
  fontSize: 20,
  lineWidth: "medium",
};
