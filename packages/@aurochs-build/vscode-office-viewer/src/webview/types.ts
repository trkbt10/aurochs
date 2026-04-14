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
  | PdfMetaMessage
  | PdfPageResponseMessage
  | ErrorMessage;

export type ErrorMessage = {
  readonly type: "error";
  readonly title: string;
  readonly message: string;
};

/** Message types sent from webview to extension. */
export type WebviewToExtensionMessage = WebviewReadyMessage | PdfPageRequestMessage;

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

/**
 * Sent for large PDFs: delivers only metadata (page count + dimensions)
 * so the viewer can render immediately without waiting for all pages.
 * Individual page SVGs are requested on demand via PdfPageRequestMessage.
 */
export type PdfMetaMessage = {
  readonly type: "pdfMeta";
  readonly fileName: string;
  readonly pageCount: number;
  /** First page SVG, pre-rendered for instant display. */
  readonly firstPageSvg: string;
};

/** Webview → Extension: request a page's SVG. */
export type PdfPageRequestMessage = {
  readonly type: "requestPdfPage";
  /** 0-based page index. */
  readonly pageIndex: number;
};

/** Extension → Webview: response with a rendered page SVG. */
export type PdfPageResponseMessage = {
  readonly type: "pdfPage";
  /** 0-based page index. */
  readonly pageIndex: number;
  readonly svg: string;
};
