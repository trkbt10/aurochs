/**
 * @file Office File Download Utilities
 *
 * Provides browser-based file download functionality for Office documents.
 * Supports both File System Access API (Chrome/Edge) and fallback anchor download.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

import {
  detectSpreadsheetFormat,
  detectPresentationFormat,
  detectDocumentFormat,
  getSpreadsheetMimeType,
  getDocumentMimeType,
  getSpreadsheetFilePickerType,
  getPresentationFilePickerType,
  getDocumentFilePickerType,
} from "./office-formats";

// =============================================================================
// File System Access API Types
// =============================================================================

/**
 * FileSystemWritableFileStream interface for File System Access API.
 */
type FileSystemWritableFileStream = {
  write(data: Blob | ArrayBuffer | ArrayBufferView | string): Promise<void>;
  close(): Promise<void>;
};

/**
 * FileSystemFileHandle interface for File System Access API.
 */
type FileSystemFileHandle = {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

/**
 * Options for showSaveFilePicker.
 */
type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

/**
 * Window with File System Access API support.
 */
type WindowWithFileSystem = Window & {
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
};

// =============================================================================
// Core Download Function
// =============================================================================

/**
 * Options for downloading a file.
 */
export type DownloadOptions = {
  /**
   * File picker type configuration for File System Access API.
   * If not provided, falls back to generic file download.
   */
  readonly filePickerType?: {
    description: string;
    accept: Record<string, string[]>;
  };
  /**
   * URL revocation delay in milliseconds for fallback anchor download.
   * Default: 60000 (60 seconds)
   */
  readonly revokeDelay?: number;
};

/**
 * Download a blob as a file using File System Access API when available.
 *
 * File System Access API (showSaveFilePicker) provides:
 * - Native save dialog
 * - Reliable completion detection
 * - User-chosen save location
 *
 * Falls back to anchor download for unsupported browsers (Firefox, Safari).
 *
 * @param blob - The blob to download
 * @param fileName - Suggested file name
 * @param options - Download options
 * @returns Promise that resolves when download is initiated (not completed for fallback)
 */
export async function downloadBlob(
  blob: Blob,
  fileName: string,
  options: DownloadOptions = {},
): Promise<void> {
  const { filePickerType, revokeDelay = 60000 } = options;

  // Try File System Access API first (Chrome, Edge)
  if ("showSaveFilePicker" in window && filePickerType) {
    try {
      const handle = await (window as WindowWithFileSystem).showSaveFilePicker({
        suggestedName: fileName,
        types: [filePickerType],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Write completed successfully
    } catch (err) {
      // User cancelled or API unavailable
      if ((err as Error).name === "AbortError") {
        return; // User cancelled, don't fall back
      }
      // Other errors: fall through to legacy method
    }
  }

  // Fallback: anchor download (Firefox, Safari, etc.)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revocation - can't detect completion with this method
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, revokeDelay);
}

// =============================================================================
// Spreadsheet Download
// =============================================================================

/**
 * Download spreadsheet data as an Excel file.
 *
 * Automatically detects format from filename and applies correct MIME type.
 *
 * @param data - The spreadsheet data (Uint8Array or ArrayBuffer)
 * @param fileName - File name with extension (.xlsx or .xlsm)
 */
export async function downloadSpreadsheet(
  data: Uint8Array | ArrayBuffer,
  fileName: string,
): Promise<void> {
  const format = detectSpreadsheetFormat(fileName);
  const mimeType = getSpreadsheetMimeType(format);
  const blob = new Blob([data instanceof Uint8Array ? new Uint8Array(data) : data], { type: mimeType });
  await downloadBlob(blob, fileName, {
    filePickerType: getSpreadsheetFilePickerType(format),
  });
}

// =============================================================================
// Presentation Download
// =============================================================================

/**
 * Download presentation data as a PowerPoint file.
 *
 * Automatically detects format from filename and applies correct MIME type.
 *
 * @param blob - The presentation blob
 * @param fileName - File name with extension (.pptx, .pptm, .ppsm, .ppsx)
 */
export async function downloadPresentation(
  blob: Blob,
  fileName: string,
): Promise<void> {
  const format = detectPresentationFormat(fileName);
  await downloadBlob(blob, fileName, {
    filePickerType: getPresentationFilePickerType(format),
  });
}

// =============================================================================
// Document Download
// =============================================================================

/**
 * Download document data as a Word file.
 *
 * Automatically detects format from filename and applies correct MIME type.
 *
 * @param data - The document data (Uint8Array or ArrayBuffer)
 * @param fileName - File name with extension (.docx or .docm)
 */
export async function downloadDocument(
  data: Uint8Array | ArrayBuffer,
  fileName: string,
): Promise<void> {
  const format = detectDocumentFormat(fileName);
  const mimeType = getDocumentMimeType(format);
  const blob = new Blob([data instanceof Uint8Array ? new Uint8Array(data) : data], { type: mimeType });
  await downloadBlob(blob, fileName, {
    filePickerType: getDocumentFilePickerType(format),
  });
}
