/**
 * @file Export hook for fig files
 *
 * Wraps the export pipeline with React state management.
 */

import { useState, useCallback } from "react";
import { exportFig } from "@aurochs-builder/fig/export";
import type { FigExportOptions, FigExportResult } from "@aurochs-builder/fig/export";
import { useFigEditor } from "../context/FigEditorContext";

type UseExportFigResult = {
  readonly exportDocument: (options?: FigExportOptions) => Promise<FigExportResult>;
  readonly isExporting: boolean;
  readonly lastResult: FigExportResult | undefined;
  readonly error: Error | undefined;
};

/**
 * Hook for exporting the current fig document.
 */
export function useExportFig(): UseExportFigResult {
  const { document } = useFigEditor();
  const [isExporting, setIsExporting] = useState(false);
  const [lastResult, setLastResult] = useState<FigExportResult | undefined>();
  const [error, setError] = useState<Error | undefined>();

  const exportDocument = useCallback(
    async (options?: FigExportOptions): Promise<FigExportResult> => {
      setIsExporting(true);
      setError(undefined);

      try {
        const result = await exportFig(document, options);
        setLastResult(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    [document],
  );

  return { exportDocument, isExporting, lastResult, error };
}
