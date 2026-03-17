/**
 * @file PDF file loader hook
 *
 * Loads PDF files and parses them into PdfDocument for both viewer and editor.
 */

import { useCallback, useState, useEffect } from "react";
import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfDocument } from "@aurochs/pdf";

type PdfState = {
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly data: Uint8Array | null;
  readonly document: PdfDocument | null;
  readonly fileName: string | null;
  readonly error: string | null;
};

type UsePdfReturn = {
  readonly status: PdfState["status"];
  readonly data: Uint8Array | null;
  readonly document: PdfDocument | null;
  readonly fileName: string | null;
  readonly error: string | null;
  readonly loadFromFile: (file: File) => void;
  readonly reset: () => void;
};

/** Hook for loading and parsing PDF files. */
function usePdf(): UsePdfReturn {
  const [state, setState] = useState<PdfState>({
    status: "idle",
    data: null,
    document: null,
    fileName: null,
    error: null,
  });

  const loadFromFile = useCallback((file: File) => {
    setState({
      status: "loading",
      data: null,
      document: null,
      fileName: file.name,
      error: null,
    });

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        const data = new Uint8Array(result);
        setState({
          status: "loaded",
          data,
          document: null,
          fileName: file.name,
          error: null,
        });
      } else {
        setState({
          status: "error",
          data: null,
          document: null,
          fileName: file.name,
          error: "Failed to read file",
        });
      }
    };

    reader.onerror = () => {
      setState({
        status: "error",
        data: null,
        document: null,
        fileName: file.name,
        error: reader.error?.message ?? "Unknown error",
      });
    };

    reader.readAsArrayBuffer(file);
  }, []);

  // Parse data into PdfDocument when data is available
  useEffect(() => {
    if (!state.data || state.document) { return; }

    buildPdf({ data: state.data })
      .then((doc) => {
        setState((prev) => ({ ...prev, document: doc }));
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        }));
      });
  }, [state.data, state.document]);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      data: null,
      document: null,
      fileName: null,
      error: null,
    });
  }, []);

  return {
    status: state.status,
    data: state.data,
    document: state.document,
    fileName: state.fileName,
    error: state.error,
    loadFromFile,
    reset,
  };
}

export { usePdf };
export type { UsePdfReturn };
