/**
 * @file useFontOptions hook
 *
 * Combines useLocalFonts (Local Font Access API) and useDocumentFontFamilies
 * (document.fonts) into a unified FontOption[] list compatible with
 * react-editor-ui's FontSection fontOptions prop.
 */

import { useMemo, useEffect } from "react";
import { useDocumentFontFamilies } from "./useDocumentFontFamilies";
import { useLocalFonts } from "./useLocalFonts";

/** Option for react-editor-ui FontSection fontOptions. */
export type FontOption = {
  readonly value: string;
  readonly label: string;
};

export type UseFontOptionsResult = {
  /** Combined font options for FontSection. */
  readonly fontOptions: readonly FontOption[];
  /** Whether local fonts have been loaded. */
  readonly localFontsLoaded: boolean;
  /** Request local font access (if not already granted). */
  readonly requestLocalFonts: () => Promise<void>;
};

/**
 * Hook that provides a combined font options list from:
 * 1. document.fonts (web fonts, embedded fonts)
 * 2. Local Font Access API (system-installed fonts)
 *
 * Auto-requests local font access on mount.
 */
export function useFontOptions(): UseFontOptionsResult {
  const documentFamilies = useDocumentFontFamilies();
  const { families: localFamilies, requestFonts, status } = useLocalFonts();

  // Auto-request on mount
  useEffect(() => {
    if (status === "idle") {
      void requestFonts();
    }
  }, []);

  const fontOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: FontOption[] = [];

    // Document fonts first (web/embedded)
    for (const family of documentFamilies) {
      const normalized = family.trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        options.push({ value: normalized, label: normalized });
      }
    }

    // Local fonts (system)
    for (const lf of localFamilies) {
      const normalized = lf.family.trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        options.push({ value: normalized, label: normalized });
      }
    }

    return options;
  }, [documentFamilies, localFamilies]);

  return {
    fontOptions,
    localFontsLoaded: status === "granted",
    requestLocalFonts: requestFonts,
  };
}
