/**
 * @file DOCX loading hook for the pages app.
 */

import { useState, useCallback } from "react";
import { loadDocxFromFile, type DocxDocument } from "@aurochs-office/docx";

export type DocxState = {
  status: "idle" | "loading" | "loaded" | "error";
  document: DocxDocument | null;
  fileName: string | null;
  error: string | null;
};

/**
 * Manage DOCX loading state for the pages app.
 */
export function useDocx() {
  const [state, setState] = useState<DocxState>({
    status: "idle",
    document: null,
    fileName: null,
    error: null,
  });

  const loadFromFile = useCallback(async (file: File) => {
    setState({ status: "loading", document: null, fileName: file.name, error: null });

    try {
      const document = await loadDocxFromFile(file);
      setState({ status: "loaded", document, fileName: file.name, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load DOCX";
      setState({ status: "error", document: null, fileName: file.name, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", document: null, fileName: null, error: null });
  }, []);

  return {
    ...state,
    loadFromFile,
    reset,
  };
}
