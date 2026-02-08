/**
 * @file Fill Primitives for React SVG Renderer
 *
 * Format-agnostic fill rendering utilities.
 * Receives resolved fill types and produces SVG fill attributes.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import { useMemo, type ReactNode } from "react";
import type {
  ResolvedFill,
  ResolvedGradientFill,
  ResolvedImageFill,
  ResolvedPatternFill,
} from "@aurochs-office/drawing-ml/domain/resolved-fill";
import type { PatternType } from "@aurochs-office/drawing-ml/domain/fill";
import { PatternDef } from "../fill/PatternDef";
import { ooxmlAngleToSvgLinearGradient, getRadialGradientCoords } from "../gradient/gradient-utils";
import { useDrawingMLContext } from "../context";

// =============================================================================
// Types
// =============================================================================

/**
 * SVG fill props
 */
export type SvgFillProps = {
  readonly fill: string;
  readonly fillOpacity?: number;
};

/**
 * Result of resolving a fill for React rendering
 */
export type FillResult = {
  /** SVG fill attribute value */
  readonly props: SvgFillProps;
  /** Def element to add to <defs> (gradient/pattern) */
  readonly defElement?: ReactNode;
  /** Generated ID for gradient/pattern */
  readonly defId?: string;
};

// =============================================================================
// Types for Function Parameters
// =============================================================================

/**
 * Options for resolvedFillToResult
 */
type ResolvedFillToResultOptions = {
  readonly fill: ResolvedFill;
  readonly getNextId: (prefix: string) => string;
  readonly width?: number;
  readonly height?: number;
};

/**
 * Options for createImagePatternDef
 */
type ImagePatternDefOptions = {
  readonly fill: ResolvedImageFill;
  readonly id: string;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Fill Resolution
// =============================================================================

/**
 * Convert resolved fill to SVG fill props and optional def element.
 */
export function resolvedFillToResult(options: ResolvedFillToResultOptions): FillResult {
  const { fill, getNextId, width, height } = options;

  switch (fill.type) {
    case "none":
    case "unresolved":
      return { props: { fill: "none" } };

    case "solid": {
      const props = buildSolidFillProps(fill.color);
      return { props };
    }

    case "gradient": {
      const gradId = getNextId("grad");
      const defElement = createGradientDef(fill, gradId);
      return {
        props: { fill: `url(#${gradId})` },
        defElement,
        defId: gradId,
      };
    }

    case "image": {
      if (width === undefined || height === undefined) {
        return { props: { fill: "none" } };
      }
      const patternId = getNextId("img-pattern");
      const defElement = createImagePatternDef({ fill, id: patternId, width, height });
      return {
        props: { fill: `url(#${patternId})` },
        defElement,
        defId: patternId,
      };
    }

    case "pattern": {
      const patternId = getNextId("pattern");
      const defElement = createPatternDef(fill, patternId);
      return {
        props: { fill: `url(#${patternId})` },
        defElement,
        defId: patternId,
      };
    }
  }
}

/**
 * Build solid fill props based on alpha
 */
function buildSolidFillProps(color: { hex: string; alpha: number }): SvgFillProps {
  if (color.alpha < 1) {
    return { fill: `#${color.hex}`, fillOpacity: color.alpha };
  }
  return { fill: `#${color.hex}` };
}

/**
 * Create gradient definition element
 */
function createGradientDef(fill: ResolvedGradientFill, id: string): ReactNode {
  const stops = fill.stops.map((stop, index) => (
    <stop
      key={index}
      offset={`${stop.position}%`}
      stopColor={`#${stop.color.hex}`}
      stopOpacity={stop.color.alpha < 1 ? stop.color.alpha : undefined}
    />
  ));

  if (fill.isRadial === true) {
    const { cx, cy, r } = getRadialGradientCoords(fill.radialCenter);
    return (
      <radialGradient id={id} cx={`${cx}%`} cy={`${cy}%`} r={`${r}%`}>
        {stops}
      </radialGradient>
    );
  }

  // Linear gradient - use shared utility for angle conversion
  const { x1, y1, x2, y2 } = ooxmlAngleToSvgLinearGradient(fill.angle);

  return (
    <linearGradient id={id} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
      {stops}
    </linearGradient>
  );
}

/**
 * Create image pattern definition element
 */
function createImagePatternDef(options: ImagePatternDefOptions): ReactNode {
  const { fill, id, width, height } = options;
  return (
    <pattern id={id} patternUnits="objectBoundingBox" width="1" height="1">
      <image href={fill.src} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
    </pattern>
  );
}

/**
 * Create ECMA-376 pattern definition element
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
function createPatternDef(fill: ResolvedPatternFill, id: string): ReactNode {
  // Cast preset to PatternType - the pattern preset should be a valid ECMA-376 value
  // If invalid, PatternDef will render a solid fallback
  return <PatternDef id={id} preset={fill.preset as PatternType} fgColor={fill.fgColor} bgColor={fill.bgColor} />;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Result of resolving a fill with defs
 */
export type FillWithDefsResult = {
  /** SVG fill props */
  readonly props: SvgFillProps;
  /** Def element to render in <defs> */
  readonly defElement?: ReactNode;
};

/**
 * Hook to convert resolved fill to SVG props and def element.
 * The caller is responsible for rendering the defElement in a <defs> block.
 *
 * @param resolvedFill - Resolved fill (after color/resource resolution)
 * @param width - Shape width (needed for image patterns)
 * @param height - Shape height (needed for image patterns)
 * @returns SVG fill props and optional def element
 */
export function useFillWithDefs(
  resolvedFill: ResolvedFill | undefined,
  width?: number,
  height?: number,
): FillWithDefsResult {
  const { getNextId } = useDrawingMLContext();

  return useMemo(() => {
    if (resolvedFill === undefined) {
      return { props: { fill: "none" } };
    }

    const result = resolvedFillToResult({ fill: resolvedFill, getNextId, width, height });
    return {
      props: result.props,
      defElement: result.defElement,
    };
  }, [resolvedFill, getNextId, width, height]);
}

/**
 * Options for resolveFillForReact
 */
export type ResolveFillForReactOptions = {
  readonly resolvedFill: ResolvedFill | undefined;
  readonly getNextId: (prefix: string) => string;
  readonly width?: number;
  readonly height?: number;
};

/**
 * Resolve fill without context (for external use).
 * Returns both props and the def element.
 */
export function resolveFillForReact(options: ResolveFillForReactOptions): FillResult {
  const { resolvedFill, getNextId, width, height } = options;

  if (resolvedFill === undefined) {
    return { props: { fill: "none" } };
  }

  return resolvedFillToResult({ fill: resolvedFill, getNextId, width, height });
}
