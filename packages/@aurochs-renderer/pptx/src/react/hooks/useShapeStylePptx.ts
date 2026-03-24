/**
 * @file PPTX-specific shape style hook
 *
 * Wraps the format-agnostic useShapeStyle from drawing-ml
 * to accept PPTX-specific BaseFill and Line types.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44 (spPr)
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { Effects } from "@aurochs-office/pptx/domain/effects";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import {
  resolveFill,
  resolveLine,
  type ResolvedLine as PptxResolvedLine,
} from "@aurochs-office/pptx/domain/color/fill";
import type { ResolvedLine as OoxmlResolvedLine } from "@aurochs-office/drawing-ml/domain/resolved-fill";
import { useShapeStyle as useShapeStyleBase, type ShapeStyleResult } from "@aurochs-renderer/drawing-ml/react";
import { useRenderContext, useRenderResourceStore } from "../context";

// =============================================================================
// Types
// =============================================================================

/**
 * PPTX-specific shape style input properties
 *
 * Accepts PPTX BaseFill and Line types directly.
 * These are resolved internally using the render context.
 */
export type PptxShapeStyleInput = {
  /** PPTX fill (solidFill, gradientFill, etc.) */
  readonly fill?: BaseFill;
  /** PPTX line/stroke */
  readonly line?: BaseLine;
  /** Effects definition */
  readonly effects?: Effects;
  /** Shape width in pixels (for pattern fills) */
  readonly width?: number;
  /** Shape height in pixels (for pattern fills) */
  readonly height?: number;
};

// =============================================================================
// Converters
// =============================================================================

/**
 * Resolve fill if defined.
 */
function resolveFillIfDefined(
  fill: BaseFill | undefined,
  colorContext: ColorContext | undefined,
  resourceResolver: (resourceId: string) => string | undefined,
) {
  if (fill === undefined) {
    return undefined;
  }
  return resolveFill(fill, colorContext, resourceResolver);
}

/**
 * Resolve line if defined.
 */
function resolveLineIfDefined(line: BaseLine | undefined, colorContext: ColorContext | undefined) {
  if (line === undefined) {
    return undefined;
  }
  return resolveLine(line, colorContext);
}

/**
 * Convert PPTX line to OOXML format if defined.
 */
function convertLineIfDefined(line: PptxResolvedLine | undefined): OoxmlResolvedLine | undefined {
  if (line === undefined) {
    return undefined;
  }
  return convertResolvedLine(line);
}

/**
 * Flatten PPTX dash objects to OOXML flat array format.
 */
function flattenCustomDash(
  customDash: readonly { dashLength: number; spaceLength: number }[] | undefined,
): readonly number[] | undefined {
  if (customDash === undefined) {
    return undefined;
  }
  return customDash.flatMap((d) => [d.dashLength, d.spaceLength]);
}

/**
 * Convert PPTX ResolvedLine to OOXML ResolvedLine format.
 *
 * The main difference is customDash format:
 * - PPTX: { dashLength, spaceLength }[]
 * - OOXML: number[] (flat array [dash, space, dash, space, ...])
 */
function convertResolvedLine(pptxLine: PptxResolvedLine): OoxmlResolvedLine {
  const customDash = flattenCustomDash(pptxLine.customDash);

  return {
    fill: pptxLine.fill,
    width: pptxLine.width,
    cap: pptxLine.cap,
    join: pptxLine.join,
    dash: pptxLine.dash,
    customDash,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * PPTX-specific hook for shape styling.
 *
 * Accepts PPTX BaseFill and Line types directly and resolves them
 * using the render context before passing to the format-agnostic hook.
 *
 * @example
 * ```tsx
 * function PptxShape({ fill, line, effects }: Props) {
 *   const style = useShapeStyle({
 *     fill,
 *     line,
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
export function useShapeStyle(input: PptxShapeStyleInput): ShapeStyleResult {
  const { colorContext } = useRenderContext();
  const resourceStore = useRenderResourceStore();

  // ResourceStore is the single source of truth for resource resolution
  const resolveResource = (resourceId: string) => resourceStore.toDataUrl(resourceId);

  // Resolve PPTX types to format-agnostic types
  const resolvedFill = resolveFillIfDefined(input.fill, colorContext, resolveResource);
  const pptxResolvedLine = resolveLineIfDefined(input.line, colorContext);
  const resolvedLine = convertLineIfDefined(pptxResolvedLine);

  // Pass to format-agnostic hook
  return useShapeStyleBase({
    resolvedFill,
    resolvedLine,
    effects: input.effects,
    width: input.width,
    height: input.height,
  });
}
