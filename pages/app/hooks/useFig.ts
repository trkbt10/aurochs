/**
 * @file Fig file loading hook
 *
 * Loads .fig files and converts them to FigDesignDocument for the editor.
 */

import { useCallback } from "react";
import { useFileLoader } from "./useFileLoader";
import { createFigDesignDocument, createEmptyFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument } from "@aurochs-builder/fig/types";

type UseFigReturn = {
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly document: FigDesignDocument | null;
  readonly fileName: string | null;
  readonly error: string | null;
  readonly loadFromFile: (file: File) => void;
  readonly loadFromUrl: (url: string, fileName: string) => void;
  readonly loadDemo: () => void;
  readonly reset: () => void;
};

/**
 * Hook for loading .fig files.
 *
 * Supports loading from:
 * - File object (drag-drop or file picker)
 * - URL (fetch + parse)
 * - Demo (empty document with sample content)
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

  const loadDemo = useCallback(() => {
    loader.load("demo.fig", async () => {
      return createEmptyFigDesignDocument("Page 1");
    });
  }, [loader]);

  return {
    status: loader.status,
    document: loader.data,
    fileName: loader.fileName,
    error: loader.error,
    loadFromFile,
    loadFromUrl,
    loadDemo,
    reset: loader.reset,
  };
}
