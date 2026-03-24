/**
 * @file DOCX resource pre-loading
 *
 * Registers document resources (images, embedded objects) into ResourceStore
 * during parse time, so render code can use resourceStore.toDataUrl() directly.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.19 (w:drawing)
 */

import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { getMimeTypeFromPath } from "@aurochs/files";

/**
 * Resolve target path from DOCX relationship target.
 * Handles absolute paths (starting with /) and relative paths (relative to word/).
 */
function resolveTargetPath(target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }
  return `word/${target}`;
}

/** Image relationship types that should be pre-loaded */
const IMAGE_REL_TYPES = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  "http://schemas.microsoft.com/office/2007/relationships/hdphoto",
]);

/**
 * Register all image resources from DOCX relationships into ResourceStore.
 *
 * Reads binary data from the package and stores it with MIME type,
 * so render code can use resourceStore.toDataUrl() without re-reading.
 *
 * @param relationships - Document relationships (rId → { target, type })
 * @param readFile - Function to read binary content from the DOCX package
 * @param resourceStore - ResourceStore to register resources into
 */
export function registerDocxResources(
  relationships: ReadonlyMap<string, { target: string; type: string }>,
  readFile: (path: string) => Uint8Array | null,
  resourceStore: ResourceStore,
): void {
  for (const [rId, rel] of relationships) {
    if (!IMAGE_REL_TYPES.has(rel.type)) {
      continue;
    }

    if (resourceStore.has(rId)) {
      continue;
    }

    const targetPath = resolveTargetPath(rel.target);
    const content = readFile(targetPath);
    if (content === null) {
      continue;
    }

    const mimeType = getMimeTypeFromPath(targetPath) ?? "application/octet-stream";

    resourceStore.set(rId, {
      kind: "image",
      source: "parsed",
      data: content.buffer as ArrayBuffer,
      mimeType,
      path: targetPath,
    });
  }
}
