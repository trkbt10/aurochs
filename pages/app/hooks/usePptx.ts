/**
 * @file PPTX loading hook for the pages app.
 */

import { useCallback } from "react";
import { loadPptxFromFile, loadPptxFromUrl, type LoadedPresentation } from "@aurochs-office/pptx/app";
import { useFileLoader } from "./useFileLoader";

/**
 * Manage PPTX loading state and fetch helpers for the pages app.
 */
export function usePptx() {
  const { load, data, ...rest } = useFileLoader<LoadedPresentation>("Failed to load PPTX");

  const loadFromFile = useCallback(
    (file: File) => load(file.name, () => loadPptxFromFile(file)),
    [load],
  );

  const loadFromUrl = useCallback(
    (url: string, name?: string) => {
      const fileName = name || url.split("/").pop() || "presentation.pptx";
      return load(fileName, () => loadPptxFromUrl(url));
    },
    [load],
  );

  return {
    ...rest,
    presentation: data,
    loadFromFile,
    loadFromUrl,
  };
}
