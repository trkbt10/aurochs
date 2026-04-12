/**
 * @file File loading hook for fig files
 *
 * Loads a .fig file from a File object or Uint8Array
 * and creates a FigDesignDocument.
 */

import { useState, useCallback } from "react";
import { createFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument } from "@aurochs-builder/fig/types";

type UseFigFileLoadResult = {
  readonly loadFromBuffer: (buffer: Uint8Array) => Promise<FigDesignDocument>;
  readonly loadFromFile: (file: File) => Promise<FigDesignDocument>;
  readonly isLoading: boolean;
  readonly error: Error | undefined;
};

/**
 * Hook for loading .fig files into FigDesignDocument.
 */
export function useFigFileLoad(): UseFigFileLoadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const loadFromBuffer = useCallback(async (buffer: Uint8Array): Promise<FigDesignDocument> => {
    setIsLoading(true);
    setError(undefined);

    try {
      return await createFigDesignDocument(buffer);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFromFile = useCallback(
    async (file: File): Promise<FigDesignDocument> => {
      const arrayBuffer = await file.arrayBuffer();
      return loadFromBuffer(new Uint8Array(arrayBuffer));
    },
    [loadFromBuffer],
  );

  return { loadFromBuffer, loadFromFile, isLoading, error };
}
