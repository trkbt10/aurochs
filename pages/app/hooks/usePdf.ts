/**
 * @file PDF file loader hook
 *
 * Loads PDF files and stores the raw bytes for PdfViewer.
 */

import { useCallback, useState } from "react";

type PdfState = {
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly data: Uint8Array | null;
  readonly fileName: string | null;
  readonly error: string | null;
};

type UsePdfReturn = {
  readonly status: PdfState["status"];
  readonly data: Uint8Array | null;
  readonly fileName: string | null;
  readonly error: string | null;
  readonly loadFromFile: (file: File) => void;
  readonly reset: () => void;
};

function usePdf(): UsePdfReturn {
  const [state, setState] = useState<PdfState>({
    status: "idle",
    data: null,
    fileName: null,
    error: null,
  });

  const loadFromFile = useCallback((file: File) => {
    setState({
      status: "loading",
      data: null,
      fileName: file.name,
      error: null,
    });

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        setState({
          status: "loaded",
          data: new Uint8Array(result),
          fileName: file.name,
          error: null,
        });
      } else {
        setState({
          status: "error",
          data: null,
          fileName: file.name,
          error: "Failed to read file",
        });
      }
    };

    reader.onerror = () => {
      setState({
        status: "error",
        data: null,
        fileName: file.name,
        error: reader.error?.message ?? "Unknown error",
      });
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      data: null,
      fileName: null,
      error: null,
    });
  }, []);

  return {
    status: state.status,
    data: state.data,
    fileName: state.fileName,
    error: state.error,
    loadFromFile,
    reset,
  };
}

export { usePdf };
export type { UsePdfReturn };
