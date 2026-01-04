/**
 * @file OPC utility functions
 *
 * Shared utilities for resource resolution and data URL creation.
 * Based on ECMA-376 Part 2 (Open Packaging Conventions).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 * @see RFC 3986 (Uniform Resource Identifier: Generic Syntax)
 */

// =============================================================================
// MIME Type Resolution
// =============================================================================

/**
 * Media MIME type mappings by file extension.
 * Based on common media types used in OOXML packages.
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  wmf: "image/x-wmf",
  emf: "image/x-emf",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/**
 * Get MIME type from file path extension.
 *
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

// =============================================================================
// Base64 Encoding
// =============================================================================

/**
 * Convert ArrayBuffer to base64 string.
 *
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =============================================================================
// Data URL Creation
// =============================================================================

/**
 * Create a data URL from ArrayBuffer content.
 *
 * @param data - File content as ArrayBuffer
 * @param path - File path (used to determine MIME type)
 * @returns Data URL string
 */
export function createDataUrl(data: ArrayBuffer, path: string): string {
  const mimeType = getMimeTypeFromPath(path) ?? "application/octet-stream";
  const base64 = arrayBufferToBase64(data);
  return `data:${mimeType};base64,${base64}`;
}

// =============================================================================
// RFC 3986 Path Resolution
// =============================================================================

/**
 * Resolve a relative URI reference against a base URI.
 *
 * Implements RFC 3986 Section 5.2.3 (Merge Paths) and 5.2.4 (Remove Dot Segments).
 * This is the correct way to resolve OPC relationship Target attributes.
 *
 * @param basePath - Base path (source part path, e.g., "ppt/slides/slide1.xml")
 * @param reference - Relative URI reference (e.g., "../media/image1.png")
 * @returns Resolved absolute path (e.g., "ppt/media/image1.png")
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 *
 * @example
 * resolveRelativePath("ppt/slides/slide1.xml", "../media/image1.png")
 * // => "ppt/media/image1.png"
 *
 * resolveRelativePath("ppt/diagrams/drawing1.xml", "../media/image2.png")
 * // => "ppt/media/image2.png"
 */
export function resolveRelativePath(basePath: string, reference: string): string {
  // If reference is already absolute (starts with /), return without leading slash
  if (reference.startsWith("/")) {
    return reference.substring(1);
  }

  // If reference doesn't contain relative segments, append to base directory
  if (!reference.startsWith("../") && !reference.startsWith("./")) {
    const baseDir = getParentDirectory(basePath);
    return baseDir + reference;
  }

  // RFC 3986 Section 5.2.3: Merge Paths
  const baseDir = getParentDirectory(basePath);
  const merged = baseDir + reference;

  // RFC 3986 Section 5.2.4: Remove Dot Segments
  return removeDotSegments(merged);
}

/**
 * Get the parent directory of a path.
 *
 * @param path - File path or directory path (with trailing slash)
 * @returns Parent directory path (with trailing slash)
 */
function getParentDirectory(path: string): string {
  // If path ends with /, it's already a directory - return as-is
  if (path.endsWith("/")) {
    return path;
  }

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return path.substring(0, lastSlash + 1);
}

/**
 * Remove dot segments from a path per RFC 3986 Section 5.2.4.
 *
 * @param path - Path with potential dot segments
 * @returns Normalized path
 */
function removeDotSegments(path: string): string {
  const segments = path.split("/");
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      // Go up one level
      if (result.length > 0) {
        result.pop();
      }
    } else if (segment !== "." && segment !== "") {
      // Add normal segment
      result.push(segment);
    }
  }

  return result.join("/");
}

/**
 * Normalize a path within an OPC package.
 *
 * This is a higher-level function that handles common OOXML path patterns.
 * It assumes paths are relative to the package root or use "../" notation.
 *
 * @param path - Path to normalize
 * @returns Normalized path starting from package root (e.g., "ppt/...")
 */
export function normalizePath(path: string): string {
  // If already starts with ppt/, return as-is
  if (path.startsWith("ppt/")) {
    return path;
  }

  // Handle absolute paths (rare in OOXML)
  if (path.startsWith("/")) {
    return path.substring(1);
  }

  // Handle ../xxx patterns (assume base is under ppt/)
  // This is a fallback for cases where we don't have the source path
  if (path.startsWith("../")) {
    // Typical case: ../media/xxx.png from ppt/slides/slide1.xml
    // We can't resolve without knowing the source, but we can make an educated guess
    // that most references go to ppt/xxx
    return "ppt/" + path.substring(3);
  }

  return path;
}
