/**
 * @file Effects (shadow, blur) rendering for React scene graph renderer
 *
 * Produces SVG filter elements and returns a filter URL reference.
 * Filter defs are returned directly for inline rendering.
 */

import type { ReactNode } from "react";
import type { Effect, DropShadowEffect, InnerShadowEffect, LayerBlurEffect } from "../../scene-graph/types";

type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

export type EffectsResult = {
  /** filter attribute value (e.g. "url(#filter-0)") */
  readonly filterAttr: string;
  /** Filter def element to render in an inline <defs> block */
  readonly defElement: ReactNode;
};

/**
 * Mutable accumulator for building SVG filter primitives.
 * Encapsulates key generation and shape-established tracking.
 */
type FilterAccumulator = {
  readonly primitives: ReactNode[];
  shapeEstablished: boolean;
  keyCounter: number;
};

function createFilterAccumulator(): FilterAccumulator {
  return { primitives: [], shapeEstablished: false, keyCounter: 0 };
}

function nextKey(acc: FilterAccumulator): number {
  return acc.keyCounter++;
}

function buildColorMatrix(c: { r: number; g: number; b: number; a: number }): string {
  return `0 0 0 0 ${c.r} 0 0 0 0 ${c.g} 0 0 0 0 ${c.b} 0 0 0 ${c.a} 0`;
}

const ALPHA_BINARIZE_MATRIX = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0";

function accumulateDropShadow(acc: FilterAccumulator, effect: DropShadowEffect): void {
  const stdDev = effect.radius / 2;
  acc.primitives.push(
    <feFlood key={nextKey(acc)} floodOpacity={0} result="BackgroundImageFix" />,
    <feColorMatrix key={nextKey(acc)} in="SourceAlpha" type="matrix" values={ALPHA_BINARIZE_MATRIX} result="hardAlpha" />,
    <feOffset key={nextKey(acc)} dx={effect.offset.x} dy={effect.offset.y} />,
    <feGaussianBlur key={nextKey(acc)} stdDeviation={stdDev} />,
    <feColorMatrix key={nextKey(acc)} type="matrix" values={buildColorMatrix(effect.color)} />,
    <feBlend key={nextKey(acc)} mode="normal" in2="BackgroundImageFix" />,
    <feBlend key={nextKey(acc)} mode="normal" in="SourceGraphic" in2="effect" result="shape" />,
  );
  acc.shapeEstablished = true;
}

function accumulateInnerShadow(acc: FilterAccumulator, effect: InnerShadowEffect): void {
  const stdDev = effect.radius / 2;

  // Establish "shape" base if not set by a preceding drop shadow
  if (!acc.shapeEstablished) {
    acc.primitives.push(
      <feFlood key={nextKey(acc)} floodOpacity={0} result="BackgroundImageFix" />,
      <feBlend key={nextKey(acc)} mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />,
    );
    acc.shapeEstablished = true;
  }

  acc.primitives.push(
    <feColorMatrix key={nextKey(acc)} in="SourceAlpha" type="matrix" values={ALPHA_BINARIZE_MATRIX} result="hardAlpha" />,
    <feOffset key={nextKey(acc)} dx={effect.offset.x} dy={effect.offset.y} />,
    <feGaussianBlur key={nextKey(acc)} stdDeviation={stdDev} />,
    <feComposite key={nextKey(acc)} in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />,
    <feColorMatrix key={nextKey(acc)} type="matrix" values={buildColorMatrix(effect.color)} />,
    <feBlend key={nextKey(acc)} mode="normal" in2="shape" result="shape" />,
  );
}

function accumulateLayerBlur(acc: FilterAccumulator, effect: LayerBlurEffect): void {
  const stdDev = effect.radius / 2;
  acc.primitives.push(
    <feGaussianBlur key={nextKey(acc)} in="SourceGraphic" stdDeviation={stdDev} />,
  );
}

/**
 * Produce an SVG filter for the given effects and return the filter URL + def element.
 * Returns undefined if no effects produce filter primitives.
 */
export function resolveEffectsFilter(
  effects: readonly Effect[],
  ids: IdGenerator,
): EffectsResult | undefined {
  if (effects.length === 0) {
    return undefined;
  }

  const acc = createFilterAccumulator();

  for (const effect of effects) {
    switch (effect.type) {
      case "drop-shadow":
        accumulateDropShadow(acc, effect);
        break;
      case "inner-shadow":
        accumulateInnerShadow(acc, effect);
        break;
      case "layer-blur":
        accumulateLayerBlur(acc, effect);
        break;
      case "background-blur":
        // Background blur not supported in SVG filter pipeline
        break;
    }
  }

  if (acc.primitives.length === 0) {
    return undefined;
  }

  const id = ids.getNextId("filter");
  const defElement = <filter id={id}>{acc.primitives}</filter>;
  return { filterAttr: `url(#${id})`, defElement };
}
