/**
 * @file WordArt Demo Presets
 *
 * Demo-specific presets for the WordArt gallery page.
 * These are NOT ECMA-376 compliant domain types - they are convenience
 * definitions for the demo UI only.
 *
 * For ECMA-376 compliant types, see:
 * - domain/text.ts: TextWarp, TextShapeType
 * - domain/color.ts: GradientFill, GradientStop
 * - domain/3d.ts: PresetMaterialType, PresetCameraType, etc.
 */

import type { PresetMaterialType, PresetCameraType, BevelPresetType, LightRigType, LightRigDirection } from "@lib/pptx/domain/three-d";

/**
 * Demo gradient stop (resolved color)
 */
export type DemoGradientStop = {
  readonly position: number;
  readonly color: string;
};

/**
 * Demo fill type (resolved colors)
 */
export type DemoFill =
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "gradient"; readonly angle: number; readonly stops: readonly DemoGradientStop[] };

/**
 * Demo WordArt preset configuration
 */
export type DemoWordArtPreset = {
  readonly id: string;
  readonly name: string;
  readonly fill: DemoFill;
  readonly extrusion: number;
  readonly material: PresetMaterialType;
  readonly camera: PresetCameraType;
  readonly lightRig: {
    readonly rig: LightRigType;
    readonly direction: LightRigDirection;
  };
  readonly bevel?: {
    readonly width: number;
    readonly height: number;
    readonly preset: BevelPresetType;
  };
};

// =============================================================================
// Preset Colors (Demo)
// =============================================================================

const colors = {
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  blue: "#4169E1",
  red: "#DC143C",
  green: "#228B22",
  purple: "#8B008B",
  orange: "#FF8C00",
  cyan: "#00CED1",
  magenta: "#FF00FF",
};

// =============================================================================
// Demo Presets
// =============================================================================

/**
 * Row 1: 2D Styles (no extrusion)
 */
const row1: DemoWordArtPreset[] = [
  {
    id: "2d-gold-outline",
    name: "Gold Outline",
    fill: { type: "solid", color: colors.gold },
    extrusion: 0,
    material: "flat",
    camera: "orthographicFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
  {
    id: "2d-blue-gradient",
    name: "Blue Gradient",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#0000FF" },
        { position: 100, color: "#00BFFF" },
      ],
    },
    extrusion: 0,
    material: "flat",
    camera: "orthographicFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
  {
    id: "2d-sunset",
    name: "Sunset",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF4500" },
        { position: 50, color: "#FFD700" },
        { position: 100, color: "#FF6347" },
      ],
    },
    extrusion: 0,
    material: "flat",
    camera: "orthographicFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
  {
    id: "2d-silver",
    name: "Silver",
    fill: { type: "solid", color: colors.silver },
    extrusion: 0,
    material: "flat",
    camera: "orthographicFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
  {
    id: "2d-rainbow",
    name: "Rainbow",
    fill: {
      type: "gradient",
      angle: 0,
      stops: [
        { position: 0, color: "#FF0000" },
        { position: 17, color: "#FF7F00" },
        { position: 33, color: "#FFFF00" },
        { position: 50, color: "#00FF00" },
        { position: 67, color: "#0000FF" },
        { position: 83, color: "#4B0082" },
        { position: 100, color: "#8B00FF" },
      ],
    },
    extrusion: 0,
    material: "flat",
    camera: "orthographicFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
];

/**
 * Row 2: Simple 3D (light extrusion)
 */
const row2: DemoWordArtPreset[] = [
  {
    id: "3d-blue-plastic",
    name: "Blue Plastic",
    fill: { type: "solid", color: colors.blue },
    extrusion: 10,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "threePt", direction: "t" },
  },
  {
    id: "3d-red-matte",
    name: "Red Matte",
    fill: { type: "solid", color: colors.red },
    extrusion: 15,
    material: "matte",
    camera: "perspectiveFront",
    lightRig: { rig: "balanced", direction: "t" },
  },
  {
    id: "3d-gold-metal",
    name: "Gold Metal",
    fill: { type: "solid", color: colors.gold },
    extrusion: 12,
    material: "metal",
    camera: "perspectiveFront",
    lightRig: { rig: "threePt", direction: "t" },
    bevel: { width: 4, height: 3, preset: "relaxedInset" },
  },
  {
    id: "3d-green-soft",
    name: "Green Soft",
    fill: { type: "solid", color: colors.green },
    extrusion: 8,
    material: "softEdge",
    camera: "perspectiveFront",
    lightRig: { rig: "soft", direction: "t" },
  },
  {
    id: "3d-purple-gradient",
    name: "Purple Gradient",
    fill: {
      type: "gradient",
      angle: 45,
      stops: [
        { position: 0, color: "#8B008B" },
        { position: 100, color: "#FF00FF" },
      ],
    },
    extrusion: 12,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "threePt", direction: "t" },
  },
];

/**
 * Row 3: Advanced 3D (bevels and effects)
 */
const row3: DemoWordArtPreset[] = [
  {
    id: "3d-chrome",
    name: "Chrome",
    fill: { type: "solid", color: colors.silver },
    extrusion: 20,
    material: "metal",
    camera: "perspectiveRelaxedModerately",
    lightRig: { rig: "threePt", direction: "t" },
    bevel: { width: 6, height: 5, preset: "circle" },
  },
  {
    id: "3d-gold-bevel",
    name: "Gold Bevel",
    fill: { type: "solid", color: colors.gold },
    extrusion: 25,
    material: "metal",
    camera: "perspectiveHeroicExtremeRightFacing",
    lightRig: { rig: "threePt", direction: "t" },
    bevel: { width: 8, height: 6, preset: "artDeco" },
  },
  {
    id: "3d-ocean",
    name: "Ocean",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#006994" },
        { position: 50, color: "#40E0D0" },
        { position: 100, color: "#00CED1" },
      ],
    },
    extrusion: 18,
    material: "plastic",
    camera: "perspectiveContrastingRightFacing",
    lightRig: { rig: "glow", direction: "t" },
    bevel: { width: 5, height: 4, preset: "convex" },
  },
  {
    id: "3d-fire",
    name: "Fire",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#8B0000" },
        { position: 30, color: "#FF4500" },
        { position: 60, color: "#FFA500" },
        { position: 100, color: "#FFFF00" },
      ],
    },
    extrusion: 22,
    material: "plastic",
    camera: "perspectiveHeroicRightFacing",
    lightRig: { rig: "sunrise", direction: "t" },
    bevel: { width: 4, height: 3, preset: "riblet" },
  },
  {
    id: "3d-neon",
    name: "Neon",
    fill: {
      type: "gradient",
      angle: 0,
      stops: [
        { position: 0, color: "#FF00FF" },
        { position: 50, color: "#00FFFF" },
        { position: 100, color: "#FF00FF" },
      ],
    },
    extrusion: 15,
    material: "clear",
    camera: "perspectiveFront",
    lightRig: { rig: "glow", direction: "t" },
  },
];

/**
 * Row 4: Extreme 3D
 */
const row4: DemoWordArtPreset[] = [
  {
    id: "3d-extreme-gold",
    name: "Extreme Gold",
    fill: { type: "solid", color: colors.gold },
    extrusion: 40,
    material: "metal",
    camera: "perspectiveHeroicExtremeLeftFacing",
    lightRig: { rig: "threePt", direction: "tl" },
    bevel: { width: 10, height: 8, preset: "coolSlant" },
  },
  {
    id: "3d-extreme-silver",
    name: "Extreme Silver",
    fill: { type: "solid", color: colors.silver },
    extrusion: 45,
    material: "metal",
    camera: "perspectiveHeroicExtremeRightFacing",
    lightRig: { rig: "chilly", direction: "t" },
    bevel: { width: 12, height: 10, preset: "angle" },
  },
  {
    id: "3d-extreme-blue",
    name: "Extreme Blue",
    fill: {
      type: "gradient",
      angle: 135,
      stops: [
        { position: 0, color: "#000080" },
        { position: 50, color: "#4169E1" },
        { position: 100, color: "#87CEEB" },
      ],
    },
    extrusion: 35,
    material: "plastic",
    camera: "perspectiveRelaxed",
    lightRig: { rig: "twoPt", direction: "t" },
    bevel: { width: 8, height: 6, preset: "softRound" },
  },
  {
    id: "3d-extreme-bronze",
    name: "Extreme Bronze",
    fill: { type: "solid", color: colors.bronze },
    extrusion: 50,
    material: "softmetal",
    camera: "perspectiveHeroicLeftFacing",
    lightRig: { rig: "sunset", direction: "t" },
    bevel: { width: 10, height: 8, preset: "cross" },
  },
  {
    id: "3d-extreme-matrix",
    name: "Matrix",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#003300" },
        { position: 50, color: "#00FF00" },
        { position: 100, color: "#003300" },
      ],
    },
    extrusion: 30,
    material: "clear",
    camera: "perspectiveFront",
    lightRig: { rig: "glow", direction: "t" },
    bevel: { width: 4, height: 3, preset: "relaxedInset" },
  },
];

/**
 * All demo presets organized by rows
 */
export const demoWordArtPresetRows: readonly (readonly DemoWordArtPreset[])[] = [
  row1,
  row2,
  row3,
  row4,
];

/**
 * Flat array of all presets
 */
export const allDemoWordArtPresets: readonly DemoWordArtPreset[] = [
  ...row1,
  ...row2,
  ...row3,
  ...row4,
];
