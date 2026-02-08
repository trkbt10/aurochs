/**
 * @file useSvgFontLoader
 *
 * Ensures fonts referenced by rendered slide SVGs are loaded via the injected FontCatalog.
 *
 * This is implemented in the pages app (not the core library) so the catalog source
 * (e.g. Google Fonts) remains injectable and doesn't bloat the package.
 */

import { useCallback, useEffect, useRef } from "react";
import { useEditorConfig, type FontCatalog } from "@aurochs-ui/pptx-editor";

const GENERIC_FAMILIES = new Set([
  "inherit",
  "initial",
  "unset",
  "default",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "emoji",
  "math",
  "fangsong",
]);

function normalizeFamilyName(family: string): string {
  const trimmed = family.trim();
  if (trimmed === "") {
    return "";
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function splitFamilyList(value: string): readonly string[] {
  return value
    .split(",")
    .map((part) => normalizeFamilyName(part))
    .filter((part) => part !== "" && !GENERIC_FAMILIES.has(part.toLowerCase()));
}

function extractSvgFontFamilies(svg: string): readonly string[] {
  const families = new Set<string>();

  const familyAttr = /font-family=(?:"([^"]+)"|'([^']+)')/g;
  for (const match of svg.matchAll(familyAttr)) {
    const raw = match[1] ?? match[2] ?? "";
    for (const family of splitFamilyList(raw)) {
      families.add(family);
    }
  }

  const styleAttr = /style=(?:"([^"]+)"|'([^']+)')/g;
  for (const match of svg.matchAll(styleAttr)) {
    const rawStyle = match[1] ?? match[2] ?? "";
    const familyMatch = /font-family\s*:\s*([^;]+)/i.exec(rawStyle);
    if (!familyMatch) {
      continue;
    }
    for (const family of splitFamilyList(familyMatch[1] ?? "")) {
      families.add(family);
    }
  }

  return Array.from(families).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

async function buildCatalogFamilySet(fontCatalog: FontCatalog): Promise<Set<string>> {
  const families = await Promise.resolve(fontCatalog.listFamilies());
  const set = new Set<string>();
  for (const family of families) {
    const normalized = normalizeFamilyName(family);
    if (normalized) {
      set.add(normalized);
    }
  }
  return set;
}

async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<void>,
): Promise<void> {
  if (limit <= 0) {
    throw new Error("runWithConcurrencyLimit: limit must be > 0");
  }
  const queue = items.slice();
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next === undefined) {
        return;
      }
      await run(next);
    }
  });
  await Promise.all(workers);
}

/**
 * Returns a function that loads fonts referenced by an SVG using the injected `fontCatalog`.
 *
 * - Only loads fonts when the family exists in the catalog.
 * - Avoids re-loading already-successful families.
 * - Safe under React.StrictMode.
 */
export function useSvgFontLoader(): ((svg: string) => Promise<void>) | null {
  const { fontCatalog } = useEditorConfig();

  const catalogSetRef = useRef<Set<string> | null>(null);
  const catalogSetPromiseRef = useRef<Promise<Set<string>> | null>(null);
  const loadedFamiliesRef = useRef<Set<string>>(new Set());
  const inFlightFamiliesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    catalogSetRef.current = null;
    catalogSetPromiseRef.current = null;
    loadedFamiliesRef.current.clear();
    inFlightFamiliesRef.current.clear();
  }, [fontCatalog]);

  const getCatalogSet = useCallback(async () => {
    if (!fontCatalog) {
      throw new Error("useSvgFontLoader: fontCatalog is required");
    }
    if (catalogSetRef.current) {
      return catalogSetRef.current;
    }
    if (catalogSetPromiseRef.current) {
      return catalogSetPromiseRef.current;
    }
    const promise = buildCatalogFamilySet(fontCatalog).then((set) => {
      catalogSetRef.current = set;
      catalogSetPromiseRef.current = null;
      return set;
    });
    catalogSetPromiseRef.current = promise;
    return promise;
  }, [fontCatalog]);

  return useCallback(
    async (svg: string) => {
      if (!fontCatalog) {
        return;
      }
      if (typeof svg !== "string" || svg.trim() === "") {
        return;
      }

      const requestedFamilies = extractSvgFontFamilies(svg);
      if (requestedFamilies.length === 0) {
        return;
      }

      const catalogSet = await getCatalogSet();
      const toLoad = requestedFamilies.filter(
        (family) =>
          catalogSet.has(family) && !loadedFamiliesRef.current.has(family) && !inFlightFamiliesRef.current.has(family),
      );
      if (toLoad.length === 0) {
        return;
      }

      await runWithConcurrencyLimit(toLoad, 3, async (family) => {
        inFlightFamiliesRef.current.add(family);
        try {
          const ok = await Promise.resolve(fontCatalog.ensureFamilyLoaded(family));
          if (ok) {
            loadedFamiliesRef.current.add(family);
          }
        } catch {
          // Ignore errors to avoid crashing the viewer/editor.
        } finally {
          inFlightFamiliesRef.current.delete(family);
        }
      });
    },
    [fontCatalog, getCatalogSet],
  );
}
