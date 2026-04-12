/**
 * @file Fig file loading hook
 *
 * Loads .fig files and converts them to FigDesignDocument.
 * This hook is a pure file loader — it does NOT know about demo documents.
 * Demo fallback is handled at the router level.
 */

import { useCallback } from "react";
import { useFileLoader } from "./useFileLoader";
import { createFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument } from "@aurochs/fig/domain";

type UseFigReturn = {
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly document: FigDesignDocument | null;
  readonly fileName: string | null;
  readonly error: string | null;
  readonly loadFromFile: (file: File) => void;
  readonly loadFromUrl: (url: string, fileName: string) => void;
  /** Low-level: load from an arbitrary async producer. */
  readonly load: (fileName: string, loadFn: () => Promise<FigDesignDocument>) => void;
  readonly reset: () => void;
};

/**
 * Hook for loading .fig files.
 *
 * Supports loading from:
 * - File object (drag-drop or file picker)
 * - URL (fetch + parse)
 * - Arbitrary async producer via load()
 */
export function useFig(): UseFigReturn {
  const loader = useFileLoader<FigDesignDocument>("Failed to load .fig file");

  const loadFromFile = useCallback(
    (file: File) => {
      loader.load(file.name, async () => {
        const buffer = await file.arrayBuffer();
        return createFigDesignDocument(new Uint8Array(buffer));
      });
    },
    [loader],
  );

  const loadFromUrl = useCallback(
    (url: string, fileName: string) => {
      loader.load(fileName, async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return createFigDesignDocument(new Uint8Array(buffer));
      });
    },
    [loader],
  );

  return {
    status: loader.status,
    document: loader.data,
    fileName: loader.fileName,
    error: loader.error,
    loadFromFile,
    loadFromUrl,
    load: loader.load,
    reset: loader.reset,
  };
}
