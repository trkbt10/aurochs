/**
 * @file Text extrusion rendering
 *
 * Creates layered copies of text to simulate 3D extrusion depth.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (a:sp3d - extrusionH)
 */

import type { ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Extrusion offset based on camera angle
 */
type ExtrusionOffset = {
  readonly offsetX: number;
  readonly offsetY: number;
};

// =============================================================================
// Camera-based Offset Calculation
// =============================================================================

/**
 * Camera preset to extrusion offset mapping.
 *
 * Uses handler pattern (Rule 1.1) for O(1) lookup.
 */
const CAMERA_OFFSET_HANDLERS: Record<string, (depth: number) => ExtrusionOffset> = {
  isometricTopUp: (depth) => ({ offsetX: depth * 0.5, offsetY: depth * 0.5 }),
  isometricTopDown: (depth) => ({ offsetX: depth * 0.5, offsetY: depth * 0.5 }),
  obliqueTopLeft: (depth) => ({ offsetX: -depth, offsetY: -depth }),
  perspectiveAboveLeftFacing: (depth) => ({ offsetX: -depth, offsetY: -depth }),
  obliqueTopRight: (depth) => ({ offsetX: depth, offsetY: -depth }),
  perspectiveAboveRightFacing: (depth) => ({ offsetX: depth, offsetY: -depth }),
  obliqueBottomLeft: (depth) => ({ offsetX: -depth, offsetY: depth }),
  obliqueBottomRight: (depth) => ({ offsetX: depth, offsetY: depth }),
  obliqueTop: (depth) => ({ offsetX: 0, offsetY: -depth }),
  perspectiveAbove: (depth) => ({ offsetX: 0, offsetY: -depth }),
  obliqueBottom: (depth) => ({ offsetX: 0, offsetY: depth }),
  perspectiveBelow: (depth) => ({ offsetX: 0, offsetY: depth }),
  obliqueLeft: (depth) => ({ offsetX: -depth, offsetY: 0 }),
  perspectiveLeft: (depth) => ({ offsetX: -depth, offsetY: 0 }),
  obliqueRight: (depth) => ({ offsetX: depth, offsetY: 0 }),
  perspectiveRight: (depth) => ({ offsetX: depth, offsetY: 0 }),
};

/**
 * Get extrusion offset direction based on camera preset.
 *
 * @param camera - Camera preset name
 * @param height - Extrusion height
 * @returns Offset values for X and Y axes
 */
export function getExtrusionOffset(camera: string, height: number): ExtrusionOffset {
  const depth = height * 0.5;
  const handler = CAMERA_OFFSET_HANDLERS[camera];

  if (handler) {
    return handler(depth);
  }

  // Default: slight diagonal offset
  return { offsetX: depth * 0.3, offsetY: depth * 0.3 };
}

// =============================================================================
// Extrusion Rendering
// =============================================================================

/**
 * Maximum number of extrusion layers for performance.
 */
const MAX_EXTRUSION_LAYERS = 8;

/**
 * Base extrusion layer opacity.
 */
const BASE_OPACITY = 0.4;

/**
 * Opacity range for layer depth effect.
 */
const OPACITY_RANGE = 0.3;

/**
 * Extrusion layer fill color.
 */
const EXTRUSION_FILL_COLOR = "#666666";

/**
 * Calculate the number of extrusion layers based on height.
 *
 * @param extrusionHeight - Extrusion height in pixels
 * @returns Number of layers to render
 */
function calculateLayerCount(extrusionHeight: number): number {
  return Math.min(Math.ceil(extrusionHeight / 3), MAX_EXTRUSION_LAYERS);
}

/**
 * Calculate opacity for a specific layer.
 *
 * Layers further from the surface are more transparent.
 *
 * @param layerIndex - Current layer index (1-based, from back)
 * @param totalLayers - Total number of layers
 * @returns Opacity value (0-1)
 */
function calculateLayerOpacity(layerIndex: number, totalLayers: number): number {
  const layerOffset = layerIndex / totalLayers;
  return BASE_OPACITY + OPACITY_RANGE * (1 - layerOffset);
}

/**
 * Render text extrusion layers.
 *
 * Creates multiple offset copies of the text to simulate depth.
 * Layers are rendered from back to front with decreasing opacity.
 *
 * @param content - Text content to extrude
 * @param extrusionHeight - Extrusion depth in pixels
 * @param cameraPreset - Camera preset for direction calculation
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @returns React elements for extrusion layers
 */
export function renderTextExtrusion(
  content: ReactNode,
  extrusionHeight: number,
  cameraPreset: string,
  centerX: number,
  centerY: number,
): ReactNode {
  const { offsetX, offsetY } = getExtrusionOffset(cameraPreset, extrusionHeight);
  const layers = calculateLayerCount(extrusionHeight);
  const elements: ReactNode[] = [];

  // Render layers from back (i = layers) to front (i = 1)
  for (const i of Array.from({ length: layers }, (_, idx) => layers - idx)) {
    const layerOffset = i / layers;
    const x = offsetX * layerOffset;
    const y = offsetY * layerOffset;
    const opacity = calculateLayerOpacity(i, layers);

    elements.push(
      <g
        key={`extrusion-${i}`}
        transform={`translate(${centerX}, ${centerY}) translate(${x}, ${y}) translate(${-centerX}, ${-centerY})`}
        opacity={opacity}
        style={{ fill: EXTRUSION_FILL_COLOR }}
      >
        {content}
      </g>,
    );
  }

  return <>{elements}</>;
}
