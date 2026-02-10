/**
 * @file DOCX loading hook for the pages app.
 */

import { useCallback } from "react";
import { loadDocxFromFile, type DocxDocument } from "@aurochs-office/docx";
import { useFileLoader } from "./useFileLoader";

/**
 * Manage DOCX loading state for the pages app.
 */
export function useDocx() {
  const { load, data, ...rest } = useFileLoader<DocxDocument>("Failed to load DOCX");

  const loadFromFile = useCallback(
    (file: File) => load(file.name, () => loadDocxFromFile(file)),
    [load],
  );

  return {
    ...rest,
    document: data,
    loadFromFile,
  };
}
