import { useCallback, useState } from "react";
import {
  importPdfFromFile,
  importPdfFromUrl,
  PdfImportError,
  type PdfImportOptions,
  type PdfImportResult,
} from "@oxen/pdf/importer/pdf-importer";
import type { PresentationDocument } from "@oxen/pptx/app";

type PdfImportState = {
  /** インポート状態 */
  readonly status: "idle" | "loading" | "success" | "error";
  /** インポート結果 */
  readonly result: PdfImportResult | null;
  /** エラー情報 */
  readonly error: PdfImportError | null;
  /** 進捗情報 */
  readonly progress: {
    readonly currentPage: number;
    readonly totalPages: number;
  } | null;
};

type UsePdfImportReturn = {
  /** 現在の状態 */
  readonly state: PdfImportState;
  /** Fileからインポート */
  readonly importFromFile: (file: File, options?: PdfImportOptions) => Promise<PresentationDocument | null>;
  /** URLからインポート */
  readonly importFromUrl: (url: string, options?: PdfImportOptions) => Promise<PresentationDocument | null>;
  /** 状態をリセット */
  readonly reset: () => void;
};

function usePdfImport(): UsePdfImportReturn {
  const [state, setState] = useState<PdfImportState>({
    status: "idle",
    result: null,
    error: null,
    progress: null,
  });

  const reset = useCallback(() => {
    setState({
      status: "idle",
      result: null,
      error: null,
      progress: null,
    });
  }, []);

  const importFromFile = useCallback(
    async (file: File, options?: PdfImportOptions): Promise<PresentationDocument | null> => {
      setState({
        status: "loading",
        result: null,
        error: null,
        progress: null,
      });

      try {
        const result = await importPdfFromFile(file, options);

        setState({
          status: "success",
          result,
          error: null,
          progress: null,
        });

        return result.document;
      } catch (err) {
        const error =
          err instanceof PdfImportError
            ? err
            : new PdfImportError(err instanceof Error ? err.message : String(err), "PARSE_ERROR");

        setState({
          status: "error",
          result: null,
          error,
          progress: null,
        });

        return null;
      }
    },
    [],
  );

  const importFromUrl = useCallback(
    async (url: string, options?: PdfImportOptions): Promise<PresentationDocument | null> => {
      setState({
        status: "loading",
        result: null,
        error: null,
        progress: null,
      });

      try {
        const result = await importPdfFromUrl(url, options);

        setState({
          status: "success",
          result,
          error: null,
          progress: null,
        });

        return result.document;
      } catch (err) {
        const error =
          err instanceof PdfImportError
            ? err
            : new PdfImportError(err instanceof Error ? err.message : String(err), "FETCH_ERROR");

        setState({
          status: "error",
          result: null,
          error,
          progress: null,
        });

        return null;
      }
    },
    [],
  );

  return {
    state,
    importFromFile,
    importFromUrl,
    reset,
  };
}

/**
 * エラーコードからユーザー向けメッセージを取得
 */
function getImportErrorMessage(error: PdfImportError): string {
  switch (error.code) {
    case "INVALID_PDF":
      return "このファイルは有効なPDFではありません。";
    case "ENCRYPTED_PDF":
      return "暗号化されたPDFは開けません。";
    case "PARSE_ERROR":
      return "PDFの解析中にエラーが発生しました。";
    case "CONVERSION_ERROR":
      return "PDFの変換中にエラーが発生しました。";
    case "FETCH_ERROR":
      return "PDFのダウンロードに失敗しました。";
    default:
      return error.message;
  }
}

/**
 * エラーがリトライ可能かどうか
 */
function isRetryableError(error: PdfImportError): boolean {
  return error.code === "FETCH_ERROR";
}

export type { PdfImportState, UsePdfImportReturn };
export { usePdfImport, getImportErrorMessage, isRetryableError };
