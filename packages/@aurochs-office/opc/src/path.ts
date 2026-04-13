/**
 * @file OOXML/OPC part path helpers (POSIX-style)
 *
 * OOXML packages (OPC) use forward-slash paths (e.g. `xl/workbook.xml`) inside ZIP files.
 * This module provides a tiny, browser-safe subset of Node's `path.posix` utilities
 * plus OPC-specific path functions (relationship path, relative target).
 *
 * All functions that accept OPC package paths validate that the input
 * does not contain backslashes, null bytes, or absolute prefixes unless
 * explicitly allowed by the OPC specification.
 *
 * It intentionally avoids importing `node:path` so it can be used from client code (Vite).
 *
 * @see ECMA-376 Part 2 (OPC) - Package structure and relationships
 */

// =============================================================================
// Validation
// =============================================================================

/**
 * Assert that a value is a non-empty OPC package path.
 *
 * OPC package paths:
 * - Must not be empty
 * - Must not contain backslashes (ECMA-376 Part 2, §6.2.2.2)
 * - Must not contain null bytes
 *
 * @throws Error when the path is invalid
 */
function assertPackagePath(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  if (value.includes("\\")) {
    throw new Error(`${label} must not contain backslashes: ${value}`);
  }
  if (value.includes("\0")) {
    throw new Error(`${label} must not contain null bytes`);
  }
}

/**
 * Check whether a string is an absolute IRI (has a scheme like "http:").
 *
 * @see RFC 3986, Section 3.1 (Scheme)
 */
export function isAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

// =============================================================================
// Basic POSIX Path Utilities
// =============================================================================

/**
 * Join path segments using `/`.
 *
 * This does not automatically normalize `.`/`..` segments; call `normalizePosixPath()` when needed.
 *
 * @param parts - Path segments
 * @returns Joined path
 */
export function joinPosixPath(...parts: readonly string[]): string {
  const normalizedParts = parts.filter((part) => part.length > 0);
  if (normalizedParts.length === 0) {
    return "";
  }
  return normalizedParts.join("/").replace(/\/{2,}/gu, "/");
}

/**
 * Return the directory name portion of a POSIX path.
 *
 * @param p - Path
 * @returns Directory name (no trailing slash except root)
 */
export function dirnamePosixPath(p: string): string {
  const trimmed = p.replace(/\/+$/gu, "");
  const index = trimmed.lastIndexOf("/");
  if (index === -1) {
    return ".";
  }
  if (index === 0) {
    return "/";
  }
  return trimmed.slice(0, index);
}

/**
 * Return the base name portion of a POSIX path.
 *
 * @param p - Path
 * @returns Base name
 */
export function basenamePosixPath(p: string): string {
  const trimmed = p.replace(/\/+$/gu, "");
  const index = trimmed.lastIndexOf("/");
  return index === -1 ? trimmed : trimmed.slice(index + 1);
}

/**
 * Normalize a POSIX path by resolving `.` and `..` segments.
 *
 * For absolute paths (starting with `/`), `..` beyond the root is silently dropped.
 * For relative paths, leading `..` segments are preserved.
 *
 * @param p - Path
 * @returns Normalized path (keeps leading `/` if present)
 */
export function normalizePosixPath(p: string): string {
  const absolute = p.startsWith("/");
  const parts = p.split("/").filter((part) => part.length > 0);
  const stack = parts.reduce<string[]>((acc, part) => {
    if (part === ".") {
      return acc;
    }
    if (part === "..") {
      if (acc.length > 0 && acc[acc.length - 1] !== "..") {
        acc.pop();
        return acc;
      }
      if (!absolute) {
        acc.push("..");
      }
      return acc;
    }
    acc.push(part);
    return acc;
  }, []);

  const joined = stack.join("/");
  if (absolute) {
    return `/${joined}`;
  }
  return joined.length === 0 ? "." : joined;
}

// =============================================================================
// OPC Relationship Path Utilities
// =============================================================================

/**
 * Compute a relative target path from a source part to a target part
 * within an OPC package.
 *
 * This is the inverse of `resolveRelationshipTargetPath`: given two
 * absolute package paths, it produces the relative URI reference that would
 * appear in a `Relationship/@Target` attribute.
 *
 * @param sourcePart - Absolute package path of the source part (e.g., "xl/worksheets/sheet1.xml")
 * @param targetPart - Absolute package path of the target part (e.g., "xl/drawings/drawing1.xml")
 * @returns Relative target URI (e.g., "../drawings/drawing1.xml")
 *
 * @throws Error when either path is empty, contains backslashes, or null bytes
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function buildRelativeTarget(sourcePart: string, targetPart: string): string {
  assertPackagePath(sourcePart, "sourcePart");
  assertPackagePath(targetPart, "targetPart");

  const sourceDir = dirnamePosixPath(sourcePart);
  const targetDir = dirnamePosixPath(targetPart);
  const targetFile = basenamePosixPath(targetPart);

  if (sourceDir === targetDir) {
    return targetFile;
  }

  const sourceParts = sourceDir === "." ? [] : sourceDir.split("/");
  const targetParts = targetDir === "." ? [] : targetDir.split("/");

  // Find common prefix length
  // eslint-disable-next-line no-restricted-syntax -- mutable counter for while-loop prefix scan; no array method equivalent
  let common = 0;
  while (common < sourceParts.length && common < targetParts.length && sourceParts[common] === targetParts[common]) {
    common++;
  }

  const ups = sourceParts.length - common;
  const downs = targetParts.slice(common);
  return [...Array(ups).fill(".."), ...downs, targetFile].join("/");
}

/**
 * Compute the OPC relationship part path for a given package part.
 *
 * Per ECMA-376 Part 2, §9.2, relationships for a part are stored at
 * `{directory}/_rels/{filename}.rels`.
 *
 * @param partPath - Package part path (e.g., "xl/worksheets/sheet1.xml")
 * @returns Relationship part path (e.g., "xl/worksheets/_rels/sheet1.xml.rels")
 *
 * @throws Error when the path is empty, contains backslashes, or null bytes
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationship Part Naming)
 */
export function getRelationshipPartPath(partPath: string): string {
  assertPackagePath(partPath, "partPath");

  const dir = dirnamePosixPath(partPath);
  const filename = basenamePosixPath(partPath);

  if (dir === ".") {
    return `_rels/${filename}.rels`;
  }
  return `${dir}/_rels/${filename}.rels`;
}
