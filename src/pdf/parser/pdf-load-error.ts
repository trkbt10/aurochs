/**
 * @file src/pdf/parser/pdf-load-error.ts
 */

export type PdfLoadPurpose = "parse" | "inspect";

export type PdfLoadEncryption =
  | { readonly mode: "reject" }
  | { readonly mode: "ignore" }
  | { readonly mode: "password"; readonly password: string };

export type PdfLoadOptions = Readonly<{
  /**
   * Why the PDF is being loaded.
   * Used to keep call sites explicit and to preserve flexibility for future behaviors.
   */
  readonly purpose: PdfLoadPurpose;
  /** How to handle encrypted PDFs. */
  readonly encryption: PdfLoadEncryption;
  /**
   * Historically forwarded to pdf-lib. Kept for API stability.
   * Native loader ignores this field.
   */
  readonly updateMetadata: boolean;
}>;

export type PdfLoadErrorCode = "INVALID_PDF" | "ENCRYPTED_PDF" | "PARSE_ERROR";











/** Error thrown when loading/parsing a PDF fails. */
export class PdfLoadError extends Error {
  constructor(
    message: string,
    public readonly code: PdfLoadErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PdfLoadError";
  }
}
