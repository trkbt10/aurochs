import { useState, useCallback } from "react";
import { loadPptxFromFile, loadPptxFromUrl, type LoadedPresentation } from "../lib/pptx-loader";

export type PptxState = {
  status: "idle" | "loading" | "loaded" | "error";
  presentation: LoadedPresentation | null;
  fileName: string | null;
  error: string | null;
};

export function usePptx() {
  const [state, setState] = useState<PptxState>({
    status: "idle",
    presentation: null,
    fileName: null,
    error: null,
  });

  const loadFromFile = useCallback(async (file: File) => {
    setState({ status: "loading", presentation: null, fileName: file.name, error: null });

    try {
      const presentation = await loadPptxFromFile(file);
      setState({ status: "loaded", presentation, fileName: file.name, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load PPTX";
      setState({ status: "error", presentation: null, fileName: file.name, error: message });
    }
  }, []);

  const loadFromUrl = useCallback(async (url: string, name?: string) => {
    const fileName = name || url.split("/").pop() || "presentation.pptx";
    setState({ status: "loading", presentation: null, fileName, error: null });

    try {
      const presentation = await loadPptxFromUrl(url);
      setState({ status: "loaded", presentation, fileName, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load PPTX";
      setState({ status: "error", presentation: null, fileName, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", presentation: null, fileName: null, error: null });
  }, []);

  return {
    ...state,
    loadFromFile,
    loadFromUrl,
    reset,
  };
}
