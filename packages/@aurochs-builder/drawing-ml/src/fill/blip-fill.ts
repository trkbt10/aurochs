/**
 * @file Blip fill builder
 *
 * Builds DrawingML blip fill (a:blipFill) elements for image fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */

import type { BlipFill, TileFill, StretchFill } from "@aurochs-office/drawing-ml/domain/fill";
import { pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { BlipFillSpec } from "../types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build tile fill from tile spec.
 */
function buildTileFill(tile: BlipFillSpec["tile"]): TileFill | undefined {
  if (tile === undefined) {
    return undefined;
  }
  return {
    tx: px(tile.offsetX ?? 0),
    ty: px(tile.offsetY ?? 0),
    sx: pct(tile.scaleX ?? 100),
    sy: pct(tile.scaleY ?? 100),
    flip: tile.flip ?? "none",
    alignment: tile.alignment ?? "tl",
  };
}

/**
 * Build stretch fill (default stretch mode).
 */
function buildStretchFill(): StretchFill {
  return {};
}

// =============================================================================
// Builder Functions
// =============================================================================

/**
 * Build a blip fill from specification.
 *
 * A blip fill represents an image fill, where an image is used to fill
 * a shape or picture frame.
 *
 * @param spec - Blip fill specification
 * @returns BlipFill object
 */
export function buildBlipFill(spec: BlipFillSpec): BlipFill {
  const hasTile = spec.tile !== undefined;
  const sourceRect = spec.sourceRect
    ? {
        left: pct(spec.sourceRect.left),
        top: pct(spec.sourceRect.top),
        right: pct(spec.sourceRect.right),
        bottom: pct(spec.sourceRect.bottom),
      }
    : undefined;

  return {
    type: "blipFill",
    resourceId: spec.resourceId,
    sourceRect,
    dpi: spec.dpi,
    rotWithShape: spec.rotWithShape,
    compressionState: spec.compressionState,
    stretch: hasTile ? undefined : buildStretchFill(),
    tile: buildTileFill(spec.tile),
  };
}

/**
 * Create a simple blip fill from a resource ID.
 *
 * This is a convenience function for creating a stretched image fill.
 *
 * @param resourceId - The relationship ID for the image
 * @returns BlipFill object
 */
export function buildSimpleBlipFill(resourceId: string): BlipFill {
  return buildBlipFill({ resourceId });
}

/**
 * Create a blip fill with source rectangle cropping.
 *
 * @param resourceId - The relationship ID for the image
 * @param srcRect - Source rectangle for cropping (percentages 0-100)
 * @returns BlipFill object
 */
export function buildCroppedBlipFill(
  resourceId: string,
  srcRect: { left: number; top: number; right: number; bottom: number },
): BlipFill {
  return buildBlipFill({
    resourceId,
    sourceRect: srcRect,
  });
}

/**
 * Create a tiled blip fill.
 *
 * @param resourceId - The relationship ID for the image
 * @param tile - Tile configuration
 * @returns BlipFill object
 */
export function buildTiledBlipFill(
  resourceId: string,
  tile: BlipFillSpec["tile"],
): BlipFill {
  return buildBlipFill({
    resourceId,
    tile,
  });
}
