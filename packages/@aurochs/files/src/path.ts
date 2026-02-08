/**
 * @file File path utilities
 */

/**
 * Extract file extension from filename
 */
export function extractFileExtension(filename: string): string {
  return filename.substr((~-filename.lastIndexOf(".") >>> 0) + 2);
}

/**
 * Get filename without path
 */
export function getFilenameFromPath(filepath: string): string {
  const parts = filepath.split("/");
  return parts[parts.length - 1];
}

/**
 * Get filename without extension
 */
export function getFilenameWithoutExt(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}
