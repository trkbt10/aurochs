/**
 * @file Office Format MIME Types and Detection Utilities
 *
 * Centralized definitions for Office format MIME types and filename-based
 * format detection. Used by UI layers for proper file downloads.
 *
 * @see ECMA-376 Part 2 (OPC Content Types)
 * @see MS-OFFMACRO2 Section 2.2.1.3 (macro-enabled content types)
 */

// =============================================================================
// Spreadsheet Formats (Excel)
// =============================================================================

/**
 * Spreadsheet format extensions.
 */
export type SpreadsheetFormat = "xlsx" | "xlsm";

/**
 * MIME types for spreadsheet formats.
 */
export const SPREADSHEET_MIME_TYPES: Record<SpreadsheetFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
} as const;

/**
 * Human-readable descriptions for spreadsheet formats.
 */
export const SPREADSHEET_FORMAT_DESCRIPTIONS: Record<SpreadsheetFormat, string> = {
  xlsx: "Excel Workbook",
  xlsm: "Excel Macro-Enabled Workbook",
} as const;

/**
 * Detect spreadsheet format from filename.
 *
 * @param fileName - File name with extension
 * @returns Detected format (defaults to xlsx)
 */
export function detectSpreadsheetFormat(fileName: string): SpreadsheetFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsm")) return "xlsm";
  return "xlsx";
}

/**
 * Get MIME type for spreadsheet format.
 *
 * @param format - Spreadsheet format
 * @returns MIME type string
 */
export function getSpreadsheetMimeType(format: SpreadsheetFormat): string {
  return SPREADSHEET_MIME_TYPES[format];
}

/**
 * Get MIME type for spreadsheet file by filename.
 *
 * @param fileName - File name with extension
 * @returns MIME type string
 */
export function getSpreadsheetMimeTypeByFileName(fileName: string): string {
  return getSpreadsheetMimeType(detectSpreadsheetFormat(fileName));
}

/**
 * Get File System Access API file type filter for spreadsheet format.
 *
 * @param format - Spreadsheet format
 * @returns File picker type configuration
 */
export function getSpreadsheetFilePickerType(format: SpreadsheetFormat): {
  description: string;
  accept: Record<string, string[]>;
} {
  return {
    description: SPREADSHEET_FORMAT_DESCRIPTIONS[format],
    accept: { [SPREADSHEET_MIME_TYPES[format]]: [`.${format}`] },
  };
}

// =============================================================================
// Presentation Formats (PowerPoint)
// =============================================================================

/**
 * Presentation format extensions.
 */
export type PresentationFormat = "pptx" | "pptm" | "ppsm" | "ppsx";

/**
 * MIME types for presentation formats.
 */
export const PRESENTATION_MIME_TYPES: Record<PresentationFormat, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pptm: "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
  ppsm: "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
} as const;

/**
 * Human-readable descriptions for presentation formats.
 */
export const PRESENTATION_FORMAT_DESCRIPTIONS: Record<PresentationFormat, string> = {
  pptx: "PowerPoint Presentation",
  pptm: "PowerPoint Macro-Enabled Presentation",
  ppsm: "PowerPoint Macro-Enabled Show",
  ppsx: "PowerPoint Show",
} as const;

/**
 * Detect presentation format from filename.
 *
 * @param fileName - File name with extension
 * @returns Detected format (defaults to pptx)
 */
export function detectPresentationFormat(fileName: string): PresentationFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pptm")) return "pptm";
  if (lower.endsWith(".ppsm")) return "ppsm";
  if (lower.endsWith(".ppsx")) return "ppsx";
  return "pptx";
}

/**
 * Get MIME type for presentation format.
 *
 * @param format - Presentation format
 * @returns MIME type string
 */
export function getPresentationMimeType(format: PresentationFormat): string {
  return PRESENTATION_MIME_TYPES[format];
}

/**
 * Get MIME type for presentation file by filename.
 *
 * @param fileName - File name with extension
 * @returns MIME type string
 */
export function getPresentationMimeTypeByFileName(fileName: string): string {
  return getPresentationMimeType(detectPresentationFormat(fileName));
}

/**
 * Get File System Access API file type filter for presentation format.
 *
 * @param format - Presentation format
 * @returns File picker type configuration
 */
export function getPresentationFilePickerType(format: PresentationFormat): {
  description: string;
  accept: Record<string, string[]>;
} {
  return {
    description: PRESENTATION_FORMAT_DESCRIPTIONS[format],
    accept: { [PRESENTATION_MIME_TYPES[format]]: [`.${format}`] },
  };
}

// =============================================================================
// Document Formats (Word)
// =============================================================================

/**
 * Document format extensions.
 */
export type DocumentFormat = "docx" | "docm";

/**
 * MIME types for document formats.
 */
export const DOCUMENT_MIME_TYPES: Record<DocumentFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  docm: "application/vnd.ms-word.document.macroEnabled.12",
} as const;

/**
 * Human-readable descriptions for document formats.
 */
export const DOCUMENT_FORMAT_DESCRIPTIONS: Record<DocumentFormat, string> = {
  docx: "Word Document",
  docm: "Word Macro-Enabled Document",
} as const;

/**
 * Detect document format from filename.
 *
 * @param fileName - File name with extension
 * @returns Detected format (defaults to docx)
 */
export function detectDocumentFormat(fileName: string): DocumentFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docm")) return "docm";
  return "docx";
}

/**
 * Get MIME type for document format.
 *
 * @param format - Document format
 * @returns MIME type string
 */
export function getDocumentMimeType(format: DocumentFormat): string {
  return DOCUMENT_MIME_TYPES[format];
}

/**
 * Get MIME type for document file by filename.
 *
 * @param fileName - File name with extension
 * @returns MIME type string
 */
export function getDocumentMimeTypeByFileName(fileName: string): string {
  return getDocumentMimeType(detectDocumentFormat(fileName));
}

/**
 * Get File System Access API file type filter for document format.
 *
 * @param format - Document format
 * @returns File picker type configuration
 */
export function getDocumentFilePickerType(format: DocumentFormat): {
  description: string;
  accept: Record<string, string[]>;
} {
  return {
    description: DOCUMENT_FORMAT_DESCRIPTIONS[format],
    accept: { [DOCUMENT_MIME_TYPES[format]]: [`.${format}`] },
  };
}
