"use client";

import { useState, useEffect, useCallback } from "react";
import { loadSettings, saveSettings } from "@/lib/settings";
import type { ReaderSettings, Theme, FontFamily, LineWidth } from "@/lib/types";

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback(
    (partial: Partial<ReaderSettings>) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["light", "dark", "sepia"];
    setSettings((prev) => {
      if (!prev) return prev;
      const idx = order.indexOf(prev.theme);
      const next = { ...prev, theme: order[(idx + 1) % order.length] };
      saveSettings(next);
      return next;
    });
  }, []);

  const cycleFont = useCallback(() => {
    const order: FontFamily[] = ["serif", "sans", "mono"];
    setSettings((prev) => {
      if (!prev) return prev;
      const idx = order.indexOf(prev.fontFamily);
      const next = { ...prev, fontFamily: order[(idx + 1) % order.length] };
      saveSettings(next);
      return next;
    });
  }, []);

  const increaseFontSize = useCallback(() => {
    setSettings((prev) => {
      if (!prev || prev.fontSize >= 28) return prev;
      const next = { ...prev, fontSize: prev.fontSize + 2 };
      saveSettings(next);
      return next;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setSettings((prev) => {
      if (!prev || prev.fontSize <= 14) return prev;
      const next = { ...prev, fontSize: prev.fontSize - 2 };
      saveSettings(next);
      return next;
    });
  }, []);

  const cycleLineWidth = useCallback(() => {
    const order: LineWidth[] = ["narrow", "medium", "wide"];
    setSettings((prev) => {
      if (!prev) return prev;
      const idx = order.indexOf(prev.lineWidth);
      const next = { ...prev, lineWidth: order[(idx + 1) % order.length] };
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    update,
    cycleTheme,
    cycleFont,
    increaseFontSize,
    decreaseFontSize,
    cycleLineWidth,
  };
}
