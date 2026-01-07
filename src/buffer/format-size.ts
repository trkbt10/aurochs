/**
 * @file File size formatting utilities
 */

/**
 * Format byte count as human-readable string.
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 KB", "2.3 MB")
 *
 * @example
 * formatSize(1024)      // "1.0 KB"
 * formatSize(1048576)   // "1.0 MB"
 * formatSize(undefined) // "—"
 */
export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
