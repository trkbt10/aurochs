/**
 * @file Adapter functions between DrawingML types and react-editor-ui types
 *
 * DrawingML (editor state SoT):
 *   - Color { spec: ColorSpec; transform?: ColorTransform }
 *   - BaseFill = NoFill | SolidFill | GradientFill | PatternFill | GroupFill | BlipFill
 *   - GradientFill { stops, linear?, path?, rotWithShape, tileRect? }
 *   - hex: bare uppercase "FF0000"
 *
 * react-editor-ui (UI boundary):
 *   - ColorValue { hex: string; opacity: number; visible: boolean }
 *   - FillValue = SolidFillValue | GradientFillValue | ImageFill | PatternFill | VideoFill
 *   - GradientValue { type, angle, stops: GradientStop[] }
 *   - hex: #-prefix lowercase "#ff0000"
 *
 * react-editor-ui types are only defined in internal utils and not exported at
 * the package level. Compatible types are defined locally to avoid fragile
 * dependency on internal import paths.
 */

import type { Color, ColorTransform } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { resolveColor } from "@aurochs-office/drawing-ml/domain/color-resolution";
import type {
  BaseFill,
  GradientFill,
  GradientStop as DmlGradientStop,
  SolidFill,
} from "@aurochs-office/drawing-ml/domain/fill";
import { deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { Percent } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// react-editor-ui compatible types (locally defined)
// =============================================================================

/** react-editor-ui ColorValue compatible type */
export type ReuiColorValue = {
  readonly hex: string;
  readonly opacity: number;
  readonly visible: boolean;
};

/** react-editor-ui GradientType compatible type */
export type ReuiGradientType = "linear" | "radial" | "angular" | "diamond";

/** react-editor-ui GradientStop compatible type */
export type ReuiGradientStop = {
  readonly id: string;
  readonly position: number;
  readonly color: ReuiColorValue;
};

/** react-editor-ui GradientValue compatible type */
export type ReuiGradientValue = {
  readonly type: ReuiGradientType;
  readonly angle: number;
  readonly stops: ReuiGradientStop[];
};

/** react-editor-ui SolidFillValue compatible type */
export type ReuiSolidFillValue = {
  readonly type: "solid";
  readonly color: ReuiColorValue;
};

/** react-editor-ui GradientFillValue compatible type */
export type ReuiGradientFillValue = {
  readonly type: "gradient";
  readonly gradient: ReuiGradientValue;
};

/**
 * react-editor-ui FillValue compatible type.
 *
 * baseFillToFillValue only returns solid/gradient variants.
 * fillValueToBaseFill also accepts image/pattern/video (from FillPanel onChange).
 */
export type ReuiFillValue =
  | ReuiSolidFillValue
  | ReuiGradientFillValue;

/** Input type for fillValueToBaseFill (all types FillPanel onChange may emit) */
export type ReuiFillValueInput =
  | ReuiSolidFillValue
  | ReuiGradientFillValue
  | { readonly type: "image" }
  | { readonly type: "pattern" }
  | { readonly type: "video" };

// =============================================================================
// Hex format bridge
// =============================================================================

/** Convert bare uppercase hex "FF0000" to react-editor-ui format "#ff0000" */
export function toReactHex(bareHex: string): string {
  return `#${bareHex.toLowerCase()}`;
}

/** Convert react-editor-ui "#ff0000" to bare uppercase hex "FF0000" */
export function fromReactHex(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

// =============================================================================
// Color ↔ ColorValue
// =============================================================================

/** Extract opacity (0-100) from a Color's alpha transform, defaulting to 100. */
function extractOpacity(color: Color): number {
  if (color.transform?.alpha !== undefined) {
    return Math.round(color.transform.alpha as number);
  }
  return 100;
}

/**
 * Convert DrawingML Color to react-editor-ui ColorValue.
 *
 * Non-sRGB specs (scheme/system/preset/hsl) are resolved to hex via colorContext.
 * Alpha transform is mapped to opacity (0-100).
 */
export function colorToColorValue(color: Color, colorContext?: ColorContext): ReuiColorValue {
  const resolved = resolveColor(color, colorContext) ?? "000000";
  const hex = toReactHex(resolved);

  const opacity = extractOpacity(color);

  return { hex, opacity, visible: true };
}

/**
 * Convert react-editor-ui ColorValue to DrawingML Color.
 *
 * Only produces sRGB spec. Scheme color information is lost (one-way conversion).
 * Opacity < 100 is mapped to alpha transform.
 */
export function colorValueToColor(cv: ReuiColorValue): Color {
  const bareHex = fromReactHex(cv.hex);
  const transform: ColorTransform | undefined =
    cv.opacity < 100 ? { alpha: pct(cv.opacity) } : undefined;

  return {
    spec: { type: "srgb", value: bareHex },
    ...(transform ? { transform } : {}),
  };
}

// =============================================================================
// GradientFill ↔ GradientValue
// =============================================================================

/** Map DrawingML gradient type to react-editor-ui gradient type. */
function toReactGradientType(fill: GradientFill): ReuiGradientType {
  if (fill.path) {
    return "radial";
  }
  return "linear";
}

/** Map react-editor-ui gradient type back to DrawingML gradient properties. */
function fromReactGradientType(
  type: ReuiGradientType,
  angle: number,
  original?: GradientFill,
): Pick<GradientFill, "linear" | "path"> {
  switch (type) {
    case "radial":
      return {
        path: original?.path ?? { path: "circle" },
      };
    case "linear":
    default:
      return {
        linear: {
          angle: deg(angle),
          scaled: original?.linear?.scaled ?? true,
        },
      };
  }
}

/** Extract angle from DrawingML gradient as plain number. */
function extractAngle(fill: GradientFill): number {
  if (fill.linear) {
    return fill.linear.angle as number;
  }
  return 0;
}

/** Convert DrawingML GradientStop to react-editor-ui GradientStop. */
function dmlStopToReactStop(stop: DmlGradientStop, index: number, colorContext?: ColorContext): ReuiGradientStop {
  return {
    id: String(index),
    position: stop.position as number,
    color: colorToColorValue(stop.color, colorContext),
  };
}

/** Convert react-editor-ui GradientStop to DrawingML GradientStop. */
function reactStopToDmlStop(stop: ReuiGradientStop): DmlGradientStop {
  return {
    position: pct(stop.position) as Percent,
    color: colorValueToColor(stop.color),
  };
}

/** Convert DrawingML GradientFill to react-editor-ui GradientValue. */
export function gradientFillToGradientValue(fill: GradientFill, colorContext?: ColorContext): ReuiGradientValue {
  return {
    type: toReactGradientType(fill),
    angle: extractAngle(fill),
    stops: fill.stops.map((stop, i) => dmlStopToReactStop(stop, i, colorContext)),
  };
}

/**
 * Convert react-editor-ui GradientValue to DrawingML GradientFill.
 *
 * When original is provided, DrawingML-only fields (rotWithShape, tileRect, scaled)
 * are preserved from it.
 */
export function gradientValueToGradientFill(gv: ReuiGradientValue, original?: GradientFill): GradientFill {
  const gradientProps = fromReactGradientType(gv.type, gv.angle, original);

  return {
    type: "gradientFill",
    stops: gv.stops.map(reactStopToDmlStop),
    ...gradientProps,
    tileRect: original?.tileRect,
    rotWithShape: original?.rotWithShape ?? true,
  };
}

// =============================================================================
// BaseFill ↔ FillValue
// =============================================================================

/**
 * Convert DrawingML BaseFill to react-editor-ui FillValue.
 *
 * noFill, groupFill, patternFill, and blipFill fall back to solid black because
 * they have no direct equivalent in the react-editor-ui FillValue union.
 */
export function baseFillToFillValue(fill: BaseFill, colorContext?: ColorContext): ReuiFillValue {
  switch (fill.type) {
    case "solidFill":
      return {
        type: "solid",
        color: colorToColorValue(fill.color, colorContext),
      } satisfies ReuiSolidFillValue;

    case "gradientFill":
      return {
        type: "gradient",
        gradient: gradientFillToGradientValue(fill, colorContext),
      } satisfies ReuiGradientFillValue;

    case "noFill":
    case "groupFill":
    case "patternFill":
    case "blipFill":
    default:
      return {
        type: "solid",
        color: { hex: "#000000", opacity: 100, visible: true },
      } satisfies ReuiSolidFillValue;
  }
}

/**
 * Convert react-editor-ui FillValue to DrawingML BaseFill.
 *
 * When original is provided and the FillValue type is image/pattern/video
 * (which require format-specific adapters), the original fill is returned as-is.
 */
export function fillValueToBaseFill(fv: ReuiFillValueInput, original?: BaseFill): BaseFill {
  switch (fv.type) {
    case "solid":
      return {
        type: "solidFill",
        color: colorValueToColor(fv.color),
      } satisfies SolidFill;

    case "gradient":
      return gradientValueToGradientFill(
        fv.gradient,
        original?.type === "gradientFill" ? original : undefined,
      );

    case "image":
    case "pattern":
    case "video":
      if (original) {
        return original;
      }
      return { type: "noFill" };
  }
}
