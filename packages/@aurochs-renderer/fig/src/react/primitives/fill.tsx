/**
 * @file Fill rendering for React scene graph renderer
 *
 * Resolves a scene graph Fill to SVG fill/fill-opacity attributes,
 * registering gradient/pattern defs via useFigSvgDefs.
 */

import type { ReactNode } from "react";
import type { Fill } from "../../scene-graph/types";
import { colorToHex, uint8ArrayToBase64 } from "./color";

// =============================================================================
// Types
// =============================================================================

type FillAttrs = {
  readonly fill: string;
  readonly fillOpacity?: number;
};

type DefsApi = {
  readonly getNextId: (prefix: string) => string;
  readonly addDef: (id: string, content: ReactNode) => void;
};

/** Build FillAttrs with optional fillOpacity for non-opaque fills */
function buildFillAttrs(fillValue: string, opacity: number): FillAttrs {
  if (opacity < 1) {
    return { fill: fillValue, fillOpacity: opacity };
  }
  return { fill: fillValue };
}

// =============================================================================
// Fill Resolution
// =============================================================================

/**
 * Resolve a Fill to SVG attributes and register any required defs.
 *
 * This is a plain function (not a hook) — the defs API is passed explicitly
 * so it can be called from render logic without violating Rules of Hooks.
 */
export function resolveFillAttrs(fill: Fill, defs: DefsApi): FillAttrs {
  switch (fill.type) {
    case "solid": {
      return buildFillAttrs(colorToHex(fill.color), fill.opacity);
    }

    case "linear-gradient": {
      const id = defs.getNextId("lg");
      const stops = fill.stops.map((s, i) => (
        <stop
          key={i}
          offset={`${s.position * 100}%`}
          stopColor={colorToHex(s.color)}
          stopOpacity={s.color.a < 1 ? s.color.a : undefined}
        />
      ));
      defs.addDef(
        id,
        <linearGradient
          id={id}
          x1={`${fill.start.x * 100}%`}
          y1={`${fill.start.y * 100}%`}
          x2={`${fill.end.x * 100}%`}
          y2={`${fill.end.y * 100}%`}
        >
          {stops}
        </linearGradient>,
      );
      return buildFillAttrs(`url(#${id})`, fill.opacity);
    }

    case "radial-gradient": {
      const id = defs.getNextId("rg");
      const stops = fill.stops.map((s, i) => (
        <stop
          key={i}
          offset={`${s.position * 100}%`}
          stopColor={colorToHex(s.color)}
          stopOpacity={s.color.a < 1 ? s.color.a : undefined}
        />
      ));
      defs.addDef(
        id,
        <radialGradient
          id={id}
          cx={`${fill.center.x * 100}%`}
          cy={`${fill.center.y * 100}%`}
          r={`${Math.abs(fill.radius) * 100}%`}
        >
          {stops}
        </radialGradient>,
      );
      return buildFillAttrs(`url(#${id})`, fill.opacity);
    }

    case "image": {
      const id = defs.getNextId("img");
      const base64 = uint8ArrayToBase64(fill.data);
      const dataUri = `data:${fill.mimeType};base64,${base64}`;
      if (fill.width && fill.height) {
        defs.addDef(
          id,
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
          </pattern>,
        );
      } else {
        defs.addDef(
          id,
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
          </pattern>,
        );
      }
      return buildFillAttrs(`url(#${id})`, fill.opacity);
    }
  }
}

/**
 * Resolve fills array to SVG fill attributes.
 * Uses the topmost (last) fill, or returns fill="none" if empty.
 */
export function resolveTopFillAttrs(
  fills: readonly Fill[],
  defs: DefsApi,
): FillAttrs {
  if (fills.length > 0) {
    return resolveFillAttrs(fills[fills.length - 1], defs);
  }
  return { fill: "none" };
}
