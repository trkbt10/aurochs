/**
 * @file Fill Primitives for React SVG Renderer
 *
 * Provides utilities and components for rendering fill styles
 * including solid colors, gradients, and image patterns.
 */

import type { ReactNode } from "react";
import type { Fill } from "@oxen-office/pptx/domain";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import {
  resolveFill,
  type ResolvedFill,
  type ResolvedGradientFill,
  type ResolvedImageFill,
  type ResolvedPatternFill,
} from "@oxen-office/pptx/domain/color/fill";
import type { ResourceResolverFn } from "@oxen-office/pptx/domain/resource-resolver";
import { PatternDef } from "../drawing-ml/fill";
import { ooxmlAngleToSvgLinearGradient, getRadialGradientCoords } from "../../svg/gradient-utils";
import { useSvgDefs } from "../hooks/useSvgDefs";
import { useRenderContext, useRenderResources, useRenderResourceStore } from "../context";

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
// Fill Resolution
// =============================================================================

/**
 * Convert resolved fill to SVG fill props and optional def element.
 */
function resolvedFillToResult(
  fill: ResolvedFill,
  getNextId: (prefix: string) => string,
  width?: number,
  height?: number,
): FillResult {
  switch (fill.type) {
    case "none":
    case "unresolved":
      return { props: { fill: "none" } };

    case "solid": {
      const props: SvgFillProps = buildSolidFillProps(fill.color);
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
      const defElement = createImagePatternDef(fill, patternId, width, height);
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

  if (fill.isRadial) {
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
    <linearGradient
      id={id}
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
    >
      {stops}
    </linearGradient>
  );
}

/**
 * Create image pattern definition element
 */
function createImagePatternDef(
  fill: ResolvedImageFill,
  id: string,
  width: number,
  height: number,
): ReactNode {
  return (
    <pattern
      id={id}
      patternUnits="objectBoundingBox"
      width="1"
      height="1"
    >
      <image
        href={fill.src}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
      />
    </pattern>
  );
}

/**
 * Create ECMA-376 pattern definition element
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
function createPatternDef(fill: ResolvedPatternFill, id: string): ReactNode {
  return (
    <PatternDef
      id={id}
      preset={fill.preset}
      fgColor={fill.fgColor}
      bgColor={fill.bgColor}
    />
  );
}

// =============================================================================
// Hook
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
 * Hook to resolve fill and return both props and def element.
 * The caller is responsible for rendering the defElement in a <defs> block.
 *
 * @param fill - Domain fill object
 * @param width - Shape width (needed for image patterns)
 * @param height - Shape height (needed for image patterns)
 * @returns SVG fill props and optional def element
 */
export function useFillWithDefs(
  fill: Fill | undefined,
  width?: number,
  height?: number,
): FillWithDefsResult {
  const { colorContext } = useRenderContext();
  const resources = useRenderResources();
  const resourceStore = useRenderResourceStore();
  const { getNextId } = useSvgDefs();

  if (fill === undefined || fill.type === "noFill") {
    return { props: { fill: "none" } };
  }

  // Create composite resolver: ResourceStore > legacy resolver
  const compositeResolver: ResourceResolverFn = (resourceId) => {
    // 1. Check ResourceStore first
    if (resourceStore !== undefined) {
      const url = resourceStore.toDataUrl(resourceId);
      if (url !== undefined) {return url;}
    }
    // 2. Fall back to legacy resolver
    return resources.resolve(resourceId);
  };

  const resolved = resolveFill(fill, colorContext, compositeResolver);
  const result = resolvedFillToResult(resolved, getNextId, width, height);

  return {
    props: result.props,
    defElement: result.defElement,
  };
}

/**
 * Hook to resolve fill and register defs if needed.
 *
 * @param fill - Domain fill object
 * @param width - Shape width (needed for image patterns)
 * @param height - Shape height (needed for image patterns)
 * @returns SVG fill props
 * @deprecated Use useFillWithDefs instead and render defElement directly
 */
export function useFill(
  fill: Fill | undefined,
  width?: number,
  height?: number,
): SvgFillProps {
  const { colorContext } = useRenderContext();
  const resources = useRenderResources();
  const resourceStore = useRenderResourceStore();
  const { getNextId, addDef, hasDef } = useSvgDefs();

  if (fill === undefined || fill.type === "noFill") {
    return { fill: "none" };
  }

  // Create composite resolver: ResourceStore > legacy resolver
  const compositeResolver: ResourceResolverFn = (resourceId) => {
    // 1. Check ResourceStore first
    if (resourceStore !== undefined) {
      const url = resourceStore.toDataUrl(resourceId);
      if (url !== undefined) {return url;}
    }
    // 2. Fall back to legacy resolver
    return resources.resolve(resourceId);
  };

  const resolved = resolveFill(fill, colorContext, compositeResolver);
  const result = resolvedFillToResult(resolved, getNextId, width, height);

  // Register def if present and not already registered
  if (result.defId && result.defElement && !hasDef(result.defId)) {
    addDef(result.defId, result.defElement);
  }

  return result.props;
}

/**
 * Resolve fill without registering defs (for external use).
 * Returns both props and the def element.
 *
 * @param fill - Domain fill object
 * @param colorContext - Color context for theme/scheme color resolution
 * @param getNextId - Function to generate unique IDs
 * @param width - Shape width (needed for image patterns)
 * @param height - Shape height (needed for image patterns)
 * @param resourceResolver - Optional resource resolver for blipFill resolution
 */
export function resolveFillForReact(
  fill: Fill | undefined,
  colorContext: ColorContext | undefined,
  getNextId: (prefix: string) => string,
  width?: number,
  height?: number,
  resourceResolver?: ResourceResolverFn,
): FillResult {
  if (fill === undefined || fill.type === "noFill") {
    return { props: { fill: "none" } };
  }

  const resolved = resolveFill(fill, colorContext, resourceResolver);
  return resolvedFillToResult(resolved, getNextId, width, height);
}
