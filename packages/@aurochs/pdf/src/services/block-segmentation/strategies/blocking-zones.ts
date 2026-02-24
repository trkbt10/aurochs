/**
 * @file Build blocking zones from PDF page elements.
 */

import type { PdfPath } from "../../../domain/path";
import type { PdfImage } from "../../../domain/image";
import type { BlockingZone } from "../contracts/types";
import { computePathBBox } from "../../../parser/path/path-builder";

/**
 * Build blocking zones from page paths/images.
 *
 * Zones are intended for text grouping separation and table-aware segmentation.
 */
export function buildBlockingZonesFromPageElements(args: {
  readonly paths: readonly PdfPath[];
  readonly images?: readonly PdfImage[];
}): readonly BlockingZone[] {
  const { paths, images = [] } = args;
  const zones: BlockingZone[] = [];

  for (const path of paths) {
    if (path.paintOp === "none" || path.paintOp === "clip") {
      continue;
    }

    const bbox = computePathBBox(path);
    const [x1, y1, x2, y2] = bbox;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    if (width < 0.5 && height < 0.5) {
      continue;
    }

    const shouldIncludePath = (): boolean => {
      if (path.paintOp === "stroke" || path.paintOp === "fillStroke") {
        return true;
      }
      if (path.paintOp === "fill") {
        const thinThreshold = 3;
        const isThinFill = width < thinThreshold || height < thinThreshold;
        const aspectRatio = Math.max(width, height) / Math.max(Math.min(width, height), 0.1);
        const isElongated = aspectRatio > 20;
        return isThinFill || isElongated;
      }
      return false;
    };

    if (!shouldIncludePath()) {
      continue;
    }

    zones.push({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width,
      height,
    });
  }

  for (const image of images) {
    const [a, b, c, d, e, f] = image.graphicsState.ctm;
    const corners = [
      { x: e, y: f },
      { x: a + e, y: b + f },
      { x: c + e, y: d + f },
      { x: a + c + e, y: b + d + f },
    ];
    const minX = Math.min(...corners.map((point) => point.x));
    const maxX = Math.max(...corners.map((point) => point.x));
    const minY = Math.min(...corners.map((point) => point.y));
    const maxY = Math.max(...corners.map((point) => point.y));
    zones.push({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  return zones;
}
