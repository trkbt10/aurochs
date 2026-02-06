/**
 * @file Image embedding into PPTX ZIP package
 */

import type { ZipPackage } from "@oxen/zip";
import type { PptEmbeddedImage, PptShape } from "../domain/types";
import { RT_IMAGE, type SlideRelationship } from "./presentation-xml";

/** Content type → file extension mapping. */
function contentTypeToExtension(contentType: string): string {
  const mapping: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/bmp": "bmp",
    "image/x-emf": "emf",
    "image/x-wmf": "wmf",
    "image/tiff": "tiff",
    "image/pict": "pict",
  };
  return mapping[contentType] ?? "png";
}

export type ImageEmbedResult = {
  /** Map from picture index → { rId, mediaPath } */
  readonly imageMap: Map<number, { rId: string; mediaPath: string }>;
  /** File extensions used (for [Content_Types].xml) */
  readonly extensions: readonly string[];
};

/**
 * Write all images used by a slide into the PPTX package
 * and return relationship info.
 */
export function embedSlideImages(
  pkg: ZipPackage,
  images: readonly PptEmbeddedImage[],
  usedImageIndices: ReadonlySet<number>,
  slideIndex: number,
  startRId: number,
): ImageEmbedResult {
  const imageMap = new Map<number, { rId: string; mediaPath: string }>();
  const extensions = new Set<string>();
  let rIdCounter = startRId;

  for (const idx of usedImageIndices) {
    const image = images.find(img => img.index === idx);
    if (!image) continue;

    const ext = contentTypeToExtension(image.contentType);
    extensions.add(ext);

    const mediaPath = `ppt/media/image${slideIndex}_${idx}.${ext}`;
    const rId = `rId${rIdCounter++}`;

    // Write image data to ZIP (copy to plain ArrayBuffer to avoid SharedArrayBuffer issues)
    const buf = new Uint8Array(image.data.byteLength);
    buf.set(image.data);
    pkg.writeBinary(mediaPath, buf.buffer);

    imageMap.set(idx, { rId, mediaPath });
  }

  return { imageMap, extensions: Array.from(extensions) };
}

/**
 * Build slide relationships for embedded images.
 */
export function buildImageRelationships(
  imageMap: Map<number, { rId: string; mediaPath: string }>,
): readonly SlideRelationship[] {
  const rels: SlideRelationship[] = [];
  for (const [, { rId, mediaPath }] of imageMap) {
    rels.push({
      id: rId,
      type: RT_IMAGE,
      target: `../${mediaPath.replace("ppt/", "")}`,
    });
  }
  return rels;
}

/**
 * Collect all picture indices used in a slide's shapes.
 */
export function collectUsedImageIndices(shapes: readonly PptShape[]): Set<number> {
  const indices = new Set<number>();

  function walk(shape: PptShape): void {
    if (shape.picture) {
      indices.add(shape.picture.pictureIndex);
    }
    if (shape.children) {
      for (const child of shape.children) {
        walk(child);
      }
    }
  }

  for (const shape of shapes) {
    walk(shape);
  }

  return indices;
}
