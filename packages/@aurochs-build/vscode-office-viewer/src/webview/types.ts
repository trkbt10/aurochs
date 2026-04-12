/**
 * @file Shared type definitions for extension ↔ webview communication.
 *
 * These types are used by both the Node-side extension providers
 * and the browser-side React webview app.
 */

/** Message types sent from extension to webview. */
export type ExtensionToWebviewMessage =
  | PptxDataMessage
  | XlsxDataMessage
  | DocxDataMessage
  | PdfDataMessage
  | ErrorMessage;

export type ErrorMessage = {
  readonly type: "error";
  readonly title: string;
  readonly message: string;
};

/** Message types sent from webview to extension. */
export type WebviewToExtensionMessage = WebviewReadyMessage;

export type WebviewReadyMessage = {
  readonly type: "ready";
};

export type PptxDataMessage = {
  readonly type: "pptx";
  readonly fileName: string;
  readonly slides: readonly string[];
  readonly width: number;
  readonly height: number;
};

export type XlsxDataMessage = {
  readonly type: "xlsx";
  readonly fileName: string;
  readonly sheets: readonly XlsxSheetData[];
};

export type XlsxSheetData = {
  readonly name: string;
  readonly html: string;
};

export type DocxDataMessage = {
  readonly type: "docx";
  readonly fileName: string;
  readonly html: string;
};

export type PdfDataMessage = {
  readonly type: "pdf";
  readonly fileName: string;
  readonly pages: readonly string[];
};
