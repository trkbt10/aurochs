/**
 * @file OOXML/OPC part path helpers (POSIX-style)
 *
 * OOXML packages (OPC) use forward-slash paths (e.g. `xl/workbook.xml`) inside ZIP files.
 * This module provides a tiny, browser-safe subset of Node's `path.posix` utilities.
 *
 * It intentionally avoids importing `node:path` so it can be used from client code (Vite).
 *
 * @see ECMA-376 Part 2 (OPC) - Package structure and relationships
 */

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

