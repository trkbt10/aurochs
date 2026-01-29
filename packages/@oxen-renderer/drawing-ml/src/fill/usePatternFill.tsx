/**
 * @file Pattern fill resolution hook for React
 *
 * Resolves PatternFill domain objects to SVG-ready data.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */

import { useMemo, type ReactNode } from "react";
import type { PatternFill } from "@oxen-office/ooxml/domain/fill";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";
import { useDrawingMLContext } from "../context";
import { useSvgDefs } from "../hooks/useSvgDefs";
import { PatternDef, isPatternSupported } from "./PatternDef";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of resolving a pattern fill
 */
export type PatternFillResult = {
  /** Whether the pattern is supported */
  readonly isSupported: boolean;
  /** SVG fill attribute value (url(#id) or fallback color) */
  readonly fill: string;
  /** Pattern definition element to render in <defs> */
  readonly defElement: ReactNode | undefined;
  /** Generated pattern ID */
  readonly patternId: string | undefined;
  /** Resolved foreground color hex */
  readonly fgColor: string | undefined;
  /** Resolved background color hex */
  readonly bgColor: string | undefined;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to resolve a PatternFill domain object to SVG-ready data.
 *
 * @param fill - Pattern fill domain object
 * @returns Resolved pattern fill result with SVG props and def element
 *
 * @example
 * ```tsx
 * function PatternShape({ fill }: { fill: PatternFill }) {
 *   const pattern = usePatternFill(fill);
 *   return (
 *     <>
 *       {pattern.defElement && <defs>{pattern.defElement}</defs>}
 *       <rect fill={pattern.fill} />
 *     </>
 *   );
 * }
 * ```
 */
export function usePatternFill(fill: PatternFill | undefined): PatternFillResult {
  const { colorContext } = useDrawingMLContext();
  const { getNextId } = useSvgDefs();

  return useMemo(() => {
    return resolvePatternFillForReact(fill, colorContext, getNextId);
  }, [fill, colorContext, getNextId]);
}

/**
 * Resolve pattern fill without using React context.
 * Useful for non-component contexts or testing.
 */
export function resolvePatternFillForReact(
  fill: PatternFill | undefined,
  colorContext: ColorContext | undefined,
  getNextId: (prefix: string) => string,
): PatternFillResult {
  if (!fill) {
    return {
      isSupported: false,
      fill: "none",
      defElement: undefined,
      patternId: undefined,
      fgColor: undefined,
      bgColor: undefined,
    };
  }

  // Resolve colors
  const fgColor = resolveColor(fill.foregroundColor, colorContext);
  const bgColor = resolveColor(fill.backgroundColor, colorContext);

  // Handle unresolved colors
  if (!fgColor || !bgColor) {
    return {
      isSupported: false,
      fill: bgColor ? `#${bgColor}` : "none",
      defElement: undefined,
      patternId: undefined,
      fgColor,
      bgColor,
    };
  }

  // Check if pattern is supported
  const supported = isPatternSupported(fill.preset);

  // Generate pattern ID
  const patternId = getNextId("pattern");

  // Create def element
  const defElement = (
    <PatternDef
      id={patternId}
      preset={fill.preset}
      fgColor={fgColor}
      bgColor={bgColor}
    />
  );

  return {
    isSupported: supported,
    fill: `url(#${patternId})`,
    defElement,
    patternId,
    fgColor,
    bgColor,
  };
}

/**
 * Get all supported pattern types.
 */
export { getSupportedPatterns } from "./PatternDef";

/**
 * Check if a pattern type is supported.
 */
export { isPatternSupported } from "./PatternDef";
