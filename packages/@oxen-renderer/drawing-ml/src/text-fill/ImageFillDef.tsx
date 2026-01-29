/**
 * @file Text image fill SVG definition
 *
 * Creates SVG pattern for text image fill (blipFill).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (a:blipFill)
 */

import type { ReactNode } from "react";
import type { TextImageFillConfig } from "./types";

// =============================================================================
// Image Fill Definition
// =============================================================================

/**
 * Create SVG pattern definition for text image fill.
 *
 * Supports two modes:
 * - tile: Repeats the image in a tiled pattern
 * - stretch: Stretches image to fill the bounding box
 *
 * @param fill - Image fill configuration
 * @param id - Unique ID for the pattern definition
 * @returns SVG pattern element for use in <defs>
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (a:blipFill)
 */
export function createTextImageFillDef(
  fill: TextImageFillConfig,
  id: string,
): ReactNode {
  if (fill.mode === "tile") {
    return createTilePattern(fill, id);
  }

  return createStretchPattern(fill, id);
}

/**
 * Create tiled image pattern.
 */
function createTilePattern(fill: TextImageFillConfig, id: string): ReactNode {
  const scaleX = fill.tileScale?.x ?? 1;
  const scaleY = fill.tileScale?.y ?? 1;
  const tileSize = 50; // Base tile size

  return (
    <pattern
      id={id}
      width={tileSize * scaleX}
      height={tileSize * scaleY}
      patternUnits="userSpaceOnUse"
    >
      <image
        href={fill.imageUrl}
        width={tileSize * scaleX}
        height={tileSize * scaleY}
        preserveAspectRatio="none"
      />
    </pattern>
  );
}

/**
 * Create stretched image pattern.
 */
function createStretchPattern(fill: TextImageFillConfig, id: string): ReactNode {
  return (
    <pattern
      id={id}
      width="100%"
      height="100%"
      patternUnits="objectBoundingBox"
    >
      <image
        href={fill.imageUrl}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      />
    </pattern>
  );
}
