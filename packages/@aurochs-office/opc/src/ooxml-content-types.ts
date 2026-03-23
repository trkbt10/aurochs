/**
 * @file OOXML Internal Content Types
 *
 * Content types used inside OOXML packages ([Content_Types].xml).
 * These are the `.main+xml` format used for internal package parts.
 *
 * Note: These are different from HTTP download MIME types (`.12` format).
 * - Internal: `application/vnd.ms-excel.sheet.macroEnabled.main+xml`
 * - Download: `application/vnd.ms-excel.sheet.macroEnabled.12`
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see ECMA-376 Part 1, Section 15 (PresentationML)
 * @see ECMA-376 Part 1, Section 11 (WordprocessingML)
 */

// =============================================================================
// SpreadsheetML Content Types (XLSX/XLSM)
// =============================================================================

/**
 * SpreadsheetML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */
export const SPREADSHEETML_CONTENT_TYPES = {
  /** Main workbook */
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  /** Macro-enabled workbook (xlsm) */
  workbookMacroEnabled: "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
  /** Template workbook (xltx) */
  workbookTemplate: "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml",
  /** Macro-enabled template workbook (xltm) */
  workbookMacroEnabledTemplate: "application/vnd.ms-excel.template.macroEnabled.main+xml",
  /** Worksheet */
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  /** Styles */
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  /** Shared strings */
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
  /** Excel macro sheet */
  macrosheet: "application/vnd.ms-excel.macrosheet+xml",
} as const;

// =============================================================================
// PresentationML Content Types (PPTX/PPTM/PPSM)
// =============================================================================

/**
 * PresentationML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 15 (PresentationML)
 */
export const PRESENTATIONML_CONTENT_TYPES = {
  /** Main presentation */
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  /** Macro-enabled presentation (pptm) */
  presentationMacroEnabled: "application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml",
  /** Macro-enabled slideshow (ppsm) */
  slideshowMacroEnabled: "application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml",
  /** Slide */
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  /** Slide layout */
  slideLayout: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  /** Slide master */
  slideMaster: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  /** Notes slide */
  notesSlide: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  /** Comments */
  comments: "application/vnd.openxmlformats-officedocument.presentationml.comments+xml",
  /** Comment authors */
  commentAuthors: "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",
} as const;

// =============================================================================
// WordprocessingML Content Types (DOCX/DOCM)
// =============================================================================

/**
 * WordprocessingML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 11 (WordprocessingML)
 */
export const WORDPROCESSINGML_CONTENT_TYPES = {
  /** Main document */
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  /** Macro-enabled document (docm) */
  documentMacroEnabled: "application/vnd.ms-word.document.macroEnabled.main+xml",
  /** Styles */
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  /** Numbering */
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  /** Font table */
  fontTable: "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  /** Settings */
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  /** Web settings */
  webSettings: "application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml",
  /** Header */
  header: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
  /** Footer */
  footer: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
  /** Footnotes */
  footnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
  /** Endnotes */
  endnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
  /** Comments */
  comments: "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
} as const;

// =============================================================================
// DrawingML Content Types (Shared)
// =============================================================================

/**
 * DrawingML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 20 (DrawingML)
 */
export const DRAWINGML_CONTENT_TYPES = {
  /** Theme */
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  /** Chart */
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  /** Drawing (SpreadsheetML / WordprocessingML) */
  drawing: "application/vnd.openxmlformats-officedocument.drawing+xml",
} as const;

// =============================================================================
// OLE Object Content Types
// =============================================================================

/**
 * Content types for embedded OLE objects.
 *
 * These are used for embedded Office documents (not macro-enabled).
 */
export const OLE_CONTENT_TYPES = {
  /** Embedded Excel workbook */
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  /** Embedded Word document */
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  /** Embedded PowerPoint presentation */
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

// =============================================================================
// Media Content Types (Image / Video / Audio)
// =============================================================================

/**
 * Image content types per ECMA-376 Part 1 §15.2.2.
 *
 * These are the image MIME types that may appear in [Content_Types].xml
 * as Default entries for embedded media within OOXML packages.
 */
export const IMAGE_CONTENT_TYPES = {
  /** @see ECMA-376 Part 1 §15.2.2.11 */
  png: "image/png",
  /** @see ECMA-376 Part 1 §15.2.2.8 */
  jpeg: "image/jpeg",
  /** @see ECMA-376 Part 1 §15.2.2.7 */
  gif: "image/gif",
  /** @see ECMA-376 Part 1 §15.2.2.1 */
  bmp: "image/bmp",
  /** @see ECMA-376 Part 1 §15.2.2.15 */
  tiff: "image/tiff",
  /** @see ECMA-376 Part 1 §15.2.2.5 */
  emf: "image/x-emf",
  /** @see ECMA-376 Part 1 §15.2.2.16 */
  wmf: "image/x-wmf",
  /** Office 365 extension (not in ECMA-376) */
  svg: "image/svg+xml",
} as const;

/**
 * Video content types supported by Office applications.
 */
export const VIDEO_CONTENT_TYPES = {
  mp4: "video/mp4",
  webm: "video/webm",
  quicktime: "video/quicktime",
} as const;

/**
 * Audio content types supported by Office applications.
 */
export const AUDIO_CONTENT_TYPES = {
  mpeg: "audio/mpeg",
  wav: "audio/wav",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
} as const;

/**
 * Union type of all media content types (image, video, audio)
 * used in OOXML [Content_Types].xml Default entries.
 */
export type MediaContentType =
  | (typeof IMAGE_CONTENT_TYPES)[keyof typeof IMAGE_CONTENT_TYPES]
  | (typeof VIDEO_CONTENT_TYPES)[keyof typeof VIDEO_CONTENT_TYPES]
  | (typeof AUDIO_CONTENT_TYPES)[keyof typeof AUDIO_CONTENT_TYPES];

/**
 * Mapping from file extension to image MediaContentType.
 * Includes aliases (e.g. ".jpg" for JPEG, ".tif" for TIFF).
 */
export const IMAGE_EXTENSION_TO_CONTENT_TYPE: Record<string, MediaContentType> = {
  ".png": IMAGE_CONTENT_TYPES.png,
  ".jpg": IMAGE_CONTENT_TYPES.jpeg,
  ".jpeg": IMAGE_CONTENT_TYPES.jpeg,
  ".gif": IMAGE_CONTENT_TYPES.gif,
  ".bmp": IMAGE_CONTENT_TYPES.bmp,
  ".tiff": IMAGE_CONTENT_TYPES.tiff,
  ".tif": IMAGE_CONTENT_TYPES.tiff,
  ".emf": IMAGE_CONTENT_TYPES.emf,
  ".wmf": IMAGE_CONTENT_TYPES.wmf,
  ".svg": IMAGE_CONTENT_TYPES.svg,
};

/**
 * Mapping from MediaContentType to file extension.
 * Used when embedding media into OOXML packages.
 */
const MEDIA_CONTENT_TYPE_TO_EXTENSION: Record<MediaContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-emf": "emf",
  "image/x-wmf": "wmf",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

/**
 * Infer file extension from a media content type.
 * Returns "bin" for unrecognized types.
 */
export function inferExtensionFromMediaContentType(contentType: string): string {
  return MEDIA_CONTENT_TYPE_TO_EXTENSION[contentType as MediaContentType] ?? "bin";
}

/**
 * Alias mapping for non-canonical MIME types to their canonical MediaContentType.
 *
 * Handles common variants (e.g. "image/jpg" → "image/jpeg", "audio/mp3" → "audio/mpeg")
 * that may appear in user input or data: URLs but are not themselves valid
 * OOXML content types.
 */
const MEDIA_CONTENT_TYPE_ALIASES: Record<string, MediaContentType> = {
  "image/jpg": "image/jpeg",
  "audio/mp3": "audio/mpeg",
};

/**
 * Normalize a MIME type string to a canonical MediaContentType.
 *
 * Accepts both canonical types (e.g. "image/png") and known aliases
 * (e.g. "image/jpg" → "image/jpeg"). Throws for unrecognized types.
 */
export function normalizeMediaContentType(mimeType: string): MediaContentType {
  // Check direct match
  if (mimeType in MEDIA_CONTENT_TYPE_TO_EXTENSION) {
    return mimeType as MediaContentType;
  }
  // Check alias
  const alias = MEDIA_CONTENT_TYPE_ALIASES[mimeType];
  if (alias) {
    return alias;
  }
  throw new Error(`Unsupported media content type: "${mimeType}"`);
}
