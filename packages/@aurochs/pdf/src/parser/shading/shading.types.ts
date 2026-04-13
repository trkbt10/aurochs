/**
 * @file src/pdf/parser/shading.types.ts
 *
 * Parsed shading resource types (used by the `sh` operator).
 *
 * This lives in the parser layer (not domain) because PPTX output cannot
 * represent shadings directly; we rasterize them to `PdfImage`.
 *
 * PDF Function types live in ../function/types.ts — shading references
 * the canonical PdfFunction type directly.
 */

import type { PdfColorSpace, PdfMatrix } from "../../domain";
import type { PdfFunction } from "../function/types";

// ---------------------------------------------------------------------------
// Shading-specific types
// ---------------------------------------------------------------------------

export type PdfAxialShading = Readonly<{
  readonly shadingType: 2;
  readonly colorSpace: Extract<PdfColorSpace, "DeviceGray" | "DeviceRGB">;
  readonly coords: readonly [number, number, number, number];
  readonly extend: readonly [boolean, boolean];
  readonly fn: PdfFunction;
}>;

export type PdfRadialShading = Readonly<{
  readonly shadingType: 3;
  readonly colorSpace: Extract<PdfColorSpace, "DeviceGray" | "DeviceRGB">;
  readonly coords: readonly [number, number, number, number, number, number];
  readonly extend: readonly [boolean, boolean];
  readonly fn: PdfFunction;
}>;

export type PdfShading = PdfAxialShading | PdfRadialShading;

export type ShadingRasterizeOptions = Readonly<{
  /**
   * Maximum of `{width,height}` for the generated raster image.
   *
   * Set to `0` (default) to keep rasterization disabled.
   */
  readonly shadingMaxSize: number;
  /**
   * Page space bounding box used when the current graphics state has no clip.
   *
   * This must be in the same coordinate space as `graphicsState.ctm` outputs.
   */
  readonly pageBBox: readonly [number, number, number, number];
}>;

export type ShadingSampleContext = Readonly<{
  readonly shading: PdfShading;
  readonly userToPage: PdfMatrix;
  readonly pageToUser: PdfMatrix | null;
}>;
