/**
 * @file Blip fill builder
 *
 * Builds DrawingML blip fill (a:blipFill) elements for image fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */

import type { BlipFill, BlipTileMode } from "@aurochs-office/drawing-ml/domain/fill";
import type { BlipFillSpec } from "../types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build tile mode from tile spec.
 */
function buildTileMode(tile: BlipFillSpec["tile"]): BlipTileMode | undefined {
  if (tile === undefined) {
    return undefined;
  }
  return {
    flip: tile.flip,
    scaleX: tile.scaleX,
    scaleY: tile.scaleY,
    offsetX: tile.offsetX,
    offsetY: tile.offsetY,
    alignment: tile.alignment,
  };
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
  return {
    type: "blip",
    resourceId: spec.resourceId,
    sourceRect: spec.sourceRect,
    dpi: spec.dpi,
    rotWithShape: spec.rotWithShape,
    compressionState: spec.compressionState,
    stretchMode: hasTile ? undefined : "fill",
    tileMode: buildTileMode(spec.tile),
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
