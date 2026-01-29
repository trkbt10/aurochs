/**
 * @file Background rendering hook for React
 *
 * Provides background fill data and SVG elements from RenderContext.
 * Supports solid, gradient, pattern, and image backgrounds.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import { useMemo, type ReactNode } from "react";
import type { ResolvedBackgroundFill } from "../../../background-fill";
import { useRenderContext } from "../../context";
import { useSvgDefs } from "../../hooks/useSvgDefs";
import { ooxmlAngleToSvgLinearGradient, getRadialGradientCoords } from "../../../svg/gradient-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of useBackground hook
 */
export type BackgroundResult = {
  /** Whether a background is available */
  readonly hasBackground: boolean;
  /** Background fill type */
  readonly type: "solid" | "gradient" | "image" | "none";
  /** SVG fill value (color, url(#id), or none) */
  readonly fill: string;
  /** SVG definition element(s) to place in <defs> */
  readonly defElement: ReactNode | undefined;
  /** Original resolved background data */
  readonly data: ResolvedBackgroundFill | undefined;
  /** Solid color (for type="solid") */
  readonly solidColor: string | undefined;
  /** Gradient stops (for type="gradient") */
  readonly gradientStops: readonly { position: number; color: string }[] | undefined;
  /** Image data URL (for type="image") */
  readonly imageUrl: string | undefined;
  /** Image mode (for type="image") */
  readonly imageMode: "stretch" | "tile" | undefined;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access resolved background from render context.
 *
 * @returns Background result with SVG-ready data
 *
 * @example
 * ```tsx
 * function SlideBackground() {
 *   const { width, height } = useRenderContext().slideSize;
 *   const bg = useBackground();
 *
 *   if (!bg.hasBackground) {
 *     return <rect width={width} height={height} fill="#ffffff" />;
 *   }
 *
 *   if (bg.type === "image") {
 *     return <image href={bg.imageUrl} width={width} height={height} />;
 *   }
 *
 *   return (
 *     <>
 *       {bg.defElement && <defs>{bg.defElement}</defs>}
 *       <rect width={width} height={height} fill={bg.fill} />
 *     </>
 *   );
 * }
 * ```
 */
export function useBackground(): BackgroundResult {
  const { resolvedBackground } = useRenderContext();
  const { getNextId } = useSvgDefs();

  return useMemo(() => {
    if (resolvedBackground === undefined) {
      return {
        hasBackground: false,
        type: "none",
        fill: "none",
        defElement: undefined,
        data: undefined,
        solidColor: undefined,
        gradientStops: undefined,
        imageUrl: undefined,
        imageMode: undefined,
      };
    }

    return resolveBackground(resolvedBackground, getNextId);
  }, [resolvedBackground, getNextId]);
}

/**
 * Resolve background without using React context.
 * Useful for non-component contexts or testing.
 */
export function resolveBackgroundForReact(
  resolvedBackground: ResolvedBackgroundFill | undefined,
  getNextId: (prefix: string) => string,
): BackgroundResult {
  if (resolvedBackground === undefined) {
    return {
      hasBackground: false,
      type: "none",
      fill: "none",
      defElement: undefined,
      data: undefined,
      solidColor: undefined,
      gradientStops: undefined,
      imageUrl: undefined,
      imageMode: undefined,
    };
  }

  return resolveBackground(resolvedBackground, getNextId);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert resolved background to BackgroundResult
 */
function resolveBackground(
  resolved: ResolvedBackgroundFill,
  getNextId: (prefix: string) => string,
): BackgroundResult {
  switch (resolved.type) {
    case "solid":
      return {
        hasBackground: true,
        type: "solid",
        fill: resolved.color,
        defElement: undefined,
        data: resolved,
        solidColor: resolved.color,
        gradientStops: undefined,
        imageUrl: undefined,
        imageMode: undefined,
      };

    case "gradient": {
      const gradId = getNextId("bg-grad");
      const defElement = createGradientDef(resolved, gradId);
      return {
        hasBackground: true,
        type: "gradient",
        fill: `url(#${gradId})`,
        defElement,
        data: resolved,
        solidColor: undefined,
        gradientStops: resolved.stops,
        imageUrl: undefined,
        imageMode: undefined,
      };
    }

    case "image":
      return {
        hasBackground: true,
        type: "image",
        fill: "none",
        defElement: undefined,
        data: resolved,
        solidColor: undefined,
        gradientStops: undefined,
        imageUrl: resolved.dataUrl,
        imageMode: resolved.mode,
      };
  }
}

/**
 * Create SVG gradient definition element
 */
function createGradientDef(
  resolved: {
    stops: readonly { position: number; color: string }[];
    angle: number;
    isRadial?: boolean;
    radialCenter?: { cx: number; cy: number };
  },
  id: string,
): ReactNode {
  const stops = resolved.stops.map((s, i) => (
    <stop key={i} offset={`${s.position}%`} stopColor={s.color} />
  ));

  if (resolved.isRadial === true) {
    const { cx, cy, r, fx, fy } = getRadialGradientCoords(resolved.radialCenter, true);
    return (
      <radialGradient
        id={id}
        cx={`${cx}%`}
        cy={`${cy}%`}
        r={`${r}%`}
        fx={`${fx}%`}
        fy={`${fy}%`}
      >
        {stops}
      </radialGradient>
    );
  }

  // Linear gradient - use shared utility for angle conversion
  const { x1, y1, x2, y2 } = ooxmlAngleToSvgLinearGradient(resolved.angle);

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
