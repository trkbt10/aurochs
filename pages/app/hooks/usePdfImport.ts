import { useCallback, useState } from "react";
import {
  importPdfFromFile,
  importPdfFromUrl,
  PdfImportError,
  type PdfImportOptions,
  type PdfImportResult,
} from "@oxen-converters/pdf-to-pptx/importer/pdf-importer";
import type { PresentationDocument } from "@oxen-office/pptx/app";

type PdfImportDeps = {
  readonly importPdfFromFile: typeof importPdfFromFile;
  readonly importPdfFromUrl: typeof importPdfFromUrl;
  readonly PdfImportError: typeof PdfImportError;
};

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

function toPdfImportError(args: {
  readonly err: unknown;
  readonly code: "PARSE_ERROR" | "FETCH_ERROR";
  readonly PdfImportErrorCtor: typeof PdfImportError;
}): PdfImportError {
  const { err, code, PdfImportErrorCtor } = args;
  if (err instanceof PdfImportErrorCtor) {
    return err;
  }
  const message = err instanceof Error ? err.message : String(err);
  return new PdfImportErrorCtor(message, code);
}











function usePdfImport(deps: Partial<PdfImportDeps> = {}): UsePdfImportReturn {
  const {
    importPdfFromFile: importPdfFromFileImpl = importPdfFromFile,
    importPdfFromUrl: importPdfFromUrlImpl = importPdfFromUrl,
    PdfImportError: PdfImportErrorCtor = PdfImportError,
  } = deps;

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
        const result = await importPdfFromFileImpl(file, options);

        setState({
          status: "success",
          result,
          error: null,
          progress: null,
        });

        return result.document;
      } catch (err) {
        const error = toPdfImportError({ err, code: "PARSE_ERROR", PdfImportErrorCtor });

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
        const result = await importPdfFromUrlImpl(url, options);

        setState({
          status: "success",
          result,
          error: null,
          progress: null,
        });

        return result.document;
      } catch (err) {
        const error = toPdfImportError({ err, code: "FETCH_ERROR", PdfImportErrorCtor });

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
