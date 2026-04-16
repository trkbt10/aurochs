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

import type { ResolvedFillDef } from "./fill";
import type { AffineMatrix } from "../types";
import { getImageDimensions, type ImageDimensions } from "./image-dimensions";

type ElementSize = { readonly width: number; readonly height: number };

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
  defs: import("../render-tree/types").RenderDef[],
  elementSize: ElementSize,
): void {
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.type !== "pattern") { continue; }

    const pattern = def.def;
    if (pattern.type !== "image") { continue; }

    // Extract image dimensions from the base64 data
    const imgDim = extractDimensionsFromDataUri(pattern.dataUri, pattern);

    if (!imgDim) {
      // Can't determine image size — use objectBoundingBox stretch fallback
      // (image fills entire pattern at 0..1 coords with preserveAspectRatio="none")
      continue;
    }

    // Compute the pattern image transform
    const imageTransform = computeImagePatternTransform(
      imgDim,
      elementSize,
      pattern.scaleMode,
      pattern.sourceTransform,
    );

    if (imageTransform) {
      // Replace the pattern def with finalized version
      defs[i] = {
        type: "pattern",
        def: {
          ...pattern,
          // In objectBoundingBox space, the image uses its natural pixel dimensions
          // and the transform maps those pixels to 0..1 space
          imageWidth: imgDim.width,
          imageHeight: imgDim.height,
          preserveAspectRatio: "none",
          imageTransform,
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
  pattern: { readonly scaleMode?: string },
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
function computeImagePatternTransform(
  imgDim: ImageDimensions,
  elementSize: ElementSize,
  scaleMode: string | undefined,
  paintTransform: AffineMatrix | undefined,
): string | undefined {
  const imgW = imgDim.width;
  const imgH = imgDim.height;

  // Extract paint transform components (identity if unset)
  const pm00 = paintTransform?.m00 ?? 1;
  const pm01 = paintTransform?.m01 ?? 0;
  const pm10 = paintTransform?.m10 ?? 0;
  const pm11 = paintTransform?.m11 ?? 1;
  const pm02 = paintTransform?.m02 ?? 0;
  const pm12 = paintTransform?.m12 ?? 0;

  const isIdentity =
    pm00 === 1 && pm01 === 0 && pm10 === 0 && pm11 === 1 && pm02 === 0 && pm12 === 0;

  // FILL with identity transform: cover + centre-crop
  if (scaleMode === "FILL" && isIdentity) {
    const pixelScale = Math.max(
      elementSize.width / imgW,
      elementSize.height / imgH,
    );

    const sx = pixelScale / elementSize.width;
    const sy = pixelScale / elementSize.height;
    const obbW = imgW * sx;
    const obbH = imgH * sy;
    const tx = -(obbW - 1) / 2;
    const ty = -(obbH - 1) / 2;

    if (sx === sy) {
      if (tx === 0 && ty === 0) {
        return `scale(${sx})`;
      }
      return `translate(${tx} ${ty}) scale(${sx})`;
    }
    return `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`;
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
