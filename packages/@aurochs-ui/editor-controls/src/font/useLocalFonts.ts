/**
 * @file useLocalFonts hook - Access locally installed fonts via Local Font Access API
 *
 * Adapted from react-editor-ui's useLocalFonts pattern.
 * Uses window.queryLocalFonts() to enumerate system fonts.
 */

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Font data returned by queryLocalFonts API.
 */
export type LocalFontData = {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
};

/**
 * Grouped font family with its styles.
 */
export type LocalFontFamily = {
  family: string;
  styles: string[];
};

export type LocalFontsStatus = "idle" | "requesting" | "granted" | "denied" | "not-supported";

export type UseLocalFontsResult = {
  readonly status: LocalFontsStatus;
  readonly families: readonly LocalFontFamily[];
  readonly requestFonts: () => Promise<void>;
  readonly error: string | null;
  readonly isSupported: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, no-restricted-syntax -- interface declaration required for global augmentation
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

function groupFontsByFamily(fonts: readonly LocalFontData[]): LocalFontFamily[] {
  const familyMap = new Map<string, string[]>();
  for (const font of fonts) {
    const existing = familyMap.get(font.family);
    if (existing) {
      existing.push(font.style);
    } else {
      familyMap.set(font.family, [font.style]);
    }
  }
  const families: LocalFontFamily[] = [];
  for (const [family, styles] of familyMap) {
    families.push({ family, styles });
  }
  families.sort((a, b) => a.family.localeCompare(b.family));
  return families;
}

/**
 * Hook to access locally installed fonts via the Local Font Access API.
 */
export function useLocalFonts(): UseLocalFontsResult {
  const [status, setStatus] = useState<LocalFontsStatus>("idle");
  const [families, setFamilies] = useState<readonly LocalFontFamily[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const isSupported = typeof window !== "undefined" && typeof window.queryLocalFonts === "function";

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const requestFonts = useCallback(async () => {
    if (!window.queryLocalFonts) {
      setStatus("not-supported");
      setError("Local Font Access API is not supported in this browser");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const localFonts = await window.queryLocalFonts();
      if (!mountedRef.current) { return; }
      setFamilies(groupFontsByFamily(localFonts));
      setStatus("granted");
    } catch (err) {
      if (!mountedRef.current) { return; }
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("denied");
        setError("Permission to access local fonts was denied");
      } else {
        setStatus("idle");
        setError(err instanceof Error ? err.message : "Failed to load fonts");
      }
    }
  }, []);

  return { status, families, requestFonts, error, isSupported };
}
