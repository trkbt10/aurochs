/**
 * @file Fill resolution — shared SoT for SceneGraph Fill → SVG fill attributes
 *
 * This is the SINGLE place where Fill → SVG attributes conversion happens.
 * Both SVG string and React renderers MUST consume this output.
 *
 * The resolved attributes are format-agnostic (plain objects),
 * usable by both string concatenation and React JSX.
 */

import type { Fill, GradientStop, AffineMatrix } from "../types";
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
  /** When "userSpaceOnUse", x1/y1/x2/y2 are pixel coordinates */
  readonly gradientUnits?: "userSpaceOnUse";
  /**
   * Raw Figma gradient transform matrix — preserved for finalization.
   * finalizeGradientDefs() converts this to userSpaceOnUse pixel coords
   * using the element's bounding box size.
   * After finalization, this field is cleared (set to undefined).
   */
  readonly gradientTransform?: AffineMatrix;
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
  /** When "userSpaceOnUse", cx/cy/r are pixel coordinates */
  readonly gradientUnits?: "userSpaceOnUse";
  /**
   * SVG gradientTransform string (after finalization) or raw AffineMatrix
   * (before finalization). After finalizeGradientDefs(), this is a string.
   */
  readonly gradientTransform?: string | AffineMatrix;
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
  /** SVG patternTransform string (from image transform matrix) */
  readonly patternTransform?: string;
  /**
   * Image element transform (computed by finalizeImagePatternDefs).
   * When set, the image uses its natural pixel dimensions with this
   * transform mapping to objectBoundingBox 0..1 space.
   */
  readonly imageTransform?: string;
  /** Scale mode for image pattern finalization */
  readonly scaleMode?: string;
  /** Tile scale multiplier for TILE image fills */
  readonly scalingFactor?: number;
  /** Source paint transform (AffineMatrix) for finalization */
  readonly sourceTransform?: import("../types").AffineMatrix;
};

/**
 * An angular (conic) gradient def.
 * Rendered via foreignObject + CSS conic-gradient (SVG) or shader (WebGL).
 *
 * `elementWidth` / `elementHeight` are set by `finalizeAngularDiamondGradientDefs`
 * once the parent element size is known. They are needed because the SVG
 * <foreignObject> inside the <pattern> cannot use objectBoundingBox units —
 * its x/y/width/height are always in user-space pixels. Keeping the pattern
 * as a 1×1 bounding-box pattern (as we did previously) shrunk the
 * conic-gradient DIV to a single pixel and produced an invisible fill
 * (Hologram FRAME bug — ID 126:420).
 */
export type ResolvedAngularGradient = {
  readonly type: "angular-gradient";
  readonly id: string;
  readonly cx: string;
  readonly cy: string;
  readonly rotation: number;
  readonly stops: readonly ResolvedGradientStop[];
  readonly elementWidth?: number;
  readonly elementHeight?: number;
};

/**
 * A diamond gradient def.
 * Rendered via four mirrored gradient rects (SVG) or shader (WebGL).
 * Same `elementWidth/elementHeight` contract as the angular variant.
 */
export type ResolvedDiamondGradient = {
  readonly type: "diamond-gradient";
  readonly id: string;
  readonly cx: string;
  readonly cy: string;
  readonly stops: readonly ResolvedGradientStop[];
  readonly elementWidth?: number;
  readonly elementHeight?: number;
};

/**
 * Union of all fill def types.
 * The consumer must handle each variant (exhaustive switch enforced by TypeScript).
 */
export type ResolvedFillDef =
  | ResolvedLinearGradient
  | ResolvedRadialGradient
  | ResolvedAngularGradient
  | ResolvedDiamondGradient
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

/**
 * SSoT ID generator interface for SVG defs (gradient, pattern, mask,
 * filter, clip-path, stroke-mask, etc.).
 *
 * The canonical implementation lives in
 * `scene-graph/render-tree/resolve.ts` and uses a module-level
 * `resolverGeneration` counter so every call to `createIdGenerator()`
 * produces a disjoint ID namespace (`${prefix}-g${gen}-${seq}`). This
 * guarantees no two scene-renderer instances mounted in the same HTML
 * document can emit colliding `<mask id="…">` definitions — a subtle
 * bug that caused Bento Link (190:3213) to lose its clip under certain
 * editor zoom states.
 *
 * Test specs may supply a simpler counter for unit-level isolation; any
 * production code that needs an ID generator MUST route through
 * resolveRenderTree rather than instantiating one ad-hoc.
 */
export type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

// =============================================================================
// Resolution functions
// =============================================================================

function matrixToPatternTransform(m: AffineMatrix): string {
  return `matrix(${m.m00},${m.m10},${m.m01},${m.m11},${m.m02},${m.m12})`;
}

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
          gradientTransform: fill.gradientTransform,
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
          gradientTransform: fill.gradientTransform,
        },
      };
    }

    case "angular-gradient": {
      const id = ids.getNextId("ag");
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "angular-gradient",
          id,
          cx: `${fill.center.x * 100}%`,
          cy: `${fill.center.y * 100}%`,
          rotation: fill.rotation,
          stops: resolveGradientStops(fill.stops),
        },
      };
    }

    case "diamond-gradient": {
      const id = ids.getNextId("dg");
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "diamond-gradient",
          id,
          cx: `${fill.center.x * 100}%`,
          cy: `${fill.center.y * 100}%`,
          stops: resolveGradientStops(fill.stops),
        },
      };
    }

    case "image": {
      const id = ids.getNextId("img");
      const base64 = uint8ArrayToBase64(fill.data);
      const dataUri = `data:${fill.mimeType};base64,${base64}`;
      return {
        attrs: buildAttrs(`url(#${id})`, fill.opacity),
        def: {
          type: "image",
          id,
          dataUri,
          // objectBoundingBox: 1 unit = element dimension.
          // Image uses natural pixel dims with a computed transform
          // (set by finalizeImagePatternDefs after element size is known).
          // Before finalization: simple 0..1 stretch fallback.
          patternContentUnits: "objectBoundingBox",
          width: 1,
          height: 1,
          imageWidth: 1,
          imageHeight: 1,
          preserveAspectRatio: "none",
          patternTransform: fill.imageTransform ? matrixToPatternTransform(fill.imageTransform) : undefined,
          // Preserved for finalizeImagePatternDefs
          scaleMode: fill.scaleMode,
          scalingFactor: fill.scalingFactor,
          sourceTransform: fill.imageTransform,
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
