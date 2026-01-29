/**
 * @file Text 3D effects rendering orchestration
 *
 * Combines camera transform, bevel, and extrusion for 3D text simulation.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import type { ReactNode } from "react";
import type { Scene3d, Shape3d, BevelConfig } from "./types";
import type { SvgDefsManager } from "../context/types";
import { calculateCameraTransform } from "./camera-transform";
import { renderTextExtrusion } from "./extrusion";
import { createTextBevelFilterDef } from "./bevel-filter";

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default camera preset (front-facing orthographic)
 */
const DEFAULT_CAMERA_PRESET = "orthographicFront";

/**
 * Default light direction (top-left)
 */
const DEFAULT_LIGHT_DIRECTION = "tl";

// =============================================================================
// 3D Effects Rendering
// =============================================================================

/**
 * Apply camera transform to content.
 *
 * @param content - Content to transform
 * @param cameraTransform - Camera transform string
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @returns Transformed content
 */
function applyCameraTransform(
  args: {
    readonly content: ReactNode;
    readonly cameraTransform: string;
    readonly centerX: number;
    readonly centerY: number;
  }
): ReactNode {
  const { content, cameraTransform, centerX, centerY } = args;
  if (cameraTransform === "") {
    return content;
  }

  return (
    <g transform={`translate(${centerX}, ${centerY}) ${cameraTransform} translate(${-centerX}, ${-centerY})`}>
      {content}
    </g>
  );
}

/**
 * Apply bevel effect to content.
 *
 * @param content - Content to apply bevel to
 * @param bevel - Bevel configuration (bevelTop or bevelBottom)
 * @param lightDirection - Light direction for bevel
 * @param defs - SVG defs manager
 * @returns Content with bevel filter applied
 */
function applyBevelEffect(
  args: {
    readonly content: ReactNode;
    readonly bevel: BevelConfig;
    readonly lightDirection: string;
    readonly defs: SvgDefsManager;
  }
): ReactNode {
  const { content, bevel, lightDirection, defs } = args;
  const bevelFilterId = defs.getNextId("text-bevel");

  if (!defs.hasDef(bevelFilterId)) {
    defs.addDef(bevelFilterId, createTextBevelFilterDef(bevel, lightDirection, bevelFilterId));
  }

  return (
    <g filter={`url(#${bevelFilterId})`}>
      {content}
    </g>
  );
}

/**
 * Apply bevel effect if shape3d has bevelTop defined.
 * For SVG 2D rendering, we use bevelTop (front face bevel) as the primary visual.
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT - top/front face bevel)
 */
function applyBevelEffectIfNeeded(
  args: {
    readonly content: ReactNode;
    readonly shape3d: Shape3d | undefined;
    readonly lightDirection: string;
    readonly defs: SvgDefsManager;
  }
): ReactNode {
  const { content, shape3d, lightDirection, defs } = args;
  // Use bevelTop (front face) for 2D SVG rendering
  const bevel = shape3d?.bevelTop;
  if (bevel === undefined) {
    return content;
  }

  return applyBevelEffect({ content, bevel, lightDirection, defs });
}

/**
 * Render 3D effects for text body.
 *
 * Applies camera transform, bevel, and extrusion effects to simulate 3D text.
 * Since SVG is 2D, this uses transforms and gradients to approximate 3D.
 *
 * @param content - Text content to apply 3D effects to
 * @param scene3d - Scene 3D properties (camera, lighting)
 * @param shape3d - Shape 3D properties (bevel, extrusion)
 * @param width - Text box width
 * @param height - Text box height
 * @param getNextId - Function to generate unique IDs
 * @param addDef - Function to add SVG definitions
 * @param hasDef - Function to check if definition exists
 * @returns React elements with 3D effects applied
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */
export function render3dTextEffects(
  args: {
    readonly content: ReactNode;
    readonly scene3d: Scene3d | undefined;
    readonly shape3d: Shape3d | undefined;
    readonly width: number;
    readonly height: number;
    readonly defs: SvgDefsManager;
  }
): ReactNode {
  const { content, scene3d, shape3d, width, height, defs } = args;
  const centerX = width / 2;
  const centerY = height / 2;
  const elements: ReactNode[] = [];

  // Get camera and light properties
  const cameraPreset = scene3d?.camera?.preset ?? DEFAULT_CAMERA_PRESET;
  const cameraTransform = calculateCameraTransform(cameraPreset, scene3d?.camera?.fov);
  const lightDirection = scene3d?.lightRig?.direction ?? DEFAULT_LIGHT_DIRECTION;

  // Render extrusion effect (behind main text)
  const extrusionHeight = shape3d?.extrusionHeight;
  if (extrusionHeight !== undefined && extrusionHeight > 0) {
    const extrusionLayers = renderTextExtrusion({
      content,
      extrusionHeight,
      cameraPreset,
      centerX,
      centerY,
    });
    elements.push(extrusionLayers);
  }

  // Main text content with camera transform
  const transformedContent = applyCameraTransform({
    content,
    cameraTransform: cameraTransform.transform,
    centerX,
    centerY,
  });

  // Apply bevel effect if present
  const finalContent = applyBevelEffectIfNeeded({
    content: transformedContent,
    shape3d,
    lightDirection,
    defs,
  });

  elements.push(finalContent);

  return <>{elements}</>;
}
