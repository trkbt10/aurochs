/**
 * @file Generic file loading state machine
 *
 * Provides a shared state pattern for loading files: idle → loading → loaded | error.
 * Used by usePptx, useDocx, and useXlsx hooks as a thin foundation.
 */

import { useState, useCallback } from "react";

type FileLoaderStatus = "idle" | "loading" | "loaded" | "error";

type FileLoaderState<T> = {
  readonly status: FileLoaderStatus;
  readonly data: T | null;
  readonly fileName: string | null;
  readonly error: string | null;
};

type FileLoaderReturn<T> = FileLoaderState<T> & {
  readonly load: (fileName: string, loadFn: () => Promise<T>) => Promise<void>;
  readonly reset: () => void;
};

/**
 * Generic file loader hook.
 *
 * @param errorPrefix - Default error message when the thrown error is not an Error instance.
 */
export function useFileLoader<T>(errorPrefix = "Failed to load file"): FileLoaderReturn<T> {
  const [state, setState] = useState<FileLoaderState<T>>({
    status: "idle",
    data: null,
    fileName: null,
    error: null,
  });

  const load = useCallback(
    async (fileName: string, loadFn: () => Promise<T>) => {
      setState({ status: "loading", data: null, fileName, error: null });
      try {
        const data = await loadFn();
        setState({ status: "loaded", data, fileName, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : errorPrefix;
        setState({ status: "error", data: null, fileName, error: message });
      }
    },
    [errorPrefix],
  );

  const reset = useCallback(() => {
    setState({ status: "idle", data: null, fileName: null, error: null });
  }, []);

  return { ...state, load, reset };
}
