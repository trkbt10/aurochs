/**
 * @file WordArt Demo Presets
 *
 * Demo-specific presets for the WordArt gallery page.
 * Recreates the classic Microsoft Office WordArt Gallery (Office 2003 era).
 *
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
  /** Contour (outline) effect */
  readonly contour?: {
    readonly width: number;
    readonly color: string;
  };
  /** Shadow effect - ECMA-376 outerShdw compatible */
  readonly shadow?: {
    readonly type: "outer" | "inner";
    readonly color: string;
    readonly blurRadius: number;
    readonly distance: number;
    readonly direction: number; // degrees (0=right, 90=down)
    readonly opacity?: number;
  };
  /** Font family for preview text */
  readonly fontFamily?: string;
  /** Bold styling */
  readonly bold?: boolean;
  /** Italic slant angle */
  readonly italicAngle?: number;
};

// =============================================================================
// Classic WordArt Colors (Office 2003 Era)
// =============================================================================

const classicColors = {
  // Primary colors
  gold: "#FFD700",
  yellow: "#FFFF00",
  orange: "#FFA500",
  red: "#FF0000",
  darkRed: "#8B0000",
  crimson: "#DC143C",
  magenta: "#FF00FF",
  purple: "#800080",
  violet: "#9400D3",
  indigo: "#4B0082",
  blue: "#0000FF",
  royalBlue: "#4169E1",
  cyan: "#00FFFF",
  teal: "#008080",
  darkCyan: "#008B8B",
  green: "#008000",
  lime: "#00FF00",
  darkGreen: "#006400",
  // Neutrals
  black: "#000000",
  gray: "#808080",
  silver: "#C0C0C0",
  lightGray: "#D3D3D3",
  white: "#FFFFFF",
};

// =============================================================================
// Classic Rainbow Gradient (Iconic Office WordArt Rainbow)
// =============================================================================

/**
 * Classic Office WordArt Rainbow - vibrant and saturated (けばけばしい)
 * Uses fully saturated RGB primaries for maximum impact.
 */
const classicRainbowStops: readonly DemoGradientStop[] = [
  { position: 0, color: "#FF0000" },    // Red (pure)
  { position: 17, color: "#FF8000" },   // Orange (bright)
  { position: 33, color: "#FFFF00" },   // Yellow (pure)
  { position: 50, color: "#00FF00" },   // Green (pure)
  { position: 67, color: "#00FFFF" },   // Cyan (adds brightness)
  { position: 83, color: "#0080FF" },   // Blue (brighter than pure blue)
  { position: 100, color: "#FF00FF" },  // Magenta (brighter than violet)
];

// =============================================================================
// Row 1: Basic Styles (Light 3D)
// =============================================================================

const row1: DemoWordArtPreset[] = [
  // 1-1: Gold Outline - has a visible outline/contour
  {
    id: "classic-1-1",
    name: "Gold Outline",
    fill: { type: "solid", color: classicColors.gold },
    extrusion: 5,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    contour: { width: 2, color: "#8B6914" }, // Dark gold outline
  },
  // 1-2: Bold Black
  {
    id: "classic-1-2",
    name: "Bold Black",
    fill: { type: "solid", color: "#333333" }, // Slightly lighter for visibility
    extrusion: 5,
    material: "matte",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    bold: true,
  },
  // 1-3: Silver Metallic
  {
    id: "classic-1-3",
    name: "Silver Metallic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#E8E8E8" },
        { position: 30, color: "#FFFFFF" },
        { position: 50, color: "#C0C0C0" },
        { position: 70, color: "#FFFFFF" },
        { position: 100, color: "#A8A8A8" },
      ],
    },
    extrusion: 8,
    material: "metal",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 1-4: Black Italic
  {
    id: "classic-1-4",
    name: "Black Italic",
    fill: { type: "solid", color: "#333333" },
    extrusion: 6,
    material: "matte",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    italicAngle: 15,
  },
  // 1-5: Gray with Drop Shadow
  {
    id: "classic-1-5",
    name: "Gray Shadow",
    fill: { type: "solid", color: "#505050" },
    extrusion: 8,
    material: "matte",
    camera: "perspectiveContrastingLeftFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    shadow: {
      type: "outer",
      color: "#000000",
      blurRadius: 8,
      distance: 6,
      direction: 135, // bottom-right
      opacity: 0.5,
    },
  },
];

// =============================================================================
// Row 2: Gradient Styles
// =============================================================================

const row2: DemoWordArtPreset[] = [
  // 2-1: Blue Gradient
  {
    id: "classic-2-1",
    name: "Blue Gradient",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#0000FF" },
        { position: 100, color: "#00BFFF" },
      ],
    },
    extrusion: 8,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 2-2: Gold Italic
  {
    id: "classic-2-2",
    name: "Gold Italic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFD700" },
        { position: 50, color: "#FFC000" },
        { position: 100, color: "#FF8C00" },
      ],
    },
    extrusion: 8,
    material: "metal",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    italicAngle: 15,
  },
  // 2-3: Yellow-Green Gradient
  {
    id: "classic-2-3",
    name: "Yellow-Green",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFFF00" },
        { position: 100, color: "#32CD32" },
      ],
    },
    extrusion: 8,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 2-4: Classic Rainbow (vertical)
  {
    id: "classic-2-4",
    name: "Rainbow",
    fill: {
      type: "gradient",
      angle: 90,
      stops: classicRainbowStops,
    },
    extrusion: 10,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 2-5: Rainbow Italic
  {
    id: "classic-2-5",
    name: "Rainbow Italic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: classicRainbowStops,
    },
    extrusion: 10,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    italicAngle: 15,
  },
];

// =============================================================================
// Row 3: Bold Color Styles
// =============================================================================

const row3: DemoWordArtPreset[] = [
  // 3-1: Red Bold
  {
    id: "classic-3-1",
    name: "Red Bold",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF0000" },
        { position: 100, color: "#CC0000" },
      ],
    },
    extrusion: 10,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    bold: true,
  },
  // 3-2: Orange-Red Bold Italic
  {
    id: "classic-3-2",
    name: "Orange-Red Italic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF4500" },
        { position: 100, color: "#FF0000" },
      ],
    },
    extrusion: 10,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    bold: true,
    italicAngle: 15,
  },
  // 3-3: Silver Arc
  {
    id: "classic-3-3",
    name: "Silver Arc",
    fill: { type: "solid", color: classicColors.silver },
    extrusion: 8,
    material: "metal",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 3-4: Blue
  {
    id: "classic-3-4",
    name: "Blue",
    fill: { type: "solid", color: classicColors.royalBlue },
    extrusion: 8,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 3-5: Purple
  {
    id: "classic-3-5",
    name: "Purple",
    fill: { type: "solid", color: classicColors.purple },
    extrusion: 8,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
];

// =============================================================================
// Row 4: Perspective and Tilt Styles
// =============================================================================

const row4: DemoWordArtPreset[] = [
  // 4-1: Red Perspective Tilt
  {
    id: "classic-4-1",
    name: "Red Perspective",
    fill: {
      type: "gradient",
      angle: 45,
      stops: [
        { position: 0, color: "#FF4500" },
        { position: 100, color: "#FF0000" },
      ],
    },
    extrusion: 15,
    material: "plastic",
    camera: "perspectiveContrastingLeftFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 4-2: Orange 3D with Shadow
  {
    id: "classic-4-2",
    name: "Orange 3D",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFA500" },
        { position: 100, color: "#FF8C00" },
      ],
    },
    extrusion: 18,
    material: "plastic",
    camera: "perspectiveContrastingRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    shadow: {
      type: "outer",
      color: "#402000",
      blurRadius: 10,
      distance: 8,
      direction: 135,
      opacity: 0.6,
    },
  },
  // 4-3: Magenta Italic
  {
    id: "classic-4-3",
    name: "Magenta Italic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF00FF" },
        { position: 100, color: "#FF69B4" },
      ],
    },
    extrusion: 12,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
    italicAngle: 20,
  },
  // 4-4: Blue-Purple Gradient
  {
    id: "classic-4-4",
    name: "Blue-Purple",
    fill: {
      type: "gradient",
      angle: 0,
      stops: [
        { position: 0, color: "#0000FF" },
        { position: 100, color: "#8B008B" },
      ],
    },
    extrusion: 12,
    material: "plastic",
    camera: "perspectiveFront",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 4-5: Red Gradient 3D
  {
    id: "classic-4-5",
    name: "Red Gradient 3D",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF0000" },
        { position: 50, color: "#DC143C" },
        { position: 100, color: "#8B0000" },
      ],
    },
    extrusion: 20,
    material: "plastic",
    camera: "perspectiveContrastingRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
];

// =============================================================================
// Row 5: 3D Extruded Styles
// =============================================================================

const row5: DemoWordArtPreset[] = [
  // 5-1: Gold 3D Left Perspective (Iconic!)
  {
    id: "classic-5-1",
    name: "Gold 3D",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFD700" },
        { position: 30, color: "#FFC000" },
        { position: 70, color: "#FFD700" },
        { position: 100, color: "#B8860B" },
      ],
    },
    extrusion: 35,
    material: "metal",
    camera: "perspectiveHeroicLeftFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    bevel: { width: 6, height: 4, preset: "relaxedInset" },
  },
  // 5-2: Dark 3D
  {
    id: "classic-5-2",
    name: "Dark 3D",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#606060" },
        { position: 50, color: "#404040" },
        { position: 100, color: "#303030" },
      ],
    },
    extrusion: 30,
    material: "matte",
    camera: "perspectiveHeroicRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 5-3: Teal 3D Italic
  {
    id: "classic-5-3",
    name: "Teal 3D Italic",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#20B2AA" },
        { position: 100, color: "#008B8B" },
      ],
    },
    extrusion: 25,
    material: "plastic",
    camera: "perspectiveContrastingLeftFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    italicAngle: 15,
  },
  // 5-4: Orange 3D Heavy
  {
    id: "classic-5-4",
    name: "Orange 3D Heavy",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFA500" },
        { position: 50, color: "#FF8C00" },
        { position: 100, color: "#FF4500" },
      ],
    },
    extrusion: 40,
    material: "metal",
    camera: "perspectiveHeroicRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    bevel: { width: 8, height: 6, preset: "circle" },
  },
  // 5-5: Rainbow 3D (The Beautiful One!)
  {
    id: "classic-5-5",
    name: "Rainbow 3D",
    fill: {
      type: "gradient",
      angle: 0, // Horizontal rainbow
      stops: classicRainbowStops,
    },
    extrusion: 30,
    material: "plastic",
    camera: "perspectiveContrastingRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    bevel: { width: 4, height: 3, preset: "softRound" },
  },
];

// =============================================================================
// Row 6: Advanced and Special Effects
// =============================================================================

const row6: DemoWordArtPreset[] = [
  // 6-1: Yellow Gold 3D
  {
    id: "classic-6-1",
    name: "Gold 3D Alt",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFFF00" },
        { position: 50, color: "#FFD700" },
        { position: 100, color: "#FFA500" },
      ],
    },
    extrusion: 25,
    material: "metal",
    camera: "perspectiveRelaxedModerately",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 6-2: Dark Teal 3D
  {
    id: "classic-6-2",
    name: "Dark Teal 3D",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#008080" },
        { position: 50, color: "#006060" },
        { position: 100, color: "#004040" },
      ],
    },
    extrusion: 25,
    material: "plastic",
    camera: "perspectiveRelaxed",
    lightRig: { rig: "brightRoom", direction: "t" },
  },
  // 6-3: Yellow Outline 3D
  {
    id: "classic-6-3",
    name: "Yellow Outline",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FFFF00" },
        { position: 100, color: "#FFD700" },
      ],
    },
    extrusion: 20,
    material: "plastic",
    camera: "perspectiveRelaxedModerately",
    lightRig: { rig: "brightRoom", direction: "t" },
    contour: { width: 2, color: "#000000" },
  },
  // 6-4: Orange Perspective
  {
    id: "classic-6-4",
    name: "Orange Extreme",
    fill: {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#FF8C00" },
        { position: 50, color: "#FFA500" },
        { position: 100, color: "#FF4500" },
      ],
    },
    extrusion: 35,
    material: "metal",
    camera: "perspectiveHeroicExtremeRightFacing",
    lightRig: { rig: "brightRoom", direction: "t" },
    bevel: { width: 6, height: 5, preset: "artDeco" },
  },
  // 6-5: Rainbow 3D Alt (Beautiful finale!)
  {
    id: "classic-6-5",
    name: "Rainbow 3D Alt",
    fill: {
      type: "gradient",
      angle: 0,
      stops: classicRainbowStops,
    },
    extrusion: 28,
    material: "plastic",
    camera: "perspectiveRelaxed",
    lightRig: { rig: "brightRoom", direction: "t" },
    bevel: { width: 5, height: 4, preset: "convex" },
  },
];

// =============================================================================
// Export Presets
// =============================================================================

/**
 * All demo presets organized by rows (6 rows x 5 columns = 30 styles)
 */
export const demoWordArtPresetRows: readonly (readonly DemoWordArtPreset[])[] = [
  row1,
  row2,
  row3,
  row4,
  row5,
  row6,
];

/**
 * Flat array of all presets
 */
export const allDemoWordArtPresets: readonly DemoWordArtPreset[] = [
  ...row1,
  ...row2,
  ...row3,
  ...row4,
  ...row5,
  ...row6,
];
