/**
 * @file PDF file loader hook
 *
 * Loads PDF files for the viewer and lazily parses them into PdfDocument
 * for the editor.
 *
 * The viewer only needs the raw bytes (`data`) — it performs its own
 * per-page parsing to avoid blocking the main thread. The full
 * PdfDocument is built on demand (via `ensureDocument`) when the editor
 * is opened, so the initial file load stays lightweight.
 */

import { useCallback, useState } from "react";
import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfDocument } from "@aurochs/pdf";

type PdfState = {
  readonly status: "idle" | "loading" | "loaded" | "parsing" | "error";
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
  /** Parse the full document if not already parsed. Returns the PdfDocument. */
  readonly ensureDocument: () => Promise<PdfDocument | null>;
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

  // On-demand full parse for editor usage.
  const ensureDocument = useCallback(async (): Promise<PdfDocument | null> => {
    // Use a snapshot via setState callback to read current state reliably.
    return new Promise<PdfDocument | null>((resolve) => {
      setState((prev) => {
        if (prev.document) {
          resolve(prev.document);
          return prev;
        }
        if (!prev.data) {
          resolve(null);
          return prev;
        }

        // Start parsing in background.
        const data = prev.data;
        buildPdf({ data })
          .then((doc) => {
            setState((p) => ({ ...p, status: "loaded", document: doc }));
            resolve(doc);
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            setState((p) => ({ ...p, status: "error", error: message }));
            resolve(null);
          });

        return { ...prev, status: "parsing" };
      });
    });
  }, []);

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
    ensureDocument,
    reset,
  };
}

export { usePdf };
export type { UsePdfReturn };
