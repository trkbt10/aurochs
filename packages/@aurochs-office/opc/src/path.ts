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
 * Compute a relative target path from a source part to a target part
 * within an OPC package.
 *
 * This is the inverse of {@link resolveRelationshipTargetPath}: given two
 * absolute package paths, it produces the relative URI reference that would
 * appear in a Relationship/@Target attribute.
 *
 * @param sourcePart - Absolute package path of the source part (e.g., "xl/worksheets/sheet1.xml")
 * @param targetPart - Absolute package path of the target part (e.g., "xl/drawings/drawing1.xml")
 * @returns Relative target URI (e.g., "../drawings/drawing1.xml")
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function buildRelativeTarget(sourcePart: string, targetPart: string): string {
  const sourceDir = dirnamePosixPath(sourcePart);
  const targetDir = dirnamePosixPath(targetPart);
  const targetFile = basenamePosixPath(targetPart);

  if (sourceDir === targetDir) {
    return targetFile;
  }

  const sourceParts = sourceDir === "." ? [] : sourceDir.split("/");
  const targetParts = targetDir === "." ? [] : targetDir.split("/");

  // Find common prefix length
  let common = 0;
  while (common < sourceParts.length && common < targetParts.length && sourceParts[common] === targetParts[common]) {
    common++;
  }

  const ups = sourceParts.length - common;
  const downs = targetParts.slice(common);
  return [...Array(ups).fill(".."), ...downs, targetFile].join("/");
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

