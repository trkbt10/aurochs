/**
 * @file Page coordinate normalization for segmentation visualization.
 *
 * Normalizes parser-space coordinates into displayed page coordinates using
 * native page CropBox and Rotate metadata.
 */

import type { PdfPath } from "../../../domain/path";
import type { PdfText } from "../../../domain/text";
import type { PdfImage } from "../../../domain/image";
import type { PdfBBox, PdfMatrix, PdfSoftMask } from "../../../domain";
import type { PdfGraphicsState } from "../../../domain/graphics-state";
import { loadNativePdfDocumentForParser } from "../../../parser/core/native-load";

export type PageViewportTransform = {
  readonly rotation: 0 | 90 | 180 | 270;
  readonly cropBox: readonly [number, number, number, number];
};

export type NormalizedPageElements = {
  readonly texts: readonly PdfText[];
  readonly paths: readonly PdfPath[];
  readonly images: readonly PdfImage[];
  readonly applied: boolean;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly status: "normalized" | "identity" | "fallback";
  readonly message?: string;
};

const EPS = 1e-6;

/** Clamp numeric value into inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Map a point from parser coordinate space to displayed page space. */
export function mapPointToDisplay(args: {
  readonly x: number;
  readonly y: number;
  readonly viewport: PageViewportTransform;
}): { readonly x: number; readonly y: number } {
  const { x, y, viewport } = args;
  const [llx, lly, urx, ury] = viewport.cropBox;
  const cropWidth = urx - llx;
  const cropHeight = ury - lly;
  const localX = x - llx;
  const localY = y - lly;

  switch (viewport.rotation) {
    case 0:
      return { x: localX, y: localY };
    case 90:
      return {
        x: localY,
        y: cropWidth - localX,
      };
    case 180:
      return {
        x: cropWidth - localX,
        y: cropHeight - localY,
      };
    case 270:
      return {
        x: cropHeight - localY,
        y: localX,
      };
    default: {
      const exhaustive: never = viewport.rotation;
      throw new Error(`Unsupported page rotation: ${String(exhaustive)}`);
    }
  }
}

/** Map axis-aligned rectangle into displayed page space. */
export function mapRectToDisplay(args: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly viewport: PageViewportTransform;
}): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const { x, y, width, height, viewport } = args;
  const corners = [
    mapPointToDisplay({ x, y, viewport }),
    mapPointToDisplay({ x: x + width, y, viewport }),
    mapPointToDisplay({ x: x + width, y: y + height, viewport }),
    mapPointToDisplay({ x, y: y + height, viewport }),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 0.2),
    height: Math.max(maxY - minY, 0.2),
  };
}

function applyMatrixToPoint(matrix: PdfMatrix, point: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
  };
}

function mapMatrixToDisplay(args: { readonly matrix: PdfMatrix; readonly viewport: PageViewportTransform }): PdfMatrix {
  const { matrix, viewport } = args;
  const p00 = mapPointToDisplay({ ...applyMatrixToPoint(matrix, { x: 0, y: 0 }), viewport });
  const p10 = mapPointToDisplay({ ...applyMatrixToPoint(matrix, { x: 1, y: 0 }), viewport });
  const p01 = mapPointToDisplay({ ...applyMatrixToPoint(matrix, { x: 0, y: 1 }), viewport });
  return [p10.x - p00.x, p10.y - p00.y, p01.x - p00.x, p01.y - p00.y, p00.x, p00.y];
}

function mapBBoxToDisplay(args: { readonly bbox: PdfBBox; readonly viewport: PageViewportTransform }): PdfBBox {
  const { bbox, viewport } = args;
  const [x1, y1, x2, y2] = bbox;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  const mapped = mapRectToDisplay({
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    viewport,
  });
  return [mapped.x, mapped.y, mapped.x + mapped.width, mapped.y + mapped.height];
}

function mapSoftMaskToDisplay(args: { readonly mask: PdfSoftMask; readonly viewport: PageViewportTransform }): PdfSoftMask {
  const { mask, viewport } = args;
  return {
    ...mask,
    bbox: mapBBoxToDisplay({ bbox: mask.bbox, viewport }),
    matrix: mapMatrixToDisplay({ matrix: mask.matrix, viewport }),
  };
}

function mapGraphicsStateToDisplay(args: {
  readonly graphicsState: PdfGraphicsState;
  readonly viewport: PageViewportTransform;
}): PdfGraphicsState {
  const { graphicsState, viewport } = args;
  return {
    ...graphicsState,
    ctm: mapMatrixToDisplay({ matrix: graphicsState.ctm, viewport }),
    ...(graphicsState.clipBBox ? { clipBBox: mapBBoxToDisplay({ bbox: graphicsState.clipBBox, viewport }) } : {}),
    ...(graphicsState.clipMask ? { clipMask: mapSoftMaskToDisplay({ mask: graphicsState.clipMask, viewport }) } : {}),
    ...(graphicsState.softMask ? { softMask: mapSoftMaskToDisplay({ mask: graphicsState.softMask, viewport }) } : {}),
  };
}

function clampRunRectToPage(args: {
  readonly run: PdfText;
  readonly pageWidth: number;
  readonly pageHeight: number;
}): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const { run, pageWidth, pageHeight } = args;
  const x0 = clamp(run.x, 0, pageWidth);
  const y0 = clamp(run.y, 0, pageHeight);
  const x1 = clamp(run.x + Math.max(run.width, 0.2), 0, pageWidth);
  const y1 = clamp(run.y + Math.max(run.height, 0.2), 0, pageHeight);
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.max(Math.abs(x1 - x0), 0.2),
    height: Math.max(Math.abs(y1 - y0), 0.2),
  };
}

function scoreTextBoundsCoverage(args: {
  readonly texts: readonly PdfText[];
  readonly pageWidth: number;
  readonly pageHeight: number;
}): number {
  const { texts, pageWidth, pageHeight } = args;
  const nonEmpty = texts.filter((run) => run.text.trim().length > 0);
  if (nonEmpty.length === 0) {
    return 1;
  }
  const inPageCount = nonEmpty.reduce((count, run) => {
    const rect = clampRunRectToPage({ run, pageWidth, pageHeight });
    const originalArea = Math.max(Math.max(run.width, 0.2) * Math.max(run.height, 0.2), 0.04);
    const clippedArea = rect.width * rect.height;
    return clippedArea / originalArea >= 0.8 ? count + 1 : count;
  }, 0);
  return inPageCount / nonEmpty.length;
}

/** Transform text runs into displayed page space. */
export function transformTextRunsToDisplay(args: {
  readonly texts: readonly PdfText[];
  readonly viewport: PageViewportTransform;
}): readonly PdfText[] {
  const { texts, viewport } = args;
  return texts.map((run) => {
    const rect = mapRectToDisplay({
      x: run.x,
      y: run.y,
      width: run.width,
      height: run.height,
      viewport,
    });
    return {
      ...run,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      graphicsState: mapGraphicsStateToDisplay({ graphicsState: run.graphicsState, viewport }),
    };
  });
}

/** Transform vector path operations into displayed page space. */
export function transformPathsToDisplay(args: {
  readonly paths: readonly PdfPath[];
  readonly viewport: PageViewportTransform;
}): readonly PdfPath[] {
  const { paths, viewport } = args;
  return paths.map((pathElement) => {
    const operations = pathElement.operations.map((operation) => {
      switch (operation.type) {
        case "moveTo":
        case "lineTo": {
          const point = mapPointToDisplay({ x: operation.point.x, y: operation.point.y, viewport });
          return { ...operation, point };
        }
        case "curveTo": {
          const cp1 = mapPointToDisplay({ x: operation.cp1.x, y: operation.cp1.y, viewport });
          const cp2 = mapPointToDisplay({ x: operation.cp2.x, y: operation.cp2.y, viewport });
          const end = mapPointToDisplay({ x: operation.end.x, y: operation.end.y, viewport });
          return { ...operation, cp1, cp2, end };
        }
        case "curveToV": {
          const cp2 = mapPointToDisplay({ x: operation.cp2.x, y: operation.cp2.y, viewport });
          const end = mapPointToDisplay({ x: operation.end.x, y: operation.end.y, viewport });
          return { ...operation, cp2, end };
        }
        case "curveToY": {
          const cp1 = mapPointToDisplay({ x: operation.cp1.x, y: operation.cp1.y, viewport });
          const end = mapPointToDisplay({ x: operation.end.x, y: operation.end.y, viewport });
          return { ...operation, cp1, end };
        }
        case "rect": {
          const rect = mapRectToDisplay({
            x: operation.x,
            y: operation.y,
            width: operation.width,
            height: operation.height,
            viewport,
          });
          return {
            ...operation,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }
        case "closePath":
          return operation;
        default: {
          const exhaustive: never = operation;
          throw new Error(`Unsupported path operation: ${String(exhaustive)}`);
        }
      }
    });
    return {
      ...pathElement,
      operations,
      graphicsState: mapGraphicsStateToDisplay({ graphicsState: pathElement.graphicsState, viewport }),
    };
  });
}

/** Transform image elements into displayed page space by normalizing graphicsState.ctm. */
export function transformImagesToDisplay(args: {
  readonly images: readonly PdfImage[];
  readonly viewport: PageViewportTransform;
}): readonly PdfImage[] {
  const { images, viewport } = args;
  return images.map((image) => ({
    ...image,
    graphicsState: mapGraphicsStateToDisplay({ graphicsState: image.graphicsState, viewport }),
  }));
}

/** Normalize parsed page elements using CropBox/Rotate from native page metadata. */
export async function normalizePageElementsForDisplay(args: {
  readonly pdfBytes: Uint8Array;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly texts: readonly PdfText[];
  readonly paths: readonly PdfPath[];
  readonly images?: readonly PdfImage[];
}): Promise<NormalizedPageElements> {
  const {
    pdfBytes,
    pageNumber,
    pageWidth,
    pageHeight,
    texts,
    paths,
    images = [],
  } = args;
  const loadViewport = async (): Promise<PageViewportTransform | null> => {
    try {
      const nativeDoc = await loadNativePdfDocumentForParser(pdfBytes, {
        purpose: "inspect",
        encryption: { mode: "ignore" },
        updateMetadata: false,
      });
      const nativePage = nativeDoc.getPages()[pageNumber - 1];
      if (!nativePage) {
        return null;
      }
      const crop = nativePage.getBox("CropBox") ?? nativePage.getBox("MediaBox");
      if (!crop || crop.length !== 4) {
        return null;
      }
      return {
        rotation: nativePage.getRotation(),
        cropBox: [crop[0] ?? 0, crop[1] ?? 0, crop[2] ?? 0, crop[3] ?? 0],
      };
    } catch (error) {
      if (error instanceof Error && error.message.length > 0) {
        // Inspect-mode parsing may fail for malformed compressed streams.
        // Keep visualization available by falling back to identity coordinates.
      }
      return null;
    }
  };
  const viewport = await loadViewport();
  if (!viewport) {
    return {
      texts,
      paths,
      images,
      applied: false,
      rotation: 0,
      status: "fallback",
      message: "native-inspect failed; using identity coordinates",
    };
  }

  if (
    viewport.rotation === 0 &&
    Math.abs(viewport.cropBox[0]) <= EPS &&
    Math.abs(viewport.cropBox[1]) <= EPS
  ) {
    return { texts, paths, images, applied: false, rotation: viewport.rotation, status: "identity" };
  }

  const transformedTexts = transformTextRunsToDisplay({ texts, viewport });
  const identityScore = scoreTextBoundsCoverage({ texts, pageWidth, pageHeight });
  const transformedScore = scoreTextBoundsCoverage({ texts: transformedTexts, pageWidth, pageHeight });
  if (transformedScore <= identityScore + 0.05) {
    return {
      texts,
      paths,
      images,
      applied: false,
      rotation: viewport.rotation,
      status: "identity",
      message: "transform score did not improve enough; using identity coordinates",
    };
  }

  const transformedPaths = transformPathsToDisplay({ paths, viewport });
  const transformedImages = transformImagesToDisplay({ images, viewport });
  return {
    texts: transformedTexts,
    paths: transformedPaths,
    images: transformedImages,
    applied: true,
    rotation: viewport.rotation,
    status: "normalized",
  };
}
