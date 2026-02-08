/**
 * @file OPC relationship Target path resolution
 *
 * Resolves Relationship/@Target (a URI reference) to a concrete package path
 * relative to the source part.
 *
 * This follows RFC 3986 relative resolution (merge paths + remove dot segments),
 * as used by ECMA-376 Part 2 (OPC) relationships.
 *
 * Note: This helper is for *internal* relationship targets. External targets
 * (e.g. http(s)://...) should be handled by checking TargetMode="External"
 * before calling this function.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 */

function getParentDirectory(path: string): string {
  if (path.endsWith("/")) {
    return path;
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return path.substring(0, lastSlash + 1);
}

function removeDotSegments(path: string): string {
  const segments = path.split("/");
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      if (result.length > 0) {
        result.pop();
      }
      continue;
    }
    if (segment === "." || segment === "") {
      continue;
    }
    result.push(segment);
  }

  return result.join("/");
}

function isAbsoluteIri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

/**
 * Resolve an OPC relationship Target path against a source part path.
 *
 * @param sourcePartPath - Source part path within the package (e.g. "ppt/slides/slide1.xml")
 * @param target - Relationship Target (e.g. "../media/image1.png")
 * @returns Resolved package path without a leading slash (e.g. "ppt/media/image1.png")
 */
export function resolveRelationshipTargetPath(sourcePartPath: string, target: string): string {
  if (!sourcePartPath) {
    throw new Error("sourcePartPath is required");
  }
  if (!target) {
    throw new Error("target is required");
  }
  if (isAbsoluteIri(target)) {
    throw new Error(`External/absolute target is not supported here: ${target}`);
  }

  // In OOXML ZIP packages we store paths without a leading slash.
  // Relationship targets that start with "/" are "absolute-path references"
  // per RFC 3986, so we drop the leading "/" before normalizing.
  if (target.startsWith("/")) {
    return removeDotSegments(target.substring(1));
  }

  const baseDir = getParentDirectory(sourcePartPath);
  return removeDotSegments(baseDir + target);
}

