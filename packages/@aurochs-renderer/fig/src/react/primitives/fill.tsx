/**
 * @file Fill rendering for React scene graph renderer
 *
 * Resolves a scene graph Fill to SVG fill/fill-opacity attributes,
 * producing inline <defs> elements for gradients and patterns.
 *
 * Each fill that requires a def (gradient, pattern) produces the def
 * element directly — the caller renders it inline as a sibling <defs>.
 * This avoids the timing problem of centralized defs collection via refs.
 */

import type { ReactNode } from "react";
import type { Fill } from "../../scene-graph/types";
import { colorToHex, uint8ArrayToBase64 } from "./color";

// =============================================================================
// Types
// =============================================================================

export type FillResult = {
  readonly fill: string;
  readonly fillOpacity?: number;
  /** Def element (gradient/pattern) to render in an inline <defs> block */
  readonly defElement?: ReactNode;
};

type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

/** Build FillResult with optional fillOpacity for non-opaque fills */
function buildFillResult(fillValue: string, opacity: number, defElement?: ReactNode): FillResult {
  if (opacity < 1) {
    return { fill: fillValue, fillOpacity: opacity, defElement };
  }
  return defElement ? { fill: fillValue, defElement } : { fill: fillValue };
}

// =============================================================================
// Fill Resolution
// =============================================================================

/**
 * Resolve a Fill to SVG attributes and an optional def element.
 *
 * Unlike the previous version that registered defs via context refs,
 * this returns the def element directly for inline rendering.
 * This ensures defs are always present in the DOM on the first render.
 */
export function resolveFillAttrs(fill: Fill, ids: IdGenerator): FillResult {
  switch (fill.type) {
    case "solid": {
      return buildFillResult(colorToHex(fill.color), fill.opacity);
    }

    case "linear-gradient": {
      const id = ids.getNextId("lg");
      const stops = fill.stops.map((s, i) => (
        <stop
          key={i}
          offset={`${s.position * 100}%`}
          stopColor={colorToHex(s.color)}
          stopOpacity={s.color.a < 1 ? s.color.a : undefined}
        />
      ));
      const defElement = (
        <linearGradient
          id={id}
          x1={`${fill.start.x * 100}%`}
          y1={`${fill.start.y * 100}%`}
          x2={`${fill.end.x * 100}%`}
          y2={`${fill.end.y * 100}%`}
        >
          {stops}
        </linearGradient>
      );
      return buildFillResult(`url(#${id})`, fill.opacity, defElement);
    }

    case "radial-gradient": {
      const id = ids.getNextId("rg");
      const stops = fill.stops.map((s, i) => (
        <stop
          key={i}
          offset={`${s.position * 100}%`}
          stopColor={colorToHex(s.color)}
          stopOpacity={s.color.a < 1 ? s.color.a : undefined}
        />
      ));
      const defElement = (
        <radialGradient
          id={id}
          cx={`${fill.center.x * 100}%`}
          cy={`${fill.center.y * 100}%`}
          r={`${Math.abs(fill.radius) * 100}%`}
        >
          {stops}
        </radialGradient>
      );
      return buildFillResult(`url(#${id})`, fill.opacity, defElement);
    }

    case "image": {
      const id = ids.getNextId("img");
      const base64 = uint8ArrayToBase64(fill.data);
      const dataUri = `data:${fill.mimeType};base64,${base64}`;
      let defElement: ReactNode;
      if (fill.width && fill.height) {
        defElement = (
          <pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={fill.width}
            height={fill.height}
          >
            <image
              href={dataUri}
              x={0}
              y={0}
              width={fill.width}
              height={fill.height}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        );
      } else {
        defElement = (
          <pattern
            id={id}
            patternContentUnits="objectBoundingBox"
            width={1}
            height={1}
          >
            <image
              href={dataUri}
              x={0}
              y={0}
              width={1}
              height={1}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        );
      }
      return buildFillResult(`url(#${id})`, fill.opacity, defElement);
    }
  }
}

/**
 * Resolve fills array to SVG fill attributes.
 * Uses the topmost (last) fill, or returns fill="none" if empty.
 */
export function resolveTopFillAttrs(
  fills: readonly Fill[],
  ids: IdGenerator,
): FillResult {
  if (fills.length > 0) {
    return resolveFillAttrs(fills[fills.length - 1], ids);
  }
  return { fill: "none" };
}
