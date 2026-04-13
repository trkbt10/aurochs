/**
 * @file Effects rendering for React scene graph renderer
 *
 * Delegates to the shared SoT in scene-graph/render/effects.ts for all
 * attribute computation. This file only converts ResolvedFilter → React JSX.
 */

import type { ReactNode } from "react";
import type { Effect } from "../../scene-graph/types";
import {
  resolveEffects as sharedResolveEffects,
  type ResolvedFilter,
  type ResolvedFilterPrimitive,
} from "../../scene-graph/render";

type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

export type EffectsResult = {
  /** filter attribute value (e.g. "url(#filter-0)") */
  readonly filterAttr: string;
  /** Filter def element to render in an inline <defs> block */
  readonly defElement: ReactNode;
};

// =============================================================================
// Primitive Rendering (ResolvedFilterPrimitive → React JSX)
// =============================================================================

/**
 * Convert a ResolvedFilterPrimitive to a React JSX element.
 * Exhaustive switch ensures all primitive types are handled.
 */
function renderPrimitive(p: ResolvedFilterPrimitive, key: number): ReactNode {
  switch (p.type) {
    case "feFlood":
      return <feFlood key={key} floodOpacity={p.floodOpacity} result={p.result} />;
    case "feColorMatrix":
      return <feColorMatrix key={key} in={p.in} type={p.matrixType} values={p.values} result={p.result} />;
    case "feOffset":
      return <feOffset key={key} dx={p.dx} dy={p.dy} />;
    case "feGaussianBlur":
      return <feGaussianBlur key={key} in={p.in} stdDeviation={p.stdDeviation} />;
    case "feBlend":
      return <feBlend key={key} mode={p.mode} in={p.in} in2={p.in2} result={p.result} />;
    case "feComposite":
      return <feComposite key={key} in2={p.in2} operator={p.operator} k2={p.k2} k3={p.k3} />;
  }
}

function toEffectsResult(resolved: ResolvedFilter): EffectsResult {
  const primitiveElements = resolved.primitives.map((p, i) => renderPrimitive(p, i));
  return {
    filterAttr: resolved.filterAttr,
    defElement: <filter id={resolved.id}>{primitiveElements}</filter>,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve effects to a filter URL and def element.
 * Delegates computation to scene-graph/render (shared SoT).
 */
export function resolveEffectsFilter(
  effects: readonly Effect[],
  ids: IdGenerator,
): EffectsResult | undefined {
  const resolved = sharedResolveEffects(effects, ids);
  if (!resolved) return undefined;
  return toEffectsResult(resolved);
}
