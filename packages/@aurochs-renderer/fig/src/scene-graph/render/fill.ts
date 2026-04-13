/**
 * @file Fill resolution — shared SoT for SceneGraph Fill → SVG fill attributes
 *
 * This is the SINGLE place where Fill → SVG attributes conversion happens.
 * Both SVG string and React renderers MUST consume this output.
 *
 * The resolved attributes are format-agnostic (plain objects),
 * usable by both string concatenation and React JSX.
 */

import type { Fill, GradientStop } from "../types";
import { colorToHex, uint8ArrayToBase64 } from "./color";

// =============================================================================
// Resolved Types
// =============================================================================

/**
 * SVG fill attributes resolved from a SceneGraph Fill.
 */
export type ResolvedFillAttrs = {
  readonly fill: string;
  readonly fillOpacity?: number;
};

/**
 * SVG gradient stop definition.
 */
export type ResolvedGradientStop = {
  readonly offset: string;
  readonly stopColor: string;
  readonly stopOpacity?: number;
};

/**
 * A linear gradient def to be rendered by the consumer.
 */
export type ResolvedLinearGradient = {
  readonly type: "linear-gradient";
  readonly id: string;
  readonly x1: string;
  readonly y1: string;
  readonly x2: string;
  readonly y2: string;
  readonly stops: readonly ResolvedGradientStop[];
};

/**
 * A radial gradient def to be rendered by the consumer.
 */
export type ResolvedRadialGradient = {
  readonly type: "radial-gradient";
  readonly id: string;
  readonly cx: string;
  readonly cy: string;
  readonly r: string;
  readonly stops: readonly ResolvedGradientStop[];
};

/**
 * An image pattern def to be rendered by the consumer.
 */
export type ResolvedImagePattern = {
  readonly type: "image";
  readonly id: string;
  readonly dataUri: string;
  readonly patternContentUnits: "objectBoundingBox" | "userSpaceOnUse";
  readonly width: number;
  readonly height: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly preserveAspectRatio: string;
};

/**
 * Union of all fill def types.
 * The consumer must handle each variant (exhaustive switch enforced by TypeScript).
 */
export type ResolvedFillDef =
  | ResolvedLinearGradient
  | ResolvedRadialGradient
  | ResolvedImagePattern;

/**
 * Complete fill resolution result.
 */
export type ResolvedFill = {
  readonly attrs: ResolvedFillAttrs;
  readonly def?: ResolvedFillDef;
};

// =============================================================================
// ID Generator interface
// =============================================================================

export type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

// =============================================================================
// Resolution functions
// =============================================================================

function resolveGradientStops(stops: readonly GradientStop[]): ResolvedGradientStop[] {
  return stops.map((s) => ({
    offset: `${s.position * 100}%`,
    stopColor: colorToHex(s.color),
    stopOpacity: s.color.a < 1 ? s.color.a : undefined,
  }));
}

function buildAttrs(fillValue: string, opacity: number): ResolvedFillAttrs {
  if (opacity < 1) {
    return { fill: fillValue, fillOpacity: opacity };
  }
  return { fill: fillValue };
}

/**
 * Resolve a single Fill to SVG attributes and an optional def.
 *
 * This is the exhaustive handler — adding a new Fill type without
 * handling it here will produce a TypeScript compile error.
 */
export function resolveFill(fill: Fill, ids: IdGenerator): ResolvedFill {
  switch (fill.type) {
    case "solid":
      return { attrs: buildAttrs(colorToHex(fill.color), fill.opacity) };

    case "linear-gradient": {
      const id = ids.getNextId("lg");
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "linear-gradient",
          id,
          x1: `${fill.start.x * 100}%`,
          y1: `${fill.start.y * 100}%`,
          x2: `${fill.end.x * 100}%`,
          y2: `${fill.end.y * 100}%`,
          stops: resolveGradientStops(fill.stops),
        },
      };
    }

    case "radial-gradient": {
      const id = ids.getNextId("rg");
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "radial-gradient",
          id,
          cx: `${fill.center.x * 100}%`,
          cy: `${fill.center.y * 100}%`,
          r: `${Math.abs(fill.radius) * 100}%`,
          stops: resolveGradientStops(fill.stops),
        },
      };
    }

    case "image": {
      const id = ids.getNextId("img");
      const base64 = uint8ArrayToBase64(fill.data);
      const dataUri = `data:${fill.mimeType};base64,${base64}`;
      const hasExplicitSize = fill.width !== undefined && fill.height !== undefined && fill.width > 0 && fill.height > 0;
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "image",
          id,
          dataUri,
          patternContentUnits: hasExplicitSize ? "userSpaceOnUse" : "objectBoundingBox",
          width: hasExplicitSize ? fill.width! : 1,
          height: hasExplicitSize ? fill.height! : 1,
          imageWidth: hasExplicitSize ? fill.width! : 1,
          imageHeight: hasExplicitSize ? fill.height! : 1,
          preserveAspectRatio: "xMidYMid slice",
        },
      };
    }
  }
  // TypeScript exhaustiveness check: if a new Fill type is added to the union,
  // this line will produce a compile error.
   
  const _exhaustive: never = fill;
  return { attrs: { fill: "none" } };
}

/**
 * Resolve fills array — uses the topmost (last) fill, or fill="none" if empty.
 */
export function resolveTopFill(fills: readonly Fill[], ids: IdGenerator): ResolvedFill {
  if (fills.length > 0) {
    return resolveFill(fills[fills.length - 1], ids);
  }
  return { attrs: { fill: "none" } };
}
