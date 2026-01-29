/**
 * @file Text Warp Geometry Transformation
 *
 * Transforms 3D text geometry according to ECMA-376 preset text warp types.
 * Each warp preset defines a mathematical transformation applied to vertex positions.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */

import * as THREE from "three";
import type { TextShapeType, TextWarp, TextWarpAdjustValue } from "@oxen-office/pptx/domain/text";

// =============================================================================
// Types
// =============================================================================

/**
 * Bounding box for normalization
 */
type BoundingBox = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
};

/**
 * Warp transformation function signature
 */
type WarpTransformArgs = [
  x: number,
  y: number,
  z: number,
  bounds: BoundingBox,
  adjustValues: readonly TextWarpAdjustValue[],
];

type WarpTransformFn = (...args: WarpTransformArgs) => [number, number, number];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get adjust value by name with default
 */
function getAdjustValue(
  adjustValues: readonly TextWarpAdjustValue[],
  name: string,
  defaultValue: number,
): number {
  const found = adjustValues.find((av) => av.name === name);
  return found !== undefined ? found.value : defaultValue;
}

/**
 * Compute bounding box from geometry
 */
function computeBoundingBox(geometry: THREE.BufferGeometry): BoundingBox {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;

  const minX = box.min.x;
  const maxX = box.max.x;
  const minY = box.min.y;
  const maxY = box.max.y;
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Normalize coordinates to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) {return 0.5;}
  return (value - min) / (max - min);
}

// =============================================================================
// Warp Transformation Functions
// =============================================================================

/**
 * No transformation (textNoShape, textPlain)
 */
const warpNoShape: WarpTransformFn = (x, y, z) => [x, y, z];

/**
 * Arch Up warp (textArchUp)
 * Text curves upward in an arc
 * @see ECMA-376 Part 1, Section 20.1.10.76
 */
const warpArchUp: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  // adj: amount of arch (default 50000 = 0.5)
  const adj = getAdjustValue(adjustValues, "adj", 50000) / 100000;

  // Normalize x to -1..1
  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;

  // Calculate arch offset based on x position (parabola)
  const archOffset = adj * bounds.height * (1 - nx * nx);

  return [x, y + archOffset, z];
};

/**
 * Arch Down warp (textArchDown)
 * Text curves downward in an arc
 */
const warpArchDown: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 50000) / 100000;
  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const archOffset = -adj * bounds.height * (1 - nx * nx);

  return [x, y + archOffset, z];
};

/**
 * Circle warp (textCircle)
 * Text arranged in a circle
 */
const warpCircle: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 50000) / 100000;

  // Normalize x to 0..2π
  const nx = normalize(x, bounds.minX, bounds.maxX);
  const angle = nx * Math.PI * 2 * adj;

  // Base radius from text height
  const radius = bounds.width / (Math.PI * 2 * adj);

  // Offset from center based on y position
  const ny = normalize(y, bounds.minY, bounds.maxY);
  const r = radius + (ny - 0.5) * bounds.height;

  // Convert to polar coordinates
  const newX = r * Math.sin(angle);
  const newY = r * Math.cos(angle);

  return [newX, newY, z];
};

/**
 * Wave 1 warp (textWave1)
 * Single sine wave distortion
 */
const warpWave1: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 12500) / 100000;

  // Normalize x
  const nx = normalize(x, bounds.minX, bounds.maxX);

  // Single sine wave
  const waveOffset = adj * bounds.height * Math.sin(nx * Math.PI * 2);

  return [x, y + waveOffset, z];
};

/**
 * Wave 2 warp (textWave2)
 * Double sine wave distortion (opposite phase)
 */
const warpWave2: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 12500) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX);
  const ny = normalize(y, bounds.minY, bounds.maxY);

  // Wave with opposite phase based on y position
  const phase = ny * Math.PI;
  const waveOffset = adj * bounds.height * Math.sin(nx * Math.PI * 2 + phase);

  return [x, y + waveOffset, z];
};

/**
 * Double Wave 1 warp (textDoubleWave1)
 * Two complete sine waves
 */
const warpDoubleWave1: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 12500) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX);
  const waveOffset = adj * bounds.height * Math.sin(nx * Math.PI * 4);

  return [x, y + waveOffset, z];
};

/**
 * Inflate warp (textInflate)
 * Text bulges in the center
 */
const warpInflate: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  // Normalize to -1..1
  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const ny = normalize(y, bounds.minY, bounds.maxY) * 2 - 1;

  // Distance from center
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Scale factor (more at center, less at edges)
  const scale = 1 + adj * (1 - dist);

  // Apply scale from center
  const newX = bounds.centerX + (x - bounds.centerX) * scale;
  const newY = bounds.centerY + (y - bounds.centerY) * scale;

  return [newX, newY, z];
};

/**
 * Deflate warp (textDeflate)
 * Text pinches in the center
 */
const warpDeflate: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const ny = normalize(y, bounds.minY, bounds.maxY) * 2 - 1;

  const dist = Math.sqrt(nx * nx + ny * ny);
  const scale = 1 - adj * (1 - dist);

  const newX = bounds.centerX + (x - bounds.centerX) * scale;
  const newY = bounds.centerY + (y - bounds.centerY) * scale;

  return [newX, newY, z];
};

/**
 * Curve Up warp (textCurveUp)
 * Text curves upward
 */
const warpCurveUp: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 45000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const curveOffset = adj * bounds.height * nx * nx;

  return [x, y + curveOffset, z];
};

/**
 * Curve Down warp (textCurveDown)
 * Text curves downward
 */
const warpCurveDown: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 45000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const curveOffset = -adj * bounds.height * nx * nx;

  return [x, y + curveOffset, z];
};

/**
 * Triangle warp (textTriangle)
 * Text forms a triangle shape (wider at bottom)
 */
const warpTriangle: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 50000) / 100000;

  const ny = normalize(y, bounds.minY, bounds.maxY);

  // Scale x based on y position (wider at bottom)
  const scale = 1 - adj + adj * ny;
  const newX = bounds.centerX + (x - bounds.centerX) * scale;

  return [newX, y, z];
};

/**
 * Triangle Inverted warp (textTriangleInverted)
 * Text forms inverted triangle (wider at top)
 */
const warpTriangleInverted: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 50000) / 100000;

  const ny = normalize(y, bounds.minY, bounds.maxY);
  const scale = 1 - adj + adj * (1 - ny);
  const newX = bounds.centerX + (x - bounds.centerX) * scale;

  return [newX, y, z];
};

/**
 * Chevron warp (textChevron)
 * Text forms chevron shape (V pointing up)
 */
const warpChevron: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const offset = adj * bounds.height * Math.abs(nx);

  return [x, y + offset, z];
};

/**
 * Chevron Inverted warp (textChevronInverted)
 * Text forms inverted chevron (V pointing down)
 */
const warpChevronInverted: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const offset = -adj * bounds.height * Math.abs(nx);

  return [x, y + offset, z];
};

/**
 * Stop sign warp (textStop)
 * Text forms octagon shape
 */
const warpStop: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const ny = normalize(y, bounds.minY, bounds.maxY) * 2 - 1;

  // Octagon clipping
  const maxDist = Math.max(Math.abs(nx), Math.abs(ny));
  const cornerDist = (Math.abs(nx) + Math.abs(ny)) / 2;

  if (cornerDist > maxDist) {
    const scale = 1 - adj * (cornerDist - maxDist);
    return [
      bounds.centerX + (x - bounds.centerX) * scale,
      bounds.centerY + (y - bounds.centerY) * scale,
      z,
    ];
  }

  return [x, y, z];
};

/**
 * Button warp (textButton)
 * Text forms button shape with curved top and bottom
 */
const warpButton: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 10000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;
  const ny = normalize(y, bounds.minY, bounds.maxY) * 2 - 1;

  // Apply curve at top and bottom
  const curveAmount = adj * bounds.height * (1 - nx * nx);
  const offsetY = ny > 0 ? curveAmount * ny : -curveAmount * Math.abs(ny);

  return [x, y + offsetY, z];
};

/**
 * Can Up warp (textCanUp)
 * Text curves like a 3D cylinder viewed from above
 */
const warpCanUp: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;

  // 3D cylinder effect - push center back
  const zOffset = -adj * bounds.height * (1 - Math.abs(nx));
  const yOffset = adj * bounds.height * 0.5 * (1 - nx * nx);

  return [x, y + yOffset, z + zOffset];
};

/**
 * Can Down warp (textCanDown)
 * Text curves like a 3D cylinder viewed from below
 */
const warpCanDown: WarpTransformFn = (...args) => {
  const [x, y, z, bounds, adjustValues] = args;
  const adj = getAdjustValue(adjustValues, "adj", 25000) / 100000;

  const nx = normalize(x, bounds.minX, bounds.maxX) * 2 - 1;

  const zOffset = adj * bounds.height * (1 - Math.abs(nx));
  const yOffset = -adj * bounds.height * 0.5 * (1 - nx * nx);

  return [x, y + yOffset, z + zOffset];
};

// =============================================================================
// Warp Preset Registry
// =============================================================================

/**
 * Map of warp preset to transformation function
 */
const warpFunctions: Partial<Record<TextShapeType, WarpTransformFn>> = {
  textNoShape: warpNoShape,
  textPlain: warpNoShape,
  textArchUp: warpArchUp,
  textArchDown: warpArchDown,
  textCircle: warpCircle,
  textWave1: warpWave1,
  textWave2: warpWave2,
  textDoubleWave1: warpDoubleWave1,
  textWave4: warpDoubleWave1, // Similar to doubleWave1
  textInflate: warpInflate,
  textDeflate: warpDeflate,
  textCurveUp: warpCurveUp,
  textCurveDown: warpCurveDown,
  textTriangle: warpTriangle,
  textTriangleInverted: warpTriangleInverted,
  textChevron: warpChevron,
  textChevronInverted: warpChevronInverted,
  textStop: warpStop,
  textButton: warpButton,
  textCanUp: warpCanUp,
  textCanDown: warpCanDown,
  // Pour variants use same base with different adjust values
  textArchUpPour: warpArchUp,
  textArchDownPour: warpArchDown,
  textCirclePour: warpCircle,
  textButtonPour: warpButton,
  // Ring variants
  textRingInside: warpCircle,
  textRingOutside: warpCircle,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Apply text warp transformation to geometry
 *
 * Transforms vertex positions according to the ECMA-376 preset text warp type.
 * The geometry is modified in place.
 *
 * @param geometry - Three.js BufferGeometry to transform
 * @param warp - TextWarp configuration with preset and adjust values
 * @returns The transformed geometry (same instance)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */
export function applyTextWarp(geometry: THREE.BufferGeometry, warp: TextWarp): THREE.BufferGeometry {
  const warpFn = warpFunctions[warp.preset];

  // No transformation for unsupported presets
  if (!warpFn || warp.preset === "textNoShape" || warp.preset === "textPlain") {
    return geometry;
  }

  // Compute bounding box for normalization
  const bounds = computeBoundingBox(geometry);

  // Get position attribute
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    return geometry;
  }

  const positions = positionAttr.array as Float32Array;
  const adjustValues = warp.adjustValues;

  // Transform each vertex
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    const [newX, newY, newZ] = warpFn(x, y, z, bounds, adjustValues);

    positions[i] = newX;
    positions[i + 1] = newY;
    positions[i + 2] = newZ;
  }

  // Mark position attribute as needing update
  positionAttr.needsUpdate = true;

  // Recompute normals after transformation
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Check if a text warp preset is supported
 */
export function isTextWarpSupported(preset: TextShapeType): boolean {
  return warpFunctions[preset] !== undefined;
}

/**
 * Get list of supported text warp presets
 */
export function getSupportedTextWarps(): TextShapeType[] {
  return Object.keys(warpFunctions) as TextShapeType[];
}
