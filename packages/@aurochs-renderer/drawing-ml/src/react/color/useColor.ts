/**
 * @file Color resolution hook for React
 *
 * Wraps core/drawing-ml/color.ts resolveColor for React usage.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

import { useMemo } from "react";
import type { Color, ColorTransform } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { resolveColor } from "@aurochs-office/drawing-ml/domain/color-resolution";
import { useDrawingMLContext } from "../context";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of resolving a color
 */
export type ResolvedColorResult = {
  /** Hex color string without # (e.g., "FF0000") or undefined if unresolved */
  readonly hex: string | undefined;
  /** CSS color string with # (e.g., "#FF0000") or "transparent" */
  readonly cssColor: string;
  /** Alpha value from 0-1 (extracted from transform.alpha) */
  readonly alpha: number;
  /** Whether the color was successfully resolved */
  readonly isResolved: boolean;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Extract alpha value from color transform.
 * Alpha in OOXML is stored as percentage (0-100).
 */
function extractAlpha(transform: ColorTransform | undefined): number {
  if (transform?.alpha === undefined) {
    return 1;
  }
  // Alpha is stored as percentage (0-100), convert to 0-1
  return (transform.alpha as number) / 100;
}

/**
 * Hook to resolve a Color domain object to usable values.
 *
 * Uses the render context's colorContext for scheme color resolution.
 *
 * @param color - Color domain object
 * @returns Resolved color result with hex, CSS color, alpha, and resolution status
 *
 * @example
 * ```tsx
 * function MyComponent({ color }: { color: Color }) {
 *   const resolved = useColor(color);
 *   return <rect fill={resolved.cssColor} fillOpacity={resolved.alpha} />;
 * }
 * ```
 */
export function useColor(color: Color | undefined): ResolvedColorResult {
  const { colorContext } = useDrawingMLContext();

  return useMemo(() => {
    return resolveColorForReact(color, colorContext);
  }, [color, colorContext]);
}

/**
 * Resolve color without using React context.
 * Useful for non-component contexts or testing.
 *
 * @param color - Color domain object
 * @param colorContext - Color resolution context
 * @returns Resolved color result
 */
export function resolveColorForReact(
  color: Color | undefined,
  colorContext: ColorContext | undefined,
): ResolvedColorResult {
  if (!color) {
    return {
      hex: undefined,
      cssColor: "transparent",
      alpha: 1,
      isResolved: false,
    };
  }

  const hex = resolveColor(color, colorContext);
  const alpha = extractAlpha(color.transform);

  if (!hex) {
    return {
      hex: undefined,
      cssColor: "transparent",
      alpha,
      isResolved: false,
    };
  }

  return {
    hex,
    cssColor: `#${hex}`,
    alpha,
    isResolved: true,
  };
}
