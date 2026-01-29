/**
 * @file Demo Utilities for WebGL Test Pages
 *
 * Shared utilities for constructing ECMA-376 domain objects from demo parameters.
 * These are test utilities only - not for production use.
 *
 * The actual domain types and processing should remain in the library.
 * This file provides convenience wrappers for demo/preview purposes.
 */

import { pt, px } from "@oxen-office/ooxml/domain/units";
import type { TextBody, Paragraph, RegularRun, RunProperties } from "@oxen-office/pptx/domain/text";
import type { SolidFill } from "@oxen-office/ooxml/domain/fill";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type {
  Shape3d,
  Scene3d,
  LightRigType,
  LightRigDirection,
  PresetCameraType,
  PresetMaterialType,
  BevelPresetType,
} from "@oxen-office/pptx/domain/three-d";
import type { Material3DFill } from "@oxen-office/pptx-render/webgl/text3d";
import type { DemoWordArtPreset, DemoFill } from "./wordart-demo-presets";

// =============================================================================
// Color Context (Demo)
// =============================================================================

/**
 * Demo color context with standard Office color scheme.
 * For testing purposes only.
 */
export const demoColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

// =============================================================================
// TextBody Construction Helpers
// =============================================================================

/**
 * Create a SolidFill from hex color string.
 * @see ECMA-376 Part 1, Section 20.1.8.54 (solidFill)
 */
export function createSolidFill(hex: string): SolidFill {
  return {
    type: "solidFill",
    color: {
      spec: { type: "srgb", value: hex.replace("#", "") },
    },
  };
}

/**
 * Create a GradientFill from demo gradient stops.
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */
/**
 * Create RunProperties from simplified parameters.
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 */
export function createRunProperties(options: {
  fontSize: number;
  fontFamily: string;
  bold?: boolean;
  italic?: boolean;
  color: string;
}): RunProperties {
  return {
    fontSize: pt(options.fontSize),
    fontFamily: buildFontFamilyStack(options.fontFamily),
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    fill: createSolidFill(options.color),
  };
}

function buildFontFamilyStack(fontFamily: string): string {
  const fallbacks = ["sans-serif", "serif", "monospace"];
  if (fallbacks.includes(fontFamily)) {
    return [fontFamily, ...fallbacks.filter((fallback) => fallback !== fontFamily)].join(", ");
  }
  return [fontFamily, ...fallbacks].join(", ");
}

/**
 * Create a RegularRun (a:r element).
 * @see ECMA-376 Part 1, Section 21.1.2.3.8 (a:r)
 */
export function createTextRun(text: string, properties: RunProperties): RegularRun {
  return { type: "text", text, properties };
}

/**
 * Create a Paragraph (a:p element).
 * @see ECMA-376 Part 1, Section 21.1.2.2.6 (a:p)
 */
export function createParagraph(runs: RegularRun[]): Paragraph {
  return { runs, properties: {} };
}

/**
 * Create a TextBody (a:txBody element).
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:txBody)
 */
export function createTextBody(paragraphs: Paragraph[]): TextBody {
  return {
    bodyProperties: { wrapping: "square", anchor: "top" },
    paragraphs,
  };
}

// =============================================================================
// Shape3d Construction Helpers
// =============================================================================

type BevelParams = {
  width: number;
  height: number;
  preset: BevelPresetType;
};

type Shape3dParams = {
  extrusionHeight?: number;
  preset?: PresetMaterialType;
  /** Front face bevel @see ECMA-376 bevelT */
  bevelTop?: BevelParams;
  /** Back face bevel @see ECMA-376 bevelB */
  bevelBottom?: BevelParams;
  contourWidth?: number;
  contourColor?: string;
};

/**
 * Build a Shape3d domain object from plain number parameters.
 * Automatically wraps values with proper branded types (px).
 */
export function buildShape3d(params: Shape3dParams): Shape3d {
  const extrusionHeight = params.extrusionHeight !== undefined ? px(params.extrusionHeight) : undefined;
  const bevelTop = buildBevelFromParams(params.bevelTop);
  const bevelBottom = buildBevelFromParams(params.bevelBottom);
  const contourWidth =
    params.contourWidth !== undefined && params.contourWidth > 0 ? px(params.contourWidth) : undefined;
  const contourColor =
    contourWidth !== undefined && params.contourColor ? createSolidFill(params.contourColor) : undefined;

  return {
    extrusionHeight,
    preset: params.preset,
    bevelTop,
    bevelBottom,
    contourWidth,
    contourColor,
  };
}

function buildBevelFromParams(bevel: BevelParams | undefined) {
  if (!bevel) {return undefined;}
  return {
    width: px(bevel.width),
    height: px(bevel.height),
    preset: bevel.preset,
  };
}

type Scene3dParams = {
  camera: PresetCameraType;
  lightRig: {
    rig: LightRigType;
    direction: LightRigDirection;
  };
};

/**
 * Build a Scene3d domain object.
 */
export function buildScene3d(params: Scene3dParams): Scene3d {
  return {
    camera: { preset: params.camera },
    lightRig: { rig: params.lightRig.rig, direction: params.lightRig.direction },
  };
}

// =============================================================================
// Demo Preset Converters
// =============================================================================

/**
 * Get primary color from demo fill.
 */
export function getPrimaryColor(preset: DemoWordArtPreset): string {
  if (preset.fill.type === "solid") {
    return preset.fill.color;
  }
  return preset.fill.stops[0]?.color ?? "#4F81BD";
}

/**
 * Convert demo fill to Material3DFill (render type).
 */
export function demoFillToMaterial3DFill(fill: DemoFill): Material3DFill {
  if (fill.type === "solid") {
    return { type: "solid", color: fill.color };
  }
  return {
    type: "gradient",
    angle: fill.angle,
    stops: fill.stops.map((s) => ({ position: s.position, color: s.color })),
  };
}

/**
 * Build Shape3d from DemoWordArtPreset.
 * Applies optional scaling limits for thumbnails.
 */
export function buildShape3dFromPreset(
  preset: DemoWordArtPreset,
  options?: {
    maxExtrusion?: number;
    maxBevelWidth?: number;
    maxBevelHeight?: number;
  },
): Shape3d {
  const maxExtrusion = options?.maxExtrusion;
  const extrusionHeight = clampValue(preset.extrusion, maxExtrusion);

  const bevelTop = buildClampedBevel(preset.bevelTop, options?.maxBevelWidth, options?.maxBevelHeight);
  const bevelBottom = buildClampedBevel(preset.bevelBottom, options?.maxBevelWidth, options?.maxBevelHeight);

  return buildShape3d({
    extrusionHeight,
    preset: preset.material,
    bevelTop,
    bevelBottom,
    contourWidth: preset.contour?.width,
    contourColor: preset.contour?.color,
  });
}

function clampValue(value: number, max: number | undefined): number {
  return max !== undefined ? Math.min(value, max) : value;
}

function buildClampedBevel(
  bevel: DemoWordArtPreset["bevelTop"],
  maxWidth: number | undefined,
  maxHeight: number | undefined,
) {
  if (!bevel) {return undefined;}
  return {
    width: clampValue(bevel.width, maxWidth),
    height: clampValue(bevel.height, maxHeight),
    preset: bevel.preset,
  };
}

/**
 * Build Scene3d from DemoWordArtPreset.
 */
export function buildScene3dFromPreset(preset: DemoWordArtPreset): Scene3d {
  return buildScene3d({
    camera: preset.camera,
    lightRig: preset.lightRig,
  });
}

/**
 * Shadow configuration type for renderer.
 * Re-exported for convenience.
 */
export type DemoShadowConfig = {
  readonly type: "outer" | "inner";
  readonly color: string;
  readonly blurRadius: number;
  readonly distance: number;
  readonly direction: number;
  readonly opacity?: number;
};

/**
 * Convert demo preset shadow to renderer shadow config.
 */
export function getShadowConfigFromPreset(preset: DemoWordArtPreset): DemoShadowConfig | undefined {
  if (!preset.shadow) {
    return undefined;
  }
  return {
    type: preset.shadow.type,
    color: preset.shadow.color,
    blurRadius: preset.shadow.blurRadius,
    distance: preset.shadow.distance,
    direction: preset.shadow.direction,
    opacity: preset.shadow.opacity,
  };
}
