/**
 * @file Text 3D type definitions
 *
 * Types for 3D text rendering (bevel, extrusion).
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// =============================================================================
// Bevel Types
// =============================================================================

/**
 * Bevel configuration from Shape3d
 */
export type BevelConfig = {
  readonly width: number;
  readonly height: number;
  readonly preset: string;
};

/**
 * Offset values for highlight and shadow
 */
export type BevelOffset = {
  readonly x: number;
  readonly y: number;
};

/**
 * Combined highlight and shadow offsets
 */
export type BevelOffsets = {
  readonly highlightOffset: BevelOffset;
  readonly shadowOffset: BevelOffset;
};

// =============================================================================
// Extrusion Types
// =============================================================================

/**
 * Extrusion offset based on camera angle
 */
export type ExtrusionOffset = {
  readonly offsetX: number;
  readonly offsetY: number;
};

// =============================================================================
// Scene/Shape 3D Types (minimal for rendering)
// =============================================================================

/**
 * Light rig direction
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LightRigDirection)
 */
export type LightRigDirection =
  | "b"
  | "bl"
  | "br"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Camera preset type (commonly used ones)
 */
export type PresetCameraType = string;

/**
 * 3D camera (minimal)
 */
export type Camera3d = {
  readonly preset: PresetCameraType;
  readonly fov?: number;
};

/**
 * 3D light rig (minimal)
 */
export type LightRig = {
  readonly direction: LightRigDirection;
};

/**
 * 3D scene properties (minimal for rendering)
 */
export type Scene3d = {
  readonly camera?: Camera3d;
  readonly lightRig?: LightRig;
};

/**
 * 3D bevel (minimal)
 */
export type Bevel3d = {
  readonly width: number;
  readonly height: number;
  readonly preset: string;
};

/**
 * 3D shape properties (minimal for rendering)
 */
export type Shape3d = {
  readonly extrusionHeight?: number;
  readonly bevelTop?: Bevel3d;
  readonly bevelBottom?: Bevel3d;
};
