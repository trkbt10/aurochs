/**
 * @file Export presentation hook
 *
 * Provides export functionality for the presentation editor.
 * Supports macro-enabled formats (pptm, ppsm) via pass-through preservation.
 *
 * @see MS-OFFMACRO2 (Office Macro-Enabled File Format)
 */

import { useState, useCallback } from "react";
import { usePresentationEditor } from "../../context/presentation/PresentationEditorContext";
import { exportPptx, type ExportOptions, type ExportResult } from "@aurochs-builder/pptx/export";
import { downloadPresentation } from "@aurochs-office/opc";

// =============================================================================
// Types
// =============================================================================

/**
 * Export state
 */
export type ExportState = {
  /** Whether export is in progress */
  readonly isExporting: boolean;
  /** Export error (if any) */
  readonly error: Error | null;
  /** Last export result (if successful) */
  readonly lastResult: ExportResult | null;
};

/**
 * Export options for the hook
 */
export type UseExportPresentationOptions = ExportOptions & {
  /** File name for download (default: "presentation.pptx") */
  readonly fileName?: string;
  /** Whether to automatically trigger download (default: true) */
  readonly autoDownload?: boolean;
  /** Callback when export starts */
  readonly onExportStart?: () => void;
  /** Callback when export completes successfully */
  readonly onExportComplete?: (result: ExportResult) => void;
  /** Callback when export fails */
  readonly onExportError?: (error: Error) => void;
};

/**
 * Result of useExportPresentation hook
 */
export type UseExportPresentationResult = ExportState & {
  /** Export presentation as Blob and optionally trigger download */
  readonly exportPresentation: (options?: UseExportPresentationOptions) => Promise<ExportResult | null>;
  /** Export presentation as Blob without download */
  readonly exportAsBlob: (options?: ExportOptions) => Promise<Blob | null>;
  /** Export presentation as ArrayBuffer */
  readonly exportAsBuffer: (options?: ExportOptions) => Promise<ArrayBuffer | null>;
  /** Download a blob as file */
  readonly downloadBlob: (blob: Blob, fileName?: string) => Promise<void>;
  /** Clear error state */
  readonly clearError: () => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for exporting presentations from the editor.
 *
 * @example
 * ```tsx
 * function ExportButton() {
 *   const { exportPresentation, isExporting, error } = useExportPresentation();
 *
 *   const handleExport = async () => {
 *     await exportPresentation({ fileName: "my-presentation.pptx" });
 *   };
 *
 *   return (
 *     <button onClick={handleExport} disabled={isExporting}>
 *       {isExporting ? "Exporting..." : "Export PPTX"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useExportPresentation(): UseExportPresentationResult {
  const { document } = usePresentationEditor();

  const [state, setState] = useState<ExportState>({
    isExporting: false,
    error: null,
    lastResult: null,
  });

  /**
   * Download a blob as file.
   *
   * Uses File System Access API when available (Chrome/Edge),
   * falls back to anchor download for other browsers.
   *
   * Supports macro-enabled formats (pptm, ppsm) based on filename extension.
   */
  const downloadBlob = useCallback(async (blob: Blob, fileName: string = "presentation.pptx") => {
    await downloadPresentation(blob, fileName);
  }, []);

  /**
   * Export presentation as Blob without download
   */
  const exportAsBlob = useCallback(
    async (options?: ExportOptions): Promise<Blob | null> => {
      if (!document.presentationFile) {
        const error = new Error(
          "Cannot export: presentation file is not available. " +
            "Ensure the presentation was loaded from a PPTX file.",
        );
        setState((prev) => ({ ...prev, error }));
        return null;
      }

      setState({ isExporting: true, error: null, lastResult: null });

      try {
        const result = await exportPptx(document, options);
        setState({ isExporting: false, error: null, lastResult: result });
        return result.blob;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ isExporting: false, error, lastResult: null });
        return null;
      }
    },
    [document],
  );

  /**
   * Export presentation as ArrayBuffer
   */
  const exportAsBuffer = useCallback(
    async (options?: ExportOptions): Promise<ArrayBuffer | null> => {
      const blob = await exportAsBlob(options);
      if (!blob) {
        return null;
      }
      return blob.arrayBuffer();
    },
    [exportAsBlob],
  );

  /**
   * Export presentation and optionally trigger download
   */
  const exportPresentation = useCallback(
    async (options?: UseExportPresentationOptions): Promise<ExportResult | null> => {
      const {
        fileName = "presentation.pptx",
        autoDownload = true,
        onExportStart,
        onExportComplete,
        onExportError,
        ...exportOptions
      } = options ?? {};

      if (!document.presentationFile) {
        const error = new Error(
          "Cannot export: presentation file is not available. " +
            "Ensure the presentation was loaded from a PPTX file.",
        );
        setState((prev) => ({ ...prev, error }));
        onExportError?.(error);
        return null;
      }

      setState({ isExporting: true, error: null, lastResult: null });
      onExportStart?.();

      try {
        const result = await exportPptx(document, exportOptions);
        setState({ isExporting: false, error: null, lastResult: result });

        if (autoDownload) {
          await downloadBlob(result.blob, fileName);
        }

        onExportComplete?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ isExporting: false, error, lastResult: null });
        onExportError?.(error);
        return null;
      }
    },
    [document, downloadBlob],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    exportPresentation,
    exportAsBlob,
    exportAsBuffer,
    downloadBlob,
    clearError,
  };
}
