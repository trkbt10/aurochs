/**
 * @file 3D Effects Renderer
 *
 * Renders 3D shape effects as 2D SVG approximations.
 * Since SVG is a 2D format, this module uses transforms, gradients,
 * and additional paths to simulate 3D effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Scene/Shape Properties)
 */

import type { Scene3d, Shape3d, LightRig, Bevel3d } from "../../domain/index";
import type { Degrees } from "../../domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Camera preset types for 3D positioning.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera prst attribute)
 */
export type CameraPreset =
  | "legacyObliqueTopLeft"
  | "legacyObliqueTop"
  | "legacyObliqueTopRight"
  | "legacyObliqueLeft"
  | "legacyObliqueFront"
  | "legacyObliqueRight"
  | "legacyObliqueBottomLeft"
  | "legacyObliqueBottom"
  | "legacyObliqueBottomRight"
  | "legacyPerspectiveTopLeft"
  | "legacyPerspectiveTop"
  | "legacyPerspectiveTopRight"
  | "legacyPerspectiveLeft"
  | "legacyPerspectiveFront"
  | "legacyPerspectiveRight"
  | "legacyPerspectiveBottomLeft"
  | "legacyPerspectiveBottom"
  | "legacyPerspectiveBottomRight"
  | "orthographicFront"
  | "isometricTopUp"
  | "isometricTopDown"
  | "isometricBottomUp"
  | "isometricBottomDown"
  | "isometricLeftUp"
  | "isometricLeftDown"
  | "isometricRightUp"
  | "isometricRightDown"
  | "isometricOffAxis1Left"
  | "isometricOffAxis1Right"
  | "isometricOffAxis1Top"
  | "isometricOffAxis2Left"
  | "isometricOffAxis2Right"
  | "isometricOffAxis2Top"
  | "isometricOffAxis3Left"
  | "isometricOffAxis3Right"
  | "isometricOffAxis3Bottom"
  | "isometricOffAxis4Left"
  | "isometricOffAxis4Right"
  | "isometricOffAxis4Bottom"
  | "obliqueTopLeft"
  | "obliqueTop"
  | "obliqueTopRight"
  | "obliqueLeft"
  | "obliqueRight"
  | "obliqueBottomLeft"
  | "obliqueBottom"
  | "obliqueBottomRight"
  | "perspectiveFront"
  | "perspectiveLeft"
  | "perspectiveRight"
  | "perspectiveAbove"
  | "perspectiveBelow"
  | "perspectiveAboveLeftFacing"
  | "perspectiveAboveRightFacing"
  | "perspectiveContrastingLeftFacing"
  | "perspectiveContrastingRightFacing"
  | "perspectiveHeroicLeftFacing"
  | "perspectiveHeroicRightFacing"
  | "perspectiveHeroicExtremeLeftFacing"
  | "perspectiveHeroicExtremeRightFacing"
  | "perspectiveRelaxed"
  | "perspectiveRelaxedModerately";

/**
 * Light rig preset types.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.6 (lightRig rig attribute)
 */
export type LightRigPreset =
  | "legacyFlat1"
  | "legacyFlat2"
  | "legacyFlat3"
  | "legacyFlat4"
  | "legacyNormal1"
  | "legacyNormal2"
  | "legacyNormal3"
  | "legacyNormal4"
  | "legacyHarsh1"
  | "legacyHarsh2"
  | "legacyHarsh3"
  | "legacyHarsh4"
  | "threePt"
  | "balanced"
  | "soft"
  | "harsh"
  | "flood"
  | "contrasting"
  | "morning"
  | "sunrise"
  | "sunset"
  | "chilly"
  | "freezing"
  | "flat"
  | "twoPt"
  | "glow"
  | "brightRoom";

/**
 * Light direction.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.6 (lightRig dir attribute)
 */
export type LightDirection =
  | "tl" | "t" | "tr"
  | "l" | "r"
  | "bl" | "b" | "br";

/**
 * Bevel preset types.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB prst attribute)
 */
export type BevelPreset =
  | "relaxedInset"
  | "circle"
  | "slope"
  | "cross"
  | "angle"
  | "softRound"
  | "convex"
  | "coolSlant"
  | "divot"
  | "riblet"
  | "hardEdge"
  | "artDeco";

/**
 * Calculated 3D transform for SVG rendering.
 */
export type Transform3dResult = {
  /** SVG transform string for the main shape */
  readonly transform: string;
  /** Skew X angle in degrees */
  readonly skewX: number;
  /** Skew Y angle in degrees */
  readonly skewY: number;
  /** Scale factors */
  readonly scaleX: number;
  readonly scaleY: number;
  /** Rotation angle in degrees */
  readonly rotation: number;
};

/**
 * 3D effect rendering result.
 */
export type Effect3dResult = {
  /** SVG elements for extrusion (rendered behind main shape) */
  readonly extrusionElements: string;
  /** SVG elements for bevel highlight (rendered on main shape) */
  readonly bevelElements: string;
  /** SVG gradient definitions for lighting */
  readonly gradientDefs: string;
  /** CSS filter for shadow/glow effects */
  readonly filterStyle: string;
  /** Transform to apply to the main shape */
  readonly transform: Transform3dResult;
};

// =============================================================================
// Camera Transform Calculations
// =============================================================================

/**
 * Calculate 2D transform from camera preset.
 *
 * Maps 3D camera positions to 2D skew/scale transforms.
 *
 * @param preset - Camera preset name
 * @param fov - Field of view in degrees (optional)
 * @returns 2D transform approximation
 *
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera)
 */
export function calculateCameraTransform(
  preset: string,
  _fov?: Degrees,
): Transform3dResult {
  void _fov;
  // Default: no transform (orthographic front view)
  const defaultTransform: Transform3dResult = {
    transform: "",
    skewX: 0,
    skewY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  };

  // Map preset to transform
  switch (preset) {
    // Isometric views - apply skew transforms
    case "isometricTopUp":
    case "isometricTopDown":
      return {
        ...defaultTransform,
        skewX: -30,
        skewY: 30,
        transform: "skewX(-30) skewY(30)",
      };

    case "isometricLeftUp":
    case "isometricLeftDown":
      return {
        ...defaultTransform,
        skewX: 30,
        skewY: 0,
        transform: "skewX(30)",
      };

    case "isometricRightUp":
    case "isometricRightDown":
      return {
        ...defaultTransform,
        skewX: -30,
        skewY: 0,
        transform: "skewX(-30)",
      };

    // Oblique views - simpler skew
    case "obliqueTopLeft":
      return {
        ...defaultTransform,
        skewX: -15,
        skewY: -15,
        transform: "skewX(-15) skewY(-15)",
      };

    case "obliqueTopRight":
      return {
        ...defaultTransform,
        skewX: 15,
        skewY: -15,
        transform: "skewX(15) skewY(-15)",
      };

    case "obliqueBottomLeft":
      return {
        ...defaultTransform,
        skewX: -15,
        skewY: 15,
        transform: "skewX(-15) skewY(15)",
      };

    case "obliqueBottomRight":
      return {
        ...defaultTransform,
        skewX: 15,
        skewY: 15,
        transform: "skewX(15) skewY(15)",
      };

    case "obliqueTop":
      return {
        ...defaultTransform,
        skewY: -15,
        transform: "skewY(-15)",
      };

    case "obliqueBottom":
      return {
        ...defaultTransform,
        skewY: 15,
        transform: "skewY(15)",
      };

    case "obliqueLeft":
      return {
        ...defaultTransform,
        skewX: -15,
        transform: "skewX(-15)",
      };

    case "obliqueRight":
      return {
        ...defaultTransform,
        skewX: 15,
        transform: "skewX(15)",
      };

    // Perspective views - scale for depth effect
    case "perspectiveFront":
    case "perspectiveRelaxed":
      return {
        ...defaultTransform,
        scaleY: 0.9,
        transform: "scale(1, 0.9)",
      };

    case "perspectiveAbove":
      return {
        ...defaultTransform,
        skewY: -10,
        scaleY: 0.85,
        transform: "skewY(-10) scale(1, 0.85)",
      };

    case "perspectiveBelow":
      return {
        ...defaultTransform,
        skewY: 10,
        scaleY: 0.85,
        transform: "skewY(10) scale(1, 0.85)",
      };

    case "perspectiveLeft":
      return {
        ...defaultTransform,
        skewX: -10,
        scaleX: 0.9,
        transform: "skewX(-10) scale(0.9, 1)",
      };

    case "perspectiveRight":
      return {
        ...defaultTransform,
        skewX: 10,
        scaleX: 0.9,
        transform: "skewX(10) scale(0.9, 1)",
      };

    // Orthographic front - no transform
    case "orthographicFront":
    default:
      return defaultTransform;
  }
}

// =============================================================================
// Lighting Calculations
// =============================================================================

/**
 * Calculate lighting gradient based on light rig settings.
 *
 * Creates an SVG gradient that simulates lighting effects.
 *
 * @param lightRig - Light rig settings
 * @param gradientId - Unique ID for the gradient
 * @returns SVG gradient definition
 *
 * @see ECMA-376 Part 1, Section 20.1.5.6 (lightRig)
 */
export function calculateLightingGradient(
  lightRig: LightRig,
  gradientId: string,
): string {
  const direction = lightRig.direction as LightDirection;
  const rig = lightRig.rig as LightRigPreset;

  // Calculate gradient angle based on light direction
  const { x1, y1, x2, y2 } = getGradientCoordinates(direction);

  // Calculate lighting intensity based on rig type
  const { highlightOpacity, shadowOpacity } = getLightingIntensity(rig);

  return `
    <linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="white" stop-opacity="${highlightOpacity}"/>
      <stop offset="50%" stop-color="white" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="${shadowOpacity}"/>
    </linearGradient>
  `.trim();
}

/**
 * Get gradient coordinates for light direction.
 */
function getGradientCoordinates(direction: LightDirection): {
  x1: number; y1: number; x2: number; y2: number;
} {
  switch (direction) {
    case "tl": return { x1: 0, y1: 0, x2: 100, y2: 100 };
    case "t":  return { x1: 50, y1: 0, x2: 50, y2: 100 };
    case "tr": return { x1: 100, y1: 0, x2: 0, y2: 100 };
    case "l":  return { x1: 0, y1: 50, x2: 100, y2: 50 };
    case "r":  return { x1: 100, y1: 50, x2: 0, y2: 50 };
    case "bl": return { x1: 0, y1: 100, x2: 100, y2: 0 };
    case "b":  return { x1: 50, y1: 100, x2: 50, y2: 0 };
    case "br": return { x1: 100, y1: 100, x2: 0, y2: 0 };
    default:   return { x1: 0, y1: 0, x2: 100, y2: 100 };
  }
}

/**
 * Get lighting intensity based on rig preset.
 */
function getLightingIntensity(rig: LightRigPreset): {
  highlightOpacity: number;
  shadowOpacity: number;
} {
  switch (rig) {
    case "harsh":
    case "legacyHarsh1":
    case "legacyHarsh2":
    case "legacyHarsh3":
    case "legacyHarsh4":
      return { highlightOpacity: 0.4, shadowOpacity: 0.4 };

    case "soft":
    case "balanced":
      return { highlightOpacity: 0.2, shadowOpacity: 0.2 };

    case "flat":
    case "legacyFlat1":
    case "legacyFlat2":
    case "legacyFlat3":
    case "legacyFlat4":
      return { highlightOpacity: 0.1, shadowOpacity: 0.1 };

    case "flood":
    case "brightRoom":
      return { highlightOpacity: 0.3, shadowOpacity: 0.1 };

    case "contrasting":
      return { highlightOpacity: 0.5, shadowOpacity: 0.5 };

    case "glow":
      return { highlightOpacity: 0.4, shadowOpacity: 0.15 };

    case "threePt":
    case "twoPt":
    default:
      return { highlightOpacity: 0.25, shadowOpacity: 0.25 };
  }
}

// =============================================================================
// Bevel Rendering
// =============================================================================

/**
 * Create SVG elements for bevel effect.
 *
 * Simulates bevel using inner strokes with gradients.
 *
 * @param bevel - Bevel properties
 * @param width - Shape width
 * @param height - Shape height
 * @param lightDirection - Direction of light
 * @returns SVG elements for bevel effect
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export function renderBevelEffect(
  bevel: Bevel3d,
  width: number,
  height: number,
  lightDirection: LightDirection = "tl",
): string {
  const bevelWidth = Math.min(bevel.width, width / 4, height / 4);
  const bevelHeight = Math.min(bevel.height, width / 4, height / 4);

  if (bevelWidth <= 0 || bevelHeight <= 0) {
    return "";
  }

  // Calculate highlight and shadow colors based on light direction
  const { highlightSide, shadowSide } = getBevelSides(lightDirection);

  // Create bevel paths for each side
  const paths: string[] = [];

  // Top edge highlight
  if (highlightSide.includes("top")) {
    paths.push(`
      <path d="M 0,0 L ${width},0 L ${width - bevelWidth},${bevelHeight} L ${bevelWidth},${bevelHeight} Z"
            fill="rgba(255,255,255,0.3)" />
    `);
  } else {
    paths.push(`
      <path d="M 0,0 L ${width},0 L ${width - bevelWidth},${bevelHeight} L ${bevelWidth},${bevelHeight} Z"
            fill="rgba(0,0,0,0.2)" />
    `);
  }

  // Left edge
  if (highlightSide.includes("left")) {
    paths.push(`
      <path d="M 0,0 L ${bevelWidth},${bevelHeight} L ${bevelWidth},${height - bevelHeight} L 0,${height} Z"
            fill="rgba(255,255,255,0.25)" />
    `);
  } else {
    paths.push(`
      <path d="M 0,0 L ${bevelWidth},${bevelHeight} L ${bevelWidth},${height - bevelHeight} L 0,${height} Z"
            fill="rgba(0,0,0,0.15)" />
    `);
  }

  // Bottom edge shadow
  if (shadowSide.includes("bottom")) {
    paths.push(`
      <path d="M 0,${height} L ${bevelWidth},${height - bevelHeight} L ${width - bevelWidth},${height - bevelHeight} L ${width},${height} Z"
            fill="rgba(0,0,0,0.25)" />
    `);
  } else {
    paths.push(`
      <path d="M 0,${height} L ${bevelWidth},${height - bevelHeight} L ${width - bevelWidth},${height - bevelHeight} L ${width},${height} Z"
            fill="rgba(255,255,255,0.2)" />
    `);
  }

  // Right edge
  if (shadowSide.includes("right")) {
    paths.push(`
      <path d="M ${width},0 L ${width},${height} L ${width - bevelWidth},${height - bevelHeight} L ${width - bevelWidth},${bevelHeight} Z"
            fill="rgba(0,0,0,0.2)" />
    `);
  } else {
    paths.push(`
      <path d="M ${width},0 L ${width},${height} L ${width - bevelWidth},${height - bevelHeight} L ${width - bevelWidth},${bevelHeight} Z"
            fill="rgba(255,255,255,0.25)" />
    `);
  }

  return `<g class="bevel-effect">${paths.join("\n")}</g>`;
}

/**
 * Determine which sides receive highlight vs shadow based on light direction.
 */
function getBevelSides(direction: LightDirection): {
  highlightSide: string[];
  shadowSide: string[];
} {
  switch (direction) {
    case "tl": return { highlightSide: ["top", "left"], shadowSide: ["bottom", "right"] };
    case "t":  return { highlightSide: ["top"], shadowSide: ["bottom"] };
    case "tr": return { highlightSide: ["top", "right"], shadowSide: ["bottom", "left"] };
    case "l":  return { highlightSide: ["left"], shadowSide: ["right"] };
    case "r":  return { highlightSide: ["right"], shadowSide: ["left"] };
    case "bl": return { highlightSide: ["bottom", "left"], shadowSide: ["top", "right"] };
    case "b":  return { highlightSide: ["bottom"], shadowSide: ["top"] };
    case "br": return { highlightSide: ["bottom", "right"], shadowSide: ["top", "left"] };
    default:   return { highlightSide: ["top", "left"], shadowSide: ["bottom", "right"] };
  }
}

// =============================================================================
// Extrusion Rendering
// =============================================================================

/**
 * Create SVG elements for extrusion (depth) effect.
 *
 * Renders additional copies of the shape offset to create depth illusion.
 *
 * @param shapePath - SVG path data for the shape
 * @param extrusionHeight - Height of extrusion in pixels
 * @param extrusionColor - Color for extrusion (default: dark gray)
 * @param camera - Camera preset for determining extrusion direction
 * @returns SVG elements for extrusion
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d extrusionH)
 */
export function renderExtrusionEffect(
  shapePath: string,
  extrusionHeight: number,
  extrusionColor: string = "#666666",
  camera: string = "orthographicFront",
): string {
  if (extrusionHeight <= 0) {
    return "";
  }

  // Calculate extrusion offset based on camera angle
  const { offsetX, offsetY } = getExtrusionOffset(camera, extrusionHeight);

  // Create multiple layers for depth effect
  const layers = Math.min(Math.ceil(extrusionHeight / 2), 10);
  const paths: string[] = [];

  for (let i = layers; i > 0; i--) {
    const layerOffset = (i / layers);
    const x = offsetX * layerOffset;
    const y = offsetY * layerOffset;
    const opacity = 0.5 + (0.5 * (1 - layerOffset));

    paths.push(`
      <path d="${shapePath}"
            transform="translate(${x}, ${y})"
            fill="${extrusionColor}"
            fill-opacity="${opacity}"
            stroke="none" />
    `);
  }

  return `<g class="extrusion-effect">${paths.join("\n")}</g>`;
}

/**
 * Calculate extrusion offset direction based on camera.
 */
function getExtrusionOffset(camera: string, height: number): {
  offsetX: number;
  offsetY: number;
} {
  const depth = height * 0.5; // Scale down for 2D approximation

  switch (camera) {
    case "isometricTopUp":
    case "isometricTopDown":
      return { offsetX: depth * 0.5, offsetY: depth * 0.5 };

    case "obliqueTopLeft":
    case "perspectiveAboveLeftFacing":
      return { offsetX: -depth, offsetY: -depth };

    case "obliqueTopRight":
    case "perspectiveAboveRightFacing":
      return { offsetX: depth, offsetY: -depth };

    case "obliqueBottomLeft":
      return { offsetX: -depth, offsetY: depth };

    case "obliqueBottomRight":
      return { offsetX: depth, offsetY: depth };

    case "obliqueTop":
    case "perspectiveAbove":
      return { offsetX: 0, offsetY: -depth };

    case "obliqueBottom":
    case "perspectiveBelow":
      return { offsetX: 0, offsetY: depth };

    case "obliqueLeft":
    case "perspectiveLeft":
      return { offsetX: -depth, offsetY: 0 };

    case "obliqueRight":
    case "perspectiveRight":
      return { offsetX: depth, offsetY: 0 };

    default:
      // Default: slight bottom-right offset
      return { offsetX: depth * 0.3, offsetY: depth * 0.3 };
  }
}

// =============================================================================
// Main 3D Effect Renderer
// =============================================================================

/**
 * Render complete 3D effects for a shape.
 *
 * Combines camera transform, lighting, bevel, and extrusion effects
 * into SVG elements that approximate 3D rendering.
 *
 * @param scene3d - 3D scene properties (camera, lighting)
 * @param shape3d - 3D shape properties (bevel, extrusion)
 * @param shapePath - SVG path data for the shape
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @param shapeId - Unique ID for the shape (for gradient IDs)
 * @returns 3D effect rendering result
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */
export function render3dEffects(
  scene3d: Scene3d | undefined,
  shape3d: Shape3d | undefined,
  shapePath: string,
  width: number,
  height: number,
  shapeId: string,
): Effect3dResult {
  const result: Effect3dResult = {
    extrusionElements: "",
    bevelElements: "",
    gradientDefs: "",
    filterStyle: "",
    transform: {
      transform: "",
      skewX: 0,
      skewY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
  };

  // If no 3D properties, return empty result
  if (!scene3d && !shape3d) {
    return result;
  }

  // Calculate camera transform
  const cameraPreset = scene3d?.camera?.preset ?? "orthographicFront";
  const transform = calculateCameraTransform(cameraPreset, scene3d?.camera?.fov);

  // Get light direction
  const lightDirection = (scene3d?.lightRig?.direction ?? "tl") as LightDirection;

  const gradientDefs = buildLightingGradient(scene3d?.lightRig, shapeId);
  const extrusionElements = buildExtrusionElements(shape3d, shapePath, cameraPreset);
  const bevelElements = buildBevelElements(shape3d, width, height, lightDirection);

  return {
    extrusionElements,
    bevelElements,
    gradientDefs,
    filterStyle: "",
    transform,
  };
}

function buildLightingGradient(
  lightRig: Scene3D["lightRig"] | undefined,
  shapeId: string
): string {
  if (!lightRig) {
    return "";
  }
  const gradientId = `lighting-${shapeId}`;
  return calculateLightingGradient(lightRig, gradientId);
}

function buildExtrusionElements(
  shape3d: Shape3D | undefined,
  shapePath: string,
  cameraPreset: string
): string {
  if (!shape3d?.extrusionHeight || shape3d.extrusionHeight <= 0) {
    return "";
  }
  const extrusionColor = "#888888";
  return renderExtrusionEffect(shapePath, shape3d.extrusionHeight, extrusionColor, cameraPreset);
}

function buildBevelElements(
  shape3d: Shape3D | undefined,
  width: number,
  height: number,
  lightDirection: LightDirection
): string {
  if (!shape3d?.bevel) {
    return "";
  }
  return renderBevelEffect(shape3d.bevel, width, height, lightDirection);
}

/**
 * Check if shape has any 3D effects that need rendering.
 *
 * @param scene3d - 3D scene properties
 * @param shape3d - 3D shape properties
 * @returns True if shape has 3D effects
 */
export function has3dEffects(
  scene3d: Scene3d | undefined,
  shape3d: Shape3d | undefined,
): boolean {
  if (!scene3d && !shape3d) {
    return false;
  }

  // Check for meaningful 3D effects
  if (shape3d?.extrusionHeight && shape3d.extrusionHeight > 0) {
    return true;
  }

  if (shape3d?.bevel) {
    return true;
  }

  if (scene3d?.camera?.preset && scene3d.camera.preset !== "orthographicFront") {
    return true;
  }

  return false;
}
