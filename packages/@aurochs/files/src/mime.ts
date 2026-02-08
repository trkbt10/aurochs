/**
 * @file MIME type utilities
 */

/** MIME type mappings by file extension */
const MIME_TYPES: Readonly<Record<string, string>> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
  ico: "image/x-icon",
  webp: "image/webp",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  aac: "audio/aac",
  // Documents
  pdf: "application/pdf",
};

/** Default MIME type for unknown extensions */
const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * Get MIME type from file extension.
 * @param extension - File extension (without dot)
 * @returns MIME type or default "application/octet-stream"
 */
export function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] ?? DEFAULT_MIME_TYPE;
}

/**
 * Get MIME type from file path.
 * @param path - File path
 * @returns MIME type or undefined if unknown
 */
export function getMimeTypeFromPath(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === undefined) {
    return undefined;
  }
  return MIME_TYPES[ext];
}
