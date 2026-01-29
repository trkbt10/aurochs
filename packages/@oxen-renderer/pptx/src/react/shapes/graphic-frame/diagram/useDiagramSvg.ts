/**
 * @file Hook for diagram SVG generation
 *
 * Encapsulates context extraction and SVG generation for diagrams.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import { useMemo } from "react";
import type { DiagramReference } from "@oxen-office/pptx/domain";
import { useRenderContext } from "../../../context";
import { renderDiagramShapesSvg } from "../../../../svg/slide-shapes";
import type { SvgResult } from "../types";

/**
 * Hook to render diagram to SVG string.
 *
 * Encapsulates context extraction to ensure correct parameters
 * are passed to renderDiagramShapesSvg.
 *
 * @param diagramData - Diagram reference data
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns SVG result with content flag
 */
export function useDiagramSvg(
  diagramData: DiagramReference | undefined,
  width: number,
  height: number,
): SvgResult {
  // Get full render context for diagram rendering
  const ctx = useRenderContext();

  return useMemo(() => {
    if (diagramData === undefined) {
      return { svg: null, hasContent: false };
    }

    const svg = renderDiagramShapesSvg(
      diagramData,
      width,
      height,
      ctx,
    );

    return { svg: svg ?? null, hasContent: svg !== undefined };
  }, [diagramData, width, height, ctx]);
}
