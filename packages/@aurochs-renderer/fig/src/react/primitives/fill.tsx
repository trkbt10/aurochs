/**
 * @file Fill rendering for React scene graph renderer
 *
 * Delegates to the shared SoT in scene-graph/render/fill.ts for all
 * attribute computation. This file only converts ResolvedFill → React JSX.
 */

import type { ReactNode } from "react";
import type { Fill } from "../../scene-graph/types";
import {
  resolveFill as sharedResolveFill,
  resolveTopFill as sharedResolveTopFill,
  type ResolvedFill,
  type ResolvedFillDef,
  type ResolvedGradientStop,
  type IdGenerator,
} from "../../scene-graph/render";

// =============================================================================
// Types
// =============================================================================

export type FillResult = {
  readonly fill: string;
  readonly fillOpacity?: number;
  /** Def element (gradient/pattern) to render in an inline <defs> block */
  readonly defElement?: ReactNode;
};

// =============================================================================
// Def Rendering (ResolvedFillDef → React JSX)
// =============================================================================

function renderGradientStops(stops: readonly ResolvedGradientStop[]): ReactNode[] {
  return stops.map((s, i) => (
    <stop
      key={i}
      offset={s.offset}
      stopColor={s.stopColor}
      stopOpacity={s.stopOpacity}
    />
  ));
}

/**
 * Convert a ResolvedFillDef to a React JSX element.
 * Exhaustive switch ensures all def types are handled.
 */
function renderFillDef(def: ResolvedFillDef): ReactNode {
  switch (def.type) {
    case "linear-gradient":
      return (
        <linearGradient id={def.id} x1={def.x1} y1={def.y1} x2={def.x2} y2={def.y2}>
          {renderGradientStops(def.stops)}
        </linearGradient>
      );

    case "radial-gradient":
      return (
        <radialGradient id={def.id} cx={def.cx} cy={def.cy} r={def.r}>
          {renderGradientStops(def.stops)}
        </radialGradient>
      );

    case "image":
      return (
        <pattern
          id={def.id}
          patternContentUnits={def.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined}
          patternUnits={def.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined}
          width={def.width}
          height={def.height}
        >
          <image
            href={def.dataUri}
            x={0}
            y={0}
            width={def.imageWidth}
            height={def.imageHeight}
            preserveAspectRatio={def.preserveAspectRatio}
          />
        </pattern>
      );
  }
}

function toFillResult(resolved: ResolvedFill): FillResult {
  return {
    fill: resolved.attrs.fill,
    fillOpacity: resolved.attrs.fillOpacity,
    defElement: resolved.def ? renderFillDef(resolved.def) : undefined,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a Fill to React fill attributes and an optional def element.
 * Delegates computation to scene-graph/render (shared SoT).
 */
export function resolveFillAttrs(fill: Fill, ids: IdGenerator): FillResult {
  return toFillResult(sharedResolveFill(fill, ids));
}

/**
 * Resolve fills array — uses topmost fill, or fill="none" if empty.
 */
export function resolveTopFillAttrs(fills: readonly Fill[], ids: IdGenerator): FillResult {
  return toFillResult(sharedResolveTopFill(fills, ids));
}
