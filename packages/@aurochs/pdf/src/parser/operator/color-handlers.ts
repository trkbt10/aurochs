/**
 * @file PDF color operator handlers
 *
 * Handles color operators:
 * - Device color: g/G (gray), rg/RG (RGB), k/K (CMYK)
 * - Color space: cs/CS (set color space)
 * - General color: sc/SC/scn/SCN (set color in current space)
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 */

import type { GraphicsStateOps, OperatorHandler, OperatorHandlerEntry, ParserContext } from "./types";
import type { PdfColor } from "../../domain";
import { clamp01 } from "../../domain";
import { popNumber, collectColorComponents } from "./stack-ops";
import {
  evalIccCurve,
  evalIccLutToPcs01,
  makeBradfordAdaptationMatrix,
  type ParsedIccProfile,
} from "../color/icc-profile.native";
import type { ParsedNamedColorSpace } from "../color/color-space.native";
import { evaluateFunctionType2 } from "../shading/shading-raster";

// =============================================================================
// Gray Color Handlers
// =============================================================================

/**
 * g operator: Set fill color to gray
 */
const handleFillGray: OperatorHandler = (ctx, gfxOps) => {
  const [gray, newStack] = popNumber(ctx.operandStack);
  gfxOps.setFillColorSpaceName("DeviceGray");
  gfxOps.setFillGray(gray);

  return { operandStack: newStack };
};

/**
 * G operator: Set stroke color to gray
 */
const handleStrokeGray: OperatorHandler = (ctx, gfxOps) => {
  const [gray, newStack] = popNumber(ctx.operandStack);
  gfxOps.setStrokeColorSpaceName("DeviceGray");
  gfxOps.setStrokeGray(gray);

  return { operandStack: newStack };
};

// =============================================================================
// RGB Color Handlers
// =============================================================================

/**
 * rg operator: Set fill color to RGB
 */
const handleFillRgb: OperatorHandler = (ctx, gfxOps) => {
  const [b, stack1] = popNumber(ctx.operandStack);
  const [g, stack2] = popNumber(stack1);
  const [r, stack3] = popNumber(stack2);
  gfxOps.setFillColorSpaceName("DeviceRGB");
  gfxOps.setFillRgb(r, g, b);

  return { operandStack: stack3 };
};

/**
 * RG operator: Set stroke color to RGB
 */
const handleStrokeRgb: OperatorHandler = (ctx, gfxOps) => {
  const [b, stack1] = popNumber(ctx.operandStack);
  const [g, stack2] = popNumber(stack1);
  const [r, stack3] = popNumber(stack2);
  gfxOps.setStrokeColorSpaceName("DeviceRGB");
  gfxOps.setStrokeRgb(r, g, b);

  return { operandStack: stack3 };
};

// =============================================================================
// CMYK Color Handlers
// =============================================================================

/**
 * k operator: Set fill color to CMYK
 */
const handleFillCmyk: OperatorHandler = (ctx, gfxOps) => {
  const [k, stack1] = popNumber(ctx.operandStack);
  const [y, stack2] = popNumber(stack1);
  const [m, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  gfxOps.setFillColorSpaceName("DeviceCMYK");
  gfxOps.setFillCmyk({ c, m, y, k });

  return { operandStack: stack4 };
};

/**
 * K operator: Set stroke color to CMYK
 */
const handleStrokeCmyk: OperatorHandler = (ctx, gfxOps) => {
  const [k, stack1] = popNumber(ctx.operandStack);
  const [y, stack2] = popNumber(stack1);
  const [m, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  gfxOps.setStrokeColorSpaceName("DeviceCMYK");
  gfxOps.setStrokeCmyk({ c, m, y, k });

  return { operandStack: stack4 };
};

// =============================================================================
// Color Space Handlers
// =============================================================================

/**
 * cs/CS operator: Set color space
 *
 * Just consumes the color space name - we infer from component count when
 * the actual color is set.
 */
function parsePatternUnderlyingColorSpace(
  operand: unknown,
): "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | null {
  if (!Array.isArray(operand) || operand.length < 2) {return null;}
  const family = operand[0];
  const base = operand[1];
  if (family !== "Pattern") {return null;}
  if (base === "DeviceGray" || base === "DeviceRGB" || base === "DeviceCMYK") {return base;}
  return null;
}

const handleFillColorSpace: OperatorHandler = (ctx, gfxOps) => {
  const top = ctx.operandStack.length > 0 ? ctx.operandStack[ctx.operandStack.length - 1] : undefined;
  const newStack = ctx.operandStack.slice(0, -1);
  if (!top) {return { operandStack: ctx.operandStack };}

  const base = parsePatternUnderlyingColorSpace(top);
  gfxOps.setFillPatternUnderlyingColorSpace(base ?? undefined);
  if (typeof top === "string" && top.length > 0) {
    const key = top.startsWith("/") ? top.slice(1) : top;
    gfxOps.setFillColorSpaceName(key);
  } else {
    gfxOps.setFillColorSpaceName(undefined);
  }

  return { operandStack: newStack };
};

const handleStrokeColorSpace: OperatorHandler = (ctx, gfxOps) => {
  const top = ctx.operandStack.length > 0 ? ctx.operandStack[ctx.operandStack.length - 1] : undefined;
  const newStack = ctx.operandStack.slice(0, -1);
  if (!top) {return { operandStack: ctx.operandStack };}

  const base = parsePatternUnderlyingColorSpace(top);
  gfxOps.setStrokePatternUnderlyingColorSpace(base ?? undefined);
  if (typeof top === "string" && top.length > 0) {
    const key = top.startsWith("/") ? top.slice(1) : top;
    gfxOps.setStrokeColorSpaceName(key);
  } else {
    gfxOps.setStrokeColorSpaceName(undefined);
  }

  return { operandStack: newStack };
};

// =============================================================================
// General Color Handlers (sc/SC/scn/SCN)
// =============================================================================

/**
 * Apply fill color based on component count.
 *
 * Infers color space from number of numeric operands:
 * - 1 component: DeviceGray
 * - 3 components: DeviceRGB
 * - 4 components: DeviceCMYK
 */
function applyFillColorN(components: readonly number[], gfxOps: GraphicsStateOps): void {
  switch (components.length) {
    case 1:
      gfxOps.setFillGray(components[0]);
      break;
    case 3:
      gfxOps.setFillRgb(components[0], components[1], components[2]);
      break;
    case 4:
      gfxOps.setFillCmyk({ c: components[0], m: components[1], y: components[2], k: components[3] });
      break;
    default:
      // Unknown color space, fallback to RGB if 3+ or gray if 1+
      if (components.length >= 3) {
        gfxOps.setFillRgb(components[0], components[1], components[2]);
      } else if (components.length >= 1) {
        gfxOps.setFillGray(components[0]);
      }
  }
}

/**
 * Apply stroke color based on component count.
 */
function applyStrokeColorN(components: readonly number[], gfxOps: GraphicsStateOps): void {
  switch (components.length) {
    case 1:
      gfxOps.setStrokeGray(components[0]);
      break;
    case 3:
      gfxOps.setStrokeRgb(components[0], components[1], components[2]);
      break;
    case 4:
      gfxOps.setStrokeCmyk({ c: components[0], m: components[1], y: components[2], k: components[3] });
      break;
    default:
      if (components.length >= 3) {
        gfxOps.setStrokeRgb(components[0], components[1], components[2]);
      } else if (components.length >= 1) {
        gfxOps.setStrokeGray(components[0]);
      }
  }
}

function xyzToSrgbBytes(X: number, Y: number, Z: number): readonly [number, number, number] {
  // XYZ -> linear sRGB via standard matrix.
  const rLin = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const gLin = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bLin = 0.0557 * X - 0.204 * Y + 1.057 * Z;

  const toSrgb = (c: number): number => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    const clamped = Math.min(1, Math.max(0, v));
    return Math.round(clamped * 255);
  };

  return [toSrgb(rLin), toSrgb(gLin), toSrgb(bLin)] as const;
}

function applyMat3ToXyz(m: readonly number[], v: readonly [number, number, number]): readonly [number, number, number] {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  return [
    (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * z,
    (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * z,
    (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * z,
  ] as const;
}

// =============================================================================
// Named color space resolution — converts named color space + components to RGB
// =============================================================================

/**
 * Resolve a named color space to RGB bytes.
 *
 * Handles: ICCBased, Separation (with Type 2 tint transform),
 * DeviceN (with Type 2 tint transform), Indexed (palette lookup),
 * CalGray, CalRGB, and Lab.
 */
function resolveNamedColorSpaceToRgb(
  cs: ParsedNamedColorSpace,
  components: readonly number[],
): readonly [number, number, number] | null {
  switch (cs.kind) {
    case "iccBased":
      return cs.profile ? iccComponentsToRgbBytes(components, cs.profile, cs.n) : null;

    case "separation":
      return resolveSeparationToRgb(cs, components);

    case "deviceN":
      return resolveDeviceNToRgb(cs, components);

    case "indexed":
      return resolveIndexedToRgb(cs, components);

    case "calGray":
      return resolveCalGrayToRgb(cs, components);

    case "calRgb":
      return resolveCalRgbToRgb(cs, components);

    case "lab":
      return resolveLabToRgb(cs, components);

    case "device":
      return null; // Device spaces are handled by the component-count inference path
  }
}

function tryApplyNamedFillColor(components: readonly number[], ctx: ParserContext, gfxOps: GraphicsStateOps): boolean {
  const csName = gfxOps.get().fillColorSpaceName;
  if (!csName) {return false;}
  const cs = ctx.colorSpaces.get(csName);
  if (!cs) {return false;}

  const rgb = resolveNamedColorSpaceToRgb(cs, components);
  if (!rgb) {return false;}
  gfxOps.setFillRgb((rgb[0] ?? 0) / 255, (rgb[1] ?? 0) / 255, (rgb[2] ?? 0) / 255);
  return true;
}

function tryApplyNamedStrokeColor(components: readonly number[], ctx: ParserContext, gfxOps: GraphicsStateOps): boolean {
  const csName = gfxOps.get().strokeColorSpaceName;
  if (!csName) {return false;}
  const cs = ctx.colorSpaces.get(csName);
  if (!cs) {return false;}

  const rgb = resolveNamedColorSpaceToRgb(cs, components);
  if (!rgb) {return false;}
  gfxOps.setStrokeRgb((rgb[0] ?? 0) / 255, (rgb[1] ?? 0) / 255, (rgb[2] ?? 0) / 255);
  return true;
}


// =============================================================================
// Separation / DeviceN → RGB via tintTransform
// =============================================================================

function alternateComponentsToRgb(
  alternate: "DeviceGray" | "DeviceRGB" | "DeviceCMYK",
  comps: readonly number[],
): readonly [number, number, number] {
  if (alternate === "DeviceGray") {
    const g = Math.round(clamp01(comps[0] ?? 0) * 255);
    return [g, g, g];
  }
  if (alternate === "DeviceRGB") {
    return [
      Math.round(clamp01(comps[0] ?? 0) * 255),
      Math.round(clamp01(comps[1] ?? 0) * 255),
      Math.round(clamp01(comps[2] ?? 0) * 255),
    ];
  }
  // DeviceCMYK — naive conversion
  const c = clamp01(comps[0] ?? 0);
  const m = clamp01(comps[1] ?? 0);
  const y = clamp01(comps[2] ?? 0);
  const k = clamp01(comps[3] ?? 0);
  return [
    Math.round((1 - Math.min(1, c + k)) * 255),
    Math.round((1 - Math.min(1, m + k)) * 255),
    Math.round((1 - Math.min(1, y + k)) * 255),
  ];
}

/**
 * Separation → RGB via tintTransform.
 *
 * PDF spec (ISO 32000-1, 8.6.6.4): Separation color spaces have
 * a tintTransform (Type 2 exponential interpolation) that maps a single
 * tint value [0,1] to components in the alternate color space.
 *
 * tintTransform is null only when the PDF dict/stream could not be
 * resolved (broken reference etc.), which should not occur in a
 * well-formed PDF. Returns null in that case so the caller can fall
 * through to component-count inference.
 */
function resolveSeparationToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "separation" }>,
  components: readonly number[],
): readonly [number, number, number] | null {
  if (!cs.tintTransform) {return null;}
  const tint = clamp01(components[0] ?? 0);
  const alternateComps = evaluateFunctionType2(cs.tintTransform, tint, cs.alternateComponents);
  return alternateComponentsToRgb(cs.alternate, alternateComps);
}

/**
 * DeviceN → RGB via tintTransform.
 *
 * PDF spec (ISO 32000-1, 8.6.6.5): DeviceN has a tintTransform
 * (Type 2 exponential interpolation) that maps tint values to
 * components in the alternate color space. Type 2 is a single-input
 * function, so the first component is used as the input.
 *
 * Returns null only when tintTransform could not be parsed (broken ref).
 */
function resolveDeviceNToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "deviceN" }>,
  components: readonly number[],
): readonly [number, number, number] | null {
  if (!cs.tintTransform) {return null;}
  const tint = clamp01(components[0] ?? 0);
  const alternateComps = evaluateFunctionType2(cs.tintTransform, tint, cs.alternateComponents);
  return alternateComponentsToRgb(cs.alternate, alternateComps);
}

// =============================================================================
// Indexed → RGB via palette lookup
// =============================================================================

function resolveIndexedToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "indexed" }>,
  components: readonly number[],
): readonly [number, number, number] | null {
  // Indexed color space: component is a raw integer index (0..hival), not 0..1.
  const rawIndex = components[0] ?? 0;
  const clamped = Math.min(cs.hival, Math.max(0, Math.round(rawIndex)));
  const bpc = cs.base === "DeviceGray" ? 1 : cs.base === "DeviceRGB" ? 3 : 4;
  const offset = clamped * bpc;

  if (cs.base === "DeviceGray") {
    const g = cs.lookup[offset] ?? 0;
    return [g, g, g];
  }
  if (cs.base === "DeviceRGB") {
    return [cs.lookup[offset] ?? 0, cs.lookup[offset + 1] ?? 0, cs.lookup[offset + 2] ?? 0];
  }
  // DeviceCMYK — lookup contains raw CMYK bytes (0..255)
  const c = (cs.lookup[offset] ?? 0) / 255;
  const m = (cs.lookup[offset + 1] ?? 0) / 255;
  const y = (cs.lookup[offset + 2] ?? 0) / 255;
  const k = (cs.lookup[offset + 3] ?? 0) / 255;
  return [
    Math.round((1 - Math.min(1, c + k)) * 255),
    Math.round((1 - Math.min(1, m + k)) * 255),
    Math.round((1 - Math.min(1, y + k)) * 255),
  ];
}

// =============================================================================
// CalGray / CalRGB / Lab → RGB via CIE conversion
// =============================================================================

const D65: readonly [number, number, number] = [0.9505, 1, 1.089];

function calGrayToXyz(
  cs: Extract<ParsedNamedColorSpace, { kind: "calGray" }>,
  gray: number,
): readonly [number, number, number] {
  const A = Math.pow(clamp01(gray), cs.gamma);
  return [
    cs.whitePoint[0] * A,
    cs.whitePoint[1] * A,
    cs.whitePoint[2] * A,
  ];
}

function calRgbToXyz(
  cs: Extract<ParsedNamedColorSpace, { kind: "calRgb" }>,
  components: readonly number[],
): readonly [number, number, number] {
  const r = Math.pow(clamp01(components[0] ?? 0), cs.gamma[0]);
  const g = Math.pow(clamp01(components[1] ?? 0), cs.gamma[1]);
  const b = Math.pow(clamp01(components[2] ?? 0), cs.gamma[2]);
  const m = cs.matrix;
  return [
    (m[0] ?? 1) * r + (m[3] ?? 0) * g + (m[6] ?? 0) * b,
    (m[1] ?? 0) * r + (m[4] ?? 1) * g + (m[7] ?? 0) * b,
    (m[2] ?? 0) * r + (m[5] ?? 0) * g + (m[8] ?? 1) * b,
  ];
}

function labToXyz(
  cs: Extract<ParsedNamedColorSpace, { kind: "lab" }>,
  components: readonly number[],
): readonly [number, number, number] {
  const L = components[0] ?? 0; // 0..100
  const a = components[1] ?? 0; // range[0]..range[1]
  const b = components[2] ?? 0; // range[2]..range[3]

  const delta = 6 / 29;
  const finv = (t: number): number =>
    t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);

  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  return [
    cs.whitePoint[0] * finv(fx),
    cs.whitePoint[1] * finv(fy),
    cs.whitePoint[2] * finv(fz),
  ];
}

function resolveCalGrayToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "calGray" }>,
  components: readonly number[],
): readonly [number, number, number] {
  const xyz = calGrayToXyz(cs, components[0] ?? 0);
  const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: cs.whitePoint, dstWhitePoint: D65 });
  const adapted = applyMat3ToXyz(adapt, xyz);
  return xyzToSrgbBytes(adapted[0], adapted[1], adapted[2]);
}

function resolveCalRgbToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "calRgb" }>,
  components: readonly number[],
): readonly [number, number, number] {
  const xyz = calRgbToXyz(cs, components);
  const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: cs.whitePoint, dstWhitePoint: D65 });
  const adapted = applyMat3ToXyz(adapt, xyz);
  return xyzToSrgbBytes(adapted[0], adapted[1], adapted[2]);
}

function resolveLabToRgb(
  cs: Extract<ParsedNamedColorSpace, { kind: "lab" }>,
  components: readonly number[],
): readonly [number, number, number] {
  const xyz = labToXyz(cs, components);
  const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: cs.whitePoint, dstWhitePoint: D65 });
  const adapted = applyMat3ToXyz(adapt, xyz);
  return xyzToSrgbBytes(adapted[0], adapted[1], adapted[2]);
}

function iccComponentsToRgbBytes(
  components: readonly number[],
  profile: ParsedIccProfile,
  n: number,
): readonly [number, number, number] | null {
  if (profile.kind === "gray") {
    if (n !== 1 || components.length < 1) {return null;}
    const g = Math.min(1, Math.max(0, components[0] ?? 0));
    const linear = evalIccCurve(profile.kTRC, g);
    const D65: readonly [number, number, number] = [0.9505, 1, 1.089];
    const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: profile.whitePoint, dstWhitePoint: D65 });
    const xyz = applyMat3ToXyz(adapt, [
      (profile.whitePoint[0] ?? 0) * linear,
      (profile.whitePoint[1] ?? 0) * linear,
      (profile.whitePoint[2] ?? 0) * linear,
    ]);
    return xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
  }

  if (profile.kind === "lut") {
    if (n <= 0 || n !== profile.a2b0.inChannels) {return null;}
    if (components.length < n) {return null;}

    const inputs: number[] = [];
    for (let i = 0; i < n; i += 1) {
      inputs.push(Math.min(1, Math.max(0, components[i] ?? 0)));
    }

    const pcs01 = evalIccLutToPcs01(profile, inputs);
    if (!pcs01) {return null;}

    const D65: readonly [number, number, number] = [0.9505, 1, 1.089];
    if (profile.pcs === "XYZ ") {
      const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: profile.whitePoint, dstWhitePoint: D65 });
      const xyz = applyMat3ToXyz(adapt, pcs01);
      return xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
    }

    const labToXyzD50 = (Lstar: number, astar: number, bstar: number): readonly [number, number, number] => {
      const delta = 6 / 29;
      const finv = (t: number): number => {
        if (t > delta) {return t * t * t;}
        return 3 * delta * delta * (t - 4 / 29);
      };
      const fy = (Lstar + 16) / 116;
      const fx = fy + astar / 500;
      const fz = fy - bstar / 200;
      const D50: readonly [number, number, number] = [0.9642, 1, 0.8249];
      return [D50[0] * finv(fx), D50[1] * finv(fy), D50[2] * finv(fz)] as const;
    };

    const Lstar = Math.min(1, Math.max(0, pcs01[0] ?? 0)) * 100;
    const astar = Math.min(1, Math.max(0, pcs01[1] ?? 0)) * 255 - 128;
    const bstar = Math.min(1, Math.max(0, pcs01[2] ?? 0)) * 255 - 128;
    const xyzD50 = labToXyzD50(Lstar, astar, bstar);
    const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: [0.9642, 1, 0.8249], dstWhitePoint: D65 });
    const xyz = applyMat3ToXyz(adapt, xyzD50);
    return xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
  }

  if (profile.kind !== "rgb") {return null;}
  if (n !== 3 || components.length < 3) {return null;}
  const r = Math.min(1, Math.max(0, components[0] ?? 0));
  const g = Math.min(1, Math.max(0, components[1] ?? 0));
  const b = Math.min(1, Math.max(0, components[2] ?? 0));
  const R = evalIccCurve(profile.rTRC, r);
  const G = evalIccCurve(profile.gTRC, g);
  const B = evalIccCurve(profile.bTRC, b);

  const X = (profile.rXYZ[0] ?? 0) * R + (profile.gXYZ[0] ?? 0) * G + (profile.bXYZ[0] ?? 0) * B;
  const Y = (profile.rXYZ[1] ?? 0) * R + (profile.gXYZ[1] ?? 0) * G + (profile.bXYZ[1] ?? 0) * B;
  const Z = (profile.rXYZ[2] ?? 0) * R + (profile.gXYZ[2] ?? 0) * G + (profile.bXYZ[2] ?? 0) * B;

  const D65: readonly [number, number, number] = [0.9505, 1, 1.089];
  const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: profile.whitePoint, dstWhitePoint: D65 });
  const xyz = applyMat3ToXyz(adapt, [X, Y, Z]);
  return xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
}

/**
 * sc/scn operator: Set fill color in current color space
 *
 * We infer the color space from the number of operands on the stack.
 */
const handleFillColorN: OperatorHandler = (ctx, gfxOps) => {
  const [components, newStack] = collectColorComponents(ctx.operandStack);
  if (!tryApplyNamedFillColor(components, ctx, gfxOps)) {
    applyFillColorN(components, gfxOps);
  }

  return { operandStack: newStack };
};

/**
 * SC/SCN operator: Set stroke color in current color space
 */
const handleStrokeColorN: OperatorHandler = (ctx, gfxOps) => {
  const [components, newStack] = collectColorComponents(ctx.operandStack);
  if (!tryApplyNamedStrokeColor(components, ctx, gfxOps)) {
    applyStrokeColorN(components, gfxOps);
  }

  return { operandStack: newStack };
};

function popOptionalName(
  stack: readonly (number | string | readonly (number | string)[])[],
): readonly [name: string | null, newStack: readonly (number | string | readonly (number | string)[])[]] {
  if (stack.length === 0) {return [null, stack];}
  const top = stack[stack.length - 1];
  // Content stream names are tokenized without the leading "/" (e.g. "/P1" → "P1").
  // For scn/SCN, a trailing name operand is significant for patterns/separations.
  if (typeof top !== "string" || top.length === 0) {return [null, stack];}
  return [top, stack.slice(0, -1)];
}

/**
 * scn/SCN operator: Set color in current color space (including patterns/separation)
 *
 * For pattern/separation color spaces, a trailing name operand may appear.
 * We don't render patterns yet, but we must consume the name to avoid leaking
 * operands into subsequent operators.
 */
const handleFillColorNWithOptionalName: OperatorHandler = (ctx, gfxOps) => {
  const [name, stackAfterName] = popOptionalName(ctx.operandStack);
  const [components, newStack] = collectColorComponents(stackAfterName);
  if (name) {
    const key = name.startsWith("/") ? name.slice(1) : name;
    const pattern = ctx.patterns.get(key);
    if (pattern) {
      gfxOps.setFillPatternName(name);
      if (pattern.patternType === 1 && pattern.paintType === 2) {
        const base = gfxOps.get().fillPatternUnderlyingColorSpace ?? inferDeviceColorSpaceFromComponentCount(components.length);
        const color = base ? buildDeviceColor(base, components) : null;
        gfxOps.setFillPatternColor(color ?? { colorSpace: "DeviceRGB", components: [0, 0, 0] });
      }
    } else {
      // Pattern color space (`/Pattern`) can be set as: `/Pattern cs /P1 scn`.
      // Uncolored tiling patterns can also be set as: `/Pattern cs c1 ... cn /P1 scn`.
      // Unsupported patterns must be deterministic; avoid leaking a previous fill.
      gfxOps.setFillRgb(0, 0, 0);
    }
    return { operandStack: newStack };
  }
  if (!tryApplyNamedFillColor(components, ctx, gfxOps)) {
    applyFillColorN(components, gfxOps);
  }
  return { operandStack: newStack };
};

const handleStrokeColorNWithOptionalName: OperatorHandler = (ctx, gfxOps) => {
  const [name, stackAfterName] = popOptionalName(ctx.operandStack);
  const [components, newStack] = collectColorComponents(stackAfterName);
  if (name) {
    const key = name.startsWith("/") ? name.slice(1) : name;
    const pattern = ctx.patterns.get(key);
    if (pattern) {
      gfxOps.setStrokePatternName(name);
      if (pattern.patternType === 1 && pattern.paintType === 2) {
        const base = gfxOps.get().strokePatternUnderlyingColorSpace ?? inferDeviceColorSpaceFromComponentCount(components.length);
        const color = base ? buildDeviceColor(base, components) : null;
        gfxOps.setStrokePatternColor(color ?? { colorSpace: "DeviceRGB", components: [0, 0, 0] });
      }
    } else {
      gfxOps.setStrokeRgb(0, 0, 0);
    }
    return { operandStack: newStack };
  }
  if (!tryApplyNamedStrokeColor(components, ctx, gfxOps)) {
    applyStrokeColorN(components, gfxOps);
  }
  return { operandStack: newStack };
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * Color operator handlers.
 */
export const COLOR_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  // Gray
  ["g", { handler: handleFillGray, category: "color", description: "Set fill gray" }],
  ["G", { handler: handleStrokeGray, category: "color", description: "Set stroke gray" }],
  // RGB
  ["rg", { handler: handleFillRgb, category: "color", description: "Set fill RGB" }],
  ["RG", { handler: handleStrokeRgb, category: "color", description: "Set stroke RGB" }],
  // CMYK
  ["k", { handler: handleFillCmyk, category: "color", description: "Set fill CMYK" }],
  ["K", { handler: handleStrokeCmyk, category: "color", description: "Set stroke CMYK" }],
  // Color space
  ["cs", { handler: handleFillColorSpace, category: "color", description: "Set fill color space" }],
  ["CS", { handler: handleStrokeColorSpace, category: "color", description: "Set stroke color space" }],
  // General color
  ["sc", { handler: handleFillColorN, category: "color", description: "Set fill color (current space)" }],
  ["scn", { handler: handleFillColorNWithOptionalName, category: "color", description: "Set fill color (pattern/separation)" }],
  ["SC", { handler: handleStrokeColorN, category: "color", description: "Set stroke color (current space)" }],
  ["SCN", { handler: handleStrokeColorNWithOptionalName, category: "color", description: "Set stroke color (pattern/separation)" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const colorHandlers = {
  handleFillGray,
  handleStrokeGray,
  handleFillRgb,
  handleStrokeRgb,
  handleFillCmyk,
  handleStrokeCmyk,
  handleFillColorSpace,
  handleStrokeColorSpace,
  handleFillColorN,
  handleStrokeColorN,
  handleFillColorNWithOptionalName,
  handleStrokeColorNWithOptionalName,
  applyFillColorN,
  applyStrokeColorN,
} as const;

function inferDeviceColorSpaceFromComponentCount(
  count: number,
): "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | null {
  if (count === 1) {return "DeviceGray";}
  if (count === 3) {return "DeviceRGB";}
  if (count === 4) {return "DeviceCMYK";}
  return null;
}

function buildDeviceColor(
  colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK",
  components: readonly number[],
): PdfColor | null {
  if (colorSpace === "DeviceGray") {
    if (components.length !== 1) {return null;}
    return { colorSpace, components: [components[0] ?? 0] };
  }
  if (colorSpace === "DeviceRGB") {
    if (components.length !== 3) {return null;}
    return { colorSpace, components: [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0] };
  }
  if (components.length !== 4) {return null;}
  return { colorSpace, components: [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0, components[3] ?? 0] };
}
