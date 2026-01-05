/**
 * @file Combined effects hook for React
 *
 * Resolves Effects domain objects to SVG filter definitions.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Effects
 */

import { useMemo, type ReactNode } from "react";
import type { Effects } from "../../../../domain/effects";
import { useRenderContext } from "../../context";
import { useSvgDefs } from "../../hooks/useSvgDefs";
import { ShadowFilterDef, resolveShadowProps, type ResolvedShadowProps } from "./ShadowFilter";
import { GlowFilterDef, resolveGlowProps, type ResolvedGlowProps } from "./GlowFilter";
import { SoftEdgeFilterDef } from "./SoftEdgeFilter";
import type { ColorContext } from "../../../../domain/resolution";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of useEffects hook
 */
export type EffectsResult = {
  /** Whether any effects are present */
  readonly hasEffects: boolean;
  /** SVG filter ID (for filter="url(#id)") */
  readonly filterId: string | undefined;
  /** SVG filter URL reference */
  readonly filterUrl: string | undefined;
  /** SVG filter definition element to place in <defs> */
  readonly filterDef: ReactNode | undefined;
  /** Resolved shadow properties */
  readonly shadow: ResolvedShadowProps | undefined;
  /** Resolved glow properties */
  readonly glow: ResolvedGlowProps | undefined;
  /** Soft edge radius */
  readonly softEdgeRadius: number | undefined;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve shadow if present
 */
function resolveShadowIfPresent(
  shadow: Effects["shadow"],
  colorContext: ColorContext,
): ResolvedShadowProps | undefined {
  if (shadow === undefined) {
    return undefined;
  }
  return resolveShadowProps(shadow, colorContext) ?? undefined;
}

/**
 * Resolve glow if present
 */
function resolveGlowIfPresent(
  glow: Effects["glow"],
  colorContext: ColorContext,
): ResolvedGlowProps | undefined {
  if (glow === undefined) {
    return undefined;
  }
  return resolveGlowProps(glow, colorContext) ?? undefined;
}

/**
 * Extract soft edge radius if present
 */
function extractSoftEdgeRadius(softEdge: Effects["softEdge"]): number | undefined {
  if (softEdge === undefined) {
    return undefined;
  }
  return softEdge.radius as number;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to resolve Effects domain object to SVG filter.
 *
 * @param effects - Effects domain object
 * @returns Effects result with SVG filter definition
 *
 * @example
 * ```tsx
 * function EffectShape({ effects, children }: Props) {
 *   const fx = useEffects(effects);
 *
 *   return (
 *     <>
 *       {fx.filterDef && <defs>{fx.filterDef}</defs>}
 *       <g filter={fx.filterUrl}>
 *         {children}
 *       </g>
 *     </>
 *   );
 * }
 * ```
 */
export function useEffects(effects: Effects | undefined): EffectsResult {
  const { colorContext } = useRenderContext();
  const { getNextId } = useSvgDefs();

  return useMemo(() => {
    return resolveEffectsForReact(effects, colorContext, getNextId);
  }, [effects, colorContext, getNextId]);
}

/**
 * Resolve effects without using React context.
 * Useful for non-component contexts or testing.
 */
export function resolveEffectsForReact(
  effects: Effects | undefined,
  colorContext: ColorContext,
  getNextId: (prefix: string) => string,
): EffectsResult {
  if (effects === undefined) {
    return {
      hasEffects: false,
      filterId: undefined,
      filterUrl: undefined,
      filterDef: undefined,
      shadow: undefined,
      glow: undefined,
      softEdgeRadius: undefined,
    };
  }

  // Check which effects are present
  const hasShadow = effects.shadow !== undefined;
  const hasGlow = effects.glow !== undefined;
  const hasSoftEdge = effects.softEdge !== undefined;

  // If no supported effects, return empty result
  if (!hasShadow && !hasGlow && !hasSoftEdge) {
    return {
      hasEffects: false,
      filterId: undefined,
      filterUrl: undefined,
      filterDef: undefined,
      shadow: undefined,
      glow: undefined,
      softEdgeRadius: undefined,
    };
  }

  // Resolve individual effects
  const shadowProps = resolveShadowIfPresent(effects.shadow, colorContext);
  const glowProps = resolveGlowIfPresent(effects.glow, colorContext);
  const softEdgeRadius = extractSoftEdgeRadius(effects.softEdge);

  // Count active effects to determine if we need a combined filter
  const activeEffects = [
    shadowProps !== undefined,
    glowProps !== undefined,
    softEdgeRadius !== undefined,
  ].filter(Boolean).length;

  // If no effects resolved successfully
  if (activeEffects === 0) {
    return {
      hasEffects: false,
      filterId: undefined,
      filterUrl: undefined,
      filterDef: undefined,
      shadow: undefined,
      glow: undefined,
      softEdgeRadius: undefined,
    };
  }

  // Generate filter ID
  const filterId = getNextId("effect-filter");

  // Build filter definition
  const filterDef = createCombinedFilterDef(
    filterId,
    effects,
    colorContext,
  );

  return {
    hasEffects: true,
    filterId,
    filterUrl: `url(#${filterId})`,
    filterDef,
    shadow: shadowProps ?? undefined,
    glow: glowProps ?? undefined,
    softEdgeRadius,
  };
}

// =============================================================================
// Combined Filter Generation
// =============================================================================

/**
 * Create a combined filter for multiple effects.
 *
 * If only one effect is present, delegates to the specific filter component.
 * If multiple effects are present, creates a combined filter.
 */
function createCombinedFilterDef(
  id: string,
  effects: Effects,
  colorContext: ColorContext,
): ReactNode {
  const hasShadow = effects.shadow !== undefined;
  const hasGlow = effects.glow !== undefined;
  const hasSoftEdge = effects.softEdge !== undefined;

  // Single effect - use specific filter component
  if (hasShadow && !hasGlow && !hasSoftEdge) {
    return <ShadowFilterDef id={id} shadow={effects.shadow!} colorContext={colorContext} />;
  }

  if (hasGlow && !hasShadow && !hasSoftEdge) {
    return <GlowFilterDef id={id} glow={effects.glow!} colorContext={colorContext} />;
  }

  if (hasSoftEdge && !hasShadow && !hasGlow) {
    return <SoftEdgeFilterDef id={id} softEdge={effects.softEdge!} />;
  }

  // Multiple effects - create combined filter
  return (
    <CombinedFilterDef
      id={id}
      shadow={effects.shadow}
      glow={effects.glow}
      softEdge={effects.softEdge}
      colorContext={colorContext}
    />
  );
}

/**
 * Props for CombinedFilterDef
 */
type CombinedFilterDefProps = {
  readonly id: string;
  readonly shadow?: Effects["shadow"];
  readonly glow?: Effects["glow"];
  readonly softEdge?: Effects["softEdge"];
  readonly colorContext: ColorContext;
};

/**
 * Combined filter definition for multiple effects.
 */
function CombinedFilterDef({
  id,
  shadow,
  glow,
  softEdge,
  colorContext,
}: CombinedFilterDefProps): ReactNode {
  const shadowProps = shadow ? resolveShadowProps(shadow, colorContext) : null;
  const glowProps = glow ? resolveGlowProps(glow, colorContext) : null;
  const softEdgeRadius = softEdge ? (softEdge.radius as number) : null;

  return (
    <filter
      id={id}
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >
      {/* Glow effect (behind everything) */}
      {glowProps !== null && (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={glowProps.radius / 2} result="glowBlur" />
          <feFlood floodColor={glowProps.color} floodOpacity={glowProps.opacity} result="glowColor" />
          <feComposite in="glowColor" in2="glowBlur" operator="in" result="glow" />
        </>
      )}

      {/* Shadow effect */}
      {shadowProps !== null && !shadowProps.isInner && (
        <feDropShadow
          in="SourceAlpha"
          dx={shadowProps.dx}
          dy={shadowProps.dy}
          stdDeviation={shadowProps.blurRadius / 2}
          floodColor={shadowProps.color}
          floodOpacity={shadowProps.opacity}
          result="shadow"
        />
      )}

      {/* Soft edge effect */}
      {softEdgeRadius !== null && (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={softEdgeRadius / 2} result="softBlur" />
          <feComposite in="SourceGraphic" in2="softBlur" operator="in" result="softEdge" />
        </>
      )}

      {/* Merge all effects */}
      <feMerge>
        {glowProps !== null && <feMergeNode in="glow" />}
        {shadowProps !== null && !shadowProps.isInner && <feMergeNode in="shadow" />}
        <feMergeNode in={softEdgeRadius !== null ? "softEdge" : "SourceGraphic"} />
      </feMerge>
    </filter>
  );
}
