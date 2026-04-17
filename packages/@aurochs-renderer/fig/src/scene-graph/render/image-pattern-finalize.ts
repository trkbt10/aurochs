/**
 * @file Image pattern finalization — applies element size to image fill patterns
 *
 * Image fill patterns in Figma use objectBoundingBox coordinates (0..1 space).
 * The image element within the pattern needs a transform that accounts for:
 * - Natural image dimensions (from PNG/JPEG header)
 * - Element dimensions (the shape being filled)
 * - Scale mode (FILL = cover + center-crop, STRETCH = distort, etc.)
 * - Optional paint transform (user rotation/position)
 *
 * This mirrors the old SVG renderer's computeImagePatternTransform logic,
 * applied via finalizeImagePatternDefs after element size is known.
 */

import type { AffineMatrix } from "../types";
import type { RenderDef } from "../render-tree/types";
import { getImageDimensions, type ImageDimensions } from "./image-dimensions";

type ElementSize = { readonly width: number; readonly height: number };
type ImagePatternLayout = {
  readonly patternWidth: number;
  readonly patternHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly preserveAspectRatio: string;
  readonly imageTransform: string;
};

/**
 * Finalize image pattern defs with element size.
 *
 * Called by each node resolver (rect, ellipse, frame, path) after
 * element size is known. Updates pattern defs with proper image
 * transforms based on natural image dimensions and scale mode.
 *
 * Mutates the defs array entries in-place (same approach as
 * finalizeGradientDefs for consistency).
 */
export function finalizeImagePatternDefs(
  defs: RenderDef[],
  elementSize: ElementSize,
): void {
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.type !== "pattern") { continue; }

    const pattern = def.def;
    if (pattern.type !== "image") { continue; }

    // Extract image dimensions from the base64 data
    const imgDim = extractDimensionsFromDataUri(pattern.dataUri);

    if (!imgDim) {
      // Can't determine image size — use objectBoundingBox stretch fallback
      // (image fills entire pattern at 0..1 coords with preserveAspectRatio="none")
      continue;
    }

    const layout = computeImagePatternLayout({
      imgDim,
      elementSize,
      scaleMode: pattern.scaleMode,
      paintTransform: pattern.sourceTransform,
      scalingFactor: pattern.scalingFactor,
    });

    if (layout) {
      // Replace the pattern def with finalized version
      defs[i] = {
        type: "pattern",
        def: {
          ...pattern,
          // In objectBoundingBox space, the image uses its natural pixel dimensions
          // and the transform maps those pixels to 0..1 space
          width: layout.patternWidth,
          height: layout.patternHeight,
          imageWidth: layout.imageWidth,
          imageHeight: layout.imageHeight,
          preserveAspectRatio: layout.preserveAspectRatio,
          imageTransform: layout.imageTransform,
        },
      };
    }
  }
}

/**
 * Extract image dimensions from a data URI's binary content.
 */
function extractDimensionsFromDataUri(
  dataUri: string,
): ImageDimensions | undefined {
  // Determine mimeType from the data URI
  const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
  if (!mimeMatch) { return undefined; }
  const mimeType = mimeMatch[1];

  // Decode enough of the base64 to read headers (first 1024 bytes is sufficient)
  const base64Data = dataUri.slice(dataUri.indexOf(",") + 1);
  const binaryStr = atob(base64Data.slice(0, 1400)); // ~1024 decoded bytes
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return getImageDimensions(bytes, mimeType);
}

/**
 * Compute the SVG transform for an image inside an objectBoundingBox pattern.
 *
 * In objectBoundingBox space:
 * - 1 unit in X = element width in pixels
 * - 1 unit in Y = element height in pixels
 *
 * The image uses its natural pixel dimensions (imgW × imgH).
 * The transform maps those pixels into the 0..1 oBB space.
 *
 * For FILL mode with identity paint transform:
 *   pixelScale = max(elemW/imgW, elemH/imgH)   // cover both axes
 *   sx_obb = pixelScale / elemW   (maps imgW pixels to oBB units)
 *   sy_obb = pixelScale / elemH
 *   Center-crop offset = -(obbImageSize - 1) / 2
 *
 * For general case with paint transform:
 *   T = inv(paintTransform) × diag(1/imgW, 1/imgH)
 */
type ImagePatternLayoutParams = {
  readonly imgDim: ImageDimensions;
  readonly elementSize: ElementSize;
  readonly scaleMode: string | undefined;
  readonly paintTransform: AffineMatrix | undefined;
  readonly scalingFactor: number | undefined;
};

function computeImagePatternLayout(params: ImagePatternLayoutParams): ImagePatternLayout | undefined {
  const { imgDim, elementSize, scaleMode, paintTransform, scalingFactor } = params;
  const imgW = imgDim.width;
  const imgH = imgDim.height;
  if (imgW <= 0 || imgH <= 0 || elementSize.width <= 0 || elementSize.height <= 0) {
    return undefined;
  }

  // Extract paint transform components (identity if unset)
  const pm00 = paintTransform?.m00 ?? 1;
  const pm01 = paintTransform?.m01 ?? 0;
  const pm10 = paintTransform?.m10 ?? 0;
  const pm11 = paintTransform?.m11 ?? 1;
  const pm02 = paintTransform?.m02 ?? 0;
  const pm12 = paintTransform?.m12 ?? 0;

  const isIdentity =
    pm00 === 1 && pm01 === 0 && pm10 === 0 && pm11 === 1 && pm02 === 0 && pm12 === 0;

  if (scaleMode === "FILL" && isIdentity) {
    return createScaledImagePatternLayout({
      imgW,
      imgH,
      elementSize,
      pixelScale: Math.max(elementSize.width / imgW, elementSize.height / imgH),
      centerMode: "crop",
    });
  }

  if (scaleMode === "FIT" && isIdentity) {
    return createScaledImagePatternLayout({
      imgW,
      imgH,
      elementSize,
      pixelScale: Math.min(elementSize.width / imgW, elementSize.height / imgH),
      centerMode: "letterbox",
    });
  }

  if (scaleMode === "TILE" && isIdentity) {
    return createTiledImagePatternLayout({ imgW, imgH, elementSize, scalingFactor });
  }

  // General case: inv(paintTransform) × diag(1/imgW, 1/imgH)
  const det = pm00 * pm11 - pm01 * pm10;
  if (Math.abs(det) < 1e-12) {
    return undefined;
  }

  const invA = pm11 / det;
  const invB = -pm10 / det;
  const invC = -pm01 / det;
  const invD = pm00 / det;
  const invTx = invA * (-pm02) + invC * (-pm12);
  const invTy = invB * (-pm02) + invD * (-pm12);

  const sa = invA / imgW;
  const sb = invB / imgW;
  const sc = invC / imgH;
  const sd = invD / imgH;
  const stx = invTx;
  const sty = invTy;

  return {
    patternWidth: 1,
    patternHeight: 1,
    imageWidth: imgW,
    imageHeight: imgH,
    preserveAspectRatio: "none",
    imageTransform: formatImageTransform({ sa, sb, sc, sd, stx, sty }),
  };
}

type ScaledImagePatternParams = {
  readonly imgW: number;
  readonly imgH: number;
  readonly elementSize: ElementSize;
  readonly pixelScale: number;
  readonly centerMode: "crop" | "letterbox";
};

/** Create a one-pattern image layout for FILL/FIT modes. */
function createScaledImagePatternLayout(params: ScaledImagePatternParams): ImagePatternLayout {
  const { imgW, imgH, elementSize, pixelScale, centerMode } = params;
  const sx = pixelScale / elementSize.width;
  const sy = pixelScale / elementSize.height;
  const obbW = imgW * sx;
  const obbH = imgH * sy;
  const tx = computeCenteredOffset(obbW, centerMode);
  const ty = computeCenteredOffset(obbH, centerMode);

  return {
    patternWidth: 1,
    patternHeight: 1,
    imageWidth: imgW,
    imageHeight: imgH,
    preserveAspectRatio: "none",
    imageTransform: formatImageTransform({ sa: sx, sb: 0, sc: 0, sd: sy, stx: tx, sty: ty }),
  };
}

type TiledImagePatternParams = {
  readonly imgW: number;
  readonly imgH: number;
  readonly elementSize: ElementSize;
  readonly scalingFactor: number | undefined;
};

/** Create a repeating pattern layout for TILE mode. */
function createTiledImagePatternLayout(params: TiledImagePatternParams): ImagePatternLayout {
  const { imgW, imgH, elementSize } = params;
  const scale = params.scalingFactor ?? 1;
  const patternWidth = (imgW * scale) / elementSize.width;
  const patternHeight = (imgH * scale) / elementSize.height;

  return {
    patternWidth,
    patternHeight,
    imageWidth: imgW,
    imageHeight: imgH,
    preserveAspectRatio: "none",
    imageTransform: formatImageTransform({
      sa: scale / elementSize.width,
      sb: 0,
      sc: 0,
      sd: scale / elementSize.height,
      stx: 0,
      sty: 0,
    }),
  };
}

/** Compute centered image offset for objectBoundingBox image size. */
function computeCenteredOffset(size: number, centerMode: "crop" | "letterbox"): number {
  if (centerMode === "crop") {
    return -(size - 1) / 2;
  }
  return (1 - size) / 2;
}

type ImageTransformParts = {
  readonly sa: number;
  readonly sb: number;
  readonly sc: number;
  readonly sd: number;
  readonly stx: number;
  readonly sty: number;
};

/** Format SVG image transform from matrix components. */
function formatImageTransform(parts: ImageTransformParts): string {
  const { sa, sb, sc, sd, stx, sty } = parts;
  if (sb === 0 && sc === 0) {
    if (stx === 0 && sty === 0) {
      if (sa === sd) {
        return `scale(${sa})`;
      }
      return `scale(${sa} ${sd})`;
    }
    return `matrix(${sa} 0 0 ${sd} ${stx} ${sty})`;
  }

  return `matrix(${sa} ${sb} ${sc} ${sd} ${stx} ${sty})`;
}
