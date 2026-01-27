/**
 * @file Export presentation hook
 *
 * Provides export functionality for the presentation editor.
 */

import { useState, useCallback } from "react";
import { usePresentationEditor } from "../../context/presentation/PresentationEditorContext";
import { exportPptx, type ExportOptions, type ExportResult } from "@oxen/pptx/exporter/pptx-exporter";

// =============================================================================
// File System Access API Types (for browsers that support it)
// =============================================================================

type FileSystemWritableFileStream = {
  write(data: Blob | ArrayBuffer | ArrayBufferView | string): Promise<void>;
  close(): Promise<void>;
};

type FileSystemFileHandle = {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

type WindowWithFileSystem = Window & {
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
};

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
   * Download a blob as file using File System Access API when available.
   *
   * File System Access API (showSaveFilePicker) provides reliable completion detection.
   * Falls back to anchor download for unsupported browsers.
   */
  const downloadBlob = useCallback(async (blob: Blob, fileName: string = "presentation.pptx") => {
    // Try File System Access API first (Chrome, Edge)
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as WindowWithFileSystem).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: "PowerPoint Presentation",
            accept: {
              "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return; // Write completed successfully
      } catch (err) {
        // User cancelled or API unavailable - fall through to legacy method
        if ((err as Error).name === "AbortError") {
          return; // User cancelled, don't fall back
        }
        // Other errors: fall through to legacy method
      }
    }

    // Fallback: anchor download (Firefox, Safari, etc.)
    // Keep URL alive longer since we can't detect completion
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    // Delay revocation - 60s should be enough for most downloads to start
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  }, []);

  /**
   * Export presentation as Blob without download
   */
  const exportAsBlob = useCallback(
    async (options?: ExportOptions): Promise<Blob | null> => {
      if (!document.presentationFile) {
        const error = new Error(
          "Cannot export: presentation file is not available. " +
            "Ensure the presentation was loaded from a PPTX file."
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
    [document]
  );

  /**
   * Export presentation as ArrayBuffer
   */
  const exportAsBuffer = useCallback(
    async (options?: ExportOptions): Promise<ArrayBuffer | null> => {
      const blob = await exportAsBlob(options);
      if (!blob) return null;
      return blob.arrayBuffer();
    },
    [exportAsBlob]
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
            "Ensure the presentation was loaded from a PPTX file."
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
    [document, downloadBlob]
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
