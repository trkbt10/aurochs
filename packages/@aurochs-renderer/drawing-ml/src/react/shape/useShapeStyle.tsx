/**
 * @file Combined shape style hook
 *
 * Brings together fill, stroke, and effects into a single hook
 * for rendering complete shape styles.
 *
 * Format-agnostic version that accepts resolved fill/line/effects.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44 (spPr)
 */

import { useMemo, type ReactNode } from "react";
import type { ResolvedFill, ResolvedLine } from "@aurochs-office/drawing-ml/domain/resolved-fill";
import type { Effects } from "@aurochs-office/drawing-ml/domain/effects";
import { useFillWithDefs, type FillWithDefsResult } from "../primitives/Fill";
import { useStroke, type SvgStrokeProps } from "../primitives/Stroke";
import { useEffects, type EffectsResult } from "../effects";

// =============================================================================
// Types
// =============================================================================

/**
 * Shape style input properties (format-agnostic)
 *
 * Accepts resolved fill and line types that have already been processed
 * by format-specific resolvers (PPTX resolveFill, etc.)
 */
export type ShapeStyleInput = {
  /** Resolved fill (after color/resource resolution) */
  readonly resolvedFill?: ResolvedFill;
  /** Resolved line/stroke (after color resolution) */
  readonly resolvedLine?: ResolvedLine;
  /** Effects definition (uses OOXML Effects type) */
  readonly effects?: Effects;
  /** Shape width in pixels (for pattern fills) */
  readonly width?: number;
  /** Shape height in pixels (for pattern fills) */
  readonly height?: number;
};

/**
 * Result of useShapeStyle hook
 */
export type ShapeStyleResult = {
  /** Fill result with SVG props */
  readonly fill: FillWithDefsResult;
  /** Stroke result with SVG props */
  readonly stroke: SvgStrokeProps | undefined;
  /** Effects result with filter */
  readonly effects: EffectsResult;
  /** All SVG defs to render in <defs> section */
  readonly defs: ReactNode;
  /** Combined SVG attributes for the shape */
  readonly svgProps: ShapeSvgProps;
};

/**
 * SVG props for shape rendering
 */
export type ShapeSvgProps = {
  readonly fill: string;
  readonly fillOpacity?: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeOpacity?: number;
  readonly strokeLinecap?: "butt" | "round" | "square";
  readonly strokeLinejoin?: "miter" | "round" | "bevel";
  readonly strokeDasharray?: string;
  readonly filter?: string;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Combined hook for shape styling.
 *
 * Resolves fill, stroke, and effects into SVG-ready props and defs.
 * Accepts format-agnostic resolved types.
 *
 * @example
 * ```tsx
 * function StyledShape({ resolvedFill, resolvedLine, effects }: Props) {
 *   const style = useShapeStyle({
 *     resolvedFill,
 *     resolvedLine,
 *     effects,
 *     width: 100,
 *     height: 50,
 *   });
 *
 *   return (
 *     <>
 *       {style.defs && <defs>{style.defs}</defs>}
 *       <rect {...style.svgProps} width={100} height={50} />
 *     </>
 *   );
 * }
 * ```
 */
export function useShapeStyle(input: ShapeStyleInput): ShapeStyleResult {
  const fillResult = useFillWithDefs(input.resolvedFill, input.width, input.height);
  const strokeResult = useStroke(input.resolvedLine);
  const effectsResult = useEffects(input.effects);

  return useMemo(() => {
    // Combine all defs
    const defs = buildDefs(fillResult.defElement, effectsResult.filterDef);

    // Build combined SVG props
    const svgProps = buildSvgProps(fillResult, strokeResult, effectsResult);

    return {
      fill: fillResult,
      stroke: strokeResult,
      effects: effectsResult,
      defs,
      svgProps,
    };
  }, [fillResult, strokeResult, effectsResult]);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build combined defs element
 */
function buildDefs(fillDef: ReactNode | undefined, effectsDef: ReactNode | undefined): ReactNode {
  if (fillDef === undefined && effectsDef === undefined) {
    return null;
  }

  return (
    <>
      {fillDef}
      {effectsDef}
    </>
  );
}

/**
 * Build combined SVG props
 */
function buildSvgProps(
  fill: FillWithDefsResult,
  stroke: SvgStrokeProps | undefined,
  effects: EffectsResult,
): ShapeSvgProps {
  const result: ShapeSvgProps = {
    fill: fill.props.fill,
  };

  // Fill opacity
  if (fill.props.fillOpacity !== undefined) {
    (result as Record<string, unknown>).fillOpacity = fill.props.fillOpacity;
  }

  // Stroke props
  if (stroke !== undefined) {
    (result as Record<string, unknown>).stroke = stroke.stroke;
    (result as Record<string, unknown>).strokeWidth = stroke.strokeWidth;
    if (stroke.strokeOpacity !== undefined) {
      (result as Record<string, unknown>).strokeOpacity = stroke.strokeOpacity;
    }
    if (stroke.strokeLinecap !== undefined) {
      (result as Record<string, unknown>).strokeLinecap = stroke.strokeLinecap;
    }
    if (stroke.strokeLinejoin !== undefined) {
      (result as Record<string, unknown>).strokeLinejoin = stroke.strokeLinejoin;
    }
    if (stroke.strokeDasharray !== undefined) {
      (result as Record<string, unknown>).strokeDasharray = stroke.strokeDasharray;
    }
  }

  // Effects filter
  if (effects.filterUrl !== undefined) {
    (result as Record<string, unknown>).filter = effects.filterUrl;
  }

  return result;
}
