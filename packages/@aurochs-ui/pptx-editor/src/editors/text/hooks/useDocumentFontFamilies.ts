/**
 * @file useDocumentFontFamilies - Extract available font families from document.fonts
 */

import { useEffect, useState } from "react";

type FontFaceSetHandler = ((this: FontFaceSet, ev: FontFaceSetLoadEvent) => unknown) | null;

type HandlerSnapshot = {
  readonly onloading: FontFaceSetHandler;
  readonly onloadingdone: FontFaceSetHandler;
  readonly onloadingerror: FontFaceSetHandler;
};

type Multiplexer = {
  readonly listeners: Set<() => void>;
  readonly prev: HandlerSnapshot;
};

const fontFaceSetHandlerRegistry = new WeakMap<FontFaceSet, Multiplexer>();

function normalizeFamilyName(family: string): string {
  const trimmed = family.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getFontFamilies(fonts: FontFaceSet): readonly string[] {
  const families = new Set<string>();
  fonts.forEach((fontFace) => {
    const normalized = normalizeFamilyName(fontFace.family);
    if (normalized) {
      families.add(normalized);
    }
  });

  return Array.from(families).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function areSameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function subscribeToFontChanges(fonts: FontFaceSet, onUpdate: () => void): () => void {
  if (typeof fonts.addEventListener === "function" && typeof fonts.removeEventListener === "function") {
    fonts.addEventListener("loading", onUpdate);
    fonts.addEventListener("loadingdone", onUpdate);
    fonts.addEventListener("loadingerror", onUpdate);
    return () => {
      fonts.removeEventListener("loading", onUpdate);
      fonts.removeEventListener("loadingdone", onUpdate);
      fonts.removeEventListener("loadingerror", onUpdate);
    };
  }

  // Fallback: environments that expose only onloading/onloadingdone/onloadingerror handler props.
  // These are single-slot handlers, so we multiplex safely to avoid conflicts across multiple hook instances.
  const existing = fontFaceSetHandlerRegistry.get(fonts);
  const created: Multiplexer = existing ?? {
    listeners: new Set(),
    prev: {
      onloading: fonts.onloading,
      onloadingdone: fonts.onloadingdone,
      onloadingerror: fonts.onloadingerror,
    },
  };

  if (!existing) {
    fontFaceSetHandlerRegistry.set(fonts, created);

    fonts.onloading = function onloading(event: FontFaceSetLoadEvent) {
      created.prev.onloading?.call(fonts, event);
      created.listeners.forEach((listener) => listener());
    };
    fonts.onloadingdone = function onloadingdone(event: FontFaceSetLoadEvent) {
      created.prev.onloadingdone?.call(fonts, event);
      created.listeners.forEach((listener) => listener());
    };
    fonts.onloadingerror = function onloadingerror(event: FontFaceSetLoadEvent) {
      created.prev.onloadingerror?.call(fonts, event);
      created.listeners.forEach((listener) => listener());
    };
  }

  created.listeners.add(onUpdate);

  return () => {
    const current = fontFaceSetHandlerRegistry.get(fonts);
    if (!current) {
      return;
    }
    current.listeners.delete(onUpdate);
    if (current.listeners.size === 0) {
      fonts.onloading = current.prev.onloading;
      fonts.onloadingdone = current.prev.onloadingdone;
      fonts.onloadingerror = current.prev.onloadingerror;
      fontFaceSetHandlerRegistry.delete(fonts);
    }
  };
}

/**
 * Reads available font family names from `document.fonts`.
 *
 * Notes:
 * - Uses `document.fonts.ready` to refresh after initial font loading completes.
 * - Subscribes to `loadingdone`/`loadingerror` so late-loaded fonts are reflected.
 * - Designed to be safe under React.StrictMode (dev double-invocation of effects).
 */
export function useDocumentFontFamilies(): readonly string[] {
  const [documentFamilies, setDocumentFamilies] = useState<readonly string[]>(() => {
    if (typeof document === "undefined") {
      return [];
    }
    if (!document.fonts) {
      return [];
    }
    return document.fonts.status === "loaded" ? getFontFamilies(document.fonts) : [];
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!document.fonts) {
      return;
    }

    const fonts = document.fonts;
    const canceled = { value: false };
    const readyResolved = { value: fonts.status === "loaded" };

    const refresh = () => {
      setDocumentFamilies((prev) => {
        const next = getFontFamilies(fonts);
        return areSameStringArray(prev, next) ? prev : next;
      });
    };

    const handleFontsUpdated = () => {
      // Some environments only expose usable entries after `fonts.ready` resolves.
      if (!canceled.value && (readyResolved.value || fonts.status === "loaded")) {
        readyResolved.value = true;
        refresh();
      }
    };

    const unsubscribe = subscribeToFontChanges(fonts, handleFontsUpdated);

    if (readyResolved.value) {
      refresh();
    } else {
      fonts.ready
        ?.then(() => {
          handleFontsUpdated();
        })
        .catch(() => {
          // Ignore font loading errors: keep initial snapshot
        });
    }

    return () => {
      canceled.value = true;
      unsubscribe();
    };
  }, []);

  return documentFamilies;
}
