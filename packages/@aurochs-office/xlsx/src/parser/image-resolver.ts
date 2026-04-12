/**
 * @file Image Resolver
 *
 * Resolves image relationship IDs in XLSX drawings to ResourceStore entries.
 * Images referenced via blipRelId in drawing XML are resolved through the
 * drawing's relationships file to locate the binary image data in the package.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.25 (pic)
 * @see ECMA-376 Part 2, Section 9 (Relationships)
 */

import { getMimeTypeFromPath } from "@aurochs/files";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { XlsxDrawing, XlsxDrawingContent, XlsxPicture, XlsxGroupShape } from "../domain/drawing/types";
import { dirnamePosixPath, joinPosixPath, normalizePosixPath } from "@aurochs-office/opc";

// =============================================================================
// Types
// =============================================================================

/**
 * Binary file reader for image data.
 */
export type BinaryFileReader = (path: string) => ArrayBuffer | null;

/**
 * Parameters for resolving images in a drawing.
 */
export type ResolveDrawingImagesParams = {
  /** Drawing containing pictures with blipRelIds */
  readonly drawing: XlsxDrawing;
  /** Base path of the drawing XML (e.g., "xl/drawings/drawing1.xml") */
  readonly drawingPath: string;
  /** Drawing relationship map (relId → target) */
  readonly drawingRelationships: ReadonlyMap<string, string>;
  /** Binary file reader for the package */
  readonly readBinary: BinaryFileReader;
  /** Resource store to register images into */
  readonly resourceStore: ResourceStore;
};

// =============================================================================
// Helper Functions
// =============================================================================

function resolveTargetPath(basePath: string, target: string): string {
  const baseDir = dirnamePosixPath(basePath);
  const resolved = normalizePosixPath(joinPosixPath(baseDir, target));
  return resolved.startsWith("/") ? resolved.slice(1) : resolved;
}

// =============================================================================
// Image Collection
// =============================================================================

/**
 * Collect all blipRelIds from a drawing's content, including nested groups.
 */
export function collectImageRelIds(drawing: XlsxDrawing | undefined): readonly string[] {
  if (!drawing) {
    return [];
  }

  const relIds: string[] = [];

  function collectFromContent(content: XlsxDrawingContent | undefined): void {
    if (!content) {
      return;
    }

    switch (content.type) {
      case "picture": {
        const pic = content as XlsxPicture;
        if (pic.blipRelId) {
          relIds.push(pic.blipRelId);
        }
        break;
      }
      case "groupShape": {
        const group = content as XlsxGroupShape;
        for (const child of group.children) {
          collectFromContent(child);
        }
        break;
      }
    }
  }

  for (const anchor of drawing.anchors) {
    collectFromContent(anchor.content);
  }

  return relIds;
}

// =============================================================================
// Image Resolution
// =============================================================================

/**
 * Resolve and register drawing images into ResourceStore.
 *
 * For each picture in the drawing, resolves the blipRelId through the
 * drawing's relationships to locate the image file in the package,
 * reads the binary data, and registers it in the ResourceStore.
 *
 * @param params - Resolution parameters
 * @returns Updated drawing with imagePath set on pictures
 */
export function resolveDrawingImages(params: ResolveDrawingImagesParams): XlsxDrawing {
  const { drawing, drawingPath, drawingRelationships, readBinary, resourceStore } = params;

  const imageRelIds = collectImageRelIds(drawing);
  if (imageRelIds.length === 0) {
    return drawing;
  }

  // Register all images in ResourceStore
  for (const relId of imageRelIds) {
    if (resourceStore.has(relId)) {
      continue;
    }

    const target = drawingRelationships.get(relId);
    if (!target) {
      continue;
    }

    const imagePath = resolveTargetPath(drawingPath, target);
    const data = readBinary(imagePath);
    if (!data) {
      continue;
    }

    const mimeType = getMimeTypeFromPath(imagePath) ?? "application/octet-stream";
    resourceStore.set(relId, {
      kind: "image",
      source: "parsed",
      data,
      mimeType,
      path: imagePath,
    });
  }

  // Update drawing pictures with imagePath for contexts that use it directly
  return updateDrawingWithImagePaths(drawing, drawingPath, drawingRelationships);
}

/**
 * Update drawing content with resolved image paths.
 */
function updateDrawingWithImagePaths(
  drawing: XlsxDrawing,
  drawingPath: string,
  drawingRelationships: ReadonlyMap<string, string>,
): XlsxDrawing {
  const updatedAnchors = drawing.anchors.map((anchor) => {
    if (!anchor.content) {
      return anchor;
    }

    const updatedContent = updateContentImagePaths(anchor.content, drawingPath, drawingRelationships);
    if (updatedContent === anchor.content) {
      return anchor;
    }

    return { ...anchor, content: updatedContent };
  });

  return { anchors: updatedAnchors };
}

function updateContentImagePaths(
  content: XlsxDrawingContent,
  drawingPath: string,
  drawingRelationships: ReadonlyMap<string, string>,
): XlsxDrawingContent {
  if (content.type === "picture") {
    const pic = content as XlsxPicture;
    if (!pic.blipRelId) {
      return content;
    }

    const target = drawingRelationships.get(pic.blipRelId);
    if (!target) {
      return content;
    }

    const imagePath = resolveTargetPath(drawingPath, target);
    const mimeType = getMimeTypeFromPath(imagePath);
    return { ...pic, imagePath, ...(mimeType && { contentType: mimeType }) };
  }

  if (content.type === "groupShape") {
    const group = content as XlsxGroupShape;
    const updatedChildren = group.children.map((child) =>
      updateContentImagePaths(child, drawingPath, drawingRelationships),
    );
    return { ...group, children: updatedChildren };
  }

  return content;
}
