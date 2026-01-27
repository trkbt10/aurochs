/**
 * @file MIME type utilities
 */

/** MIME type mappings by file extension */
const MIME_TYPES: Readonly<Record<string, string>> = {
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
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
};

/** Default MIME type for unknown extensions */
const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * Get MIME type from file extension
 */
export function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] ?? DEFAULT_MIME_TYPE;
}
