/**
 * @file Diagram content renderer for GraphicFrame
 *
 * Renders diagram content within a graphic frame using the useDiagramSvg hook
 * for context extraction and SVG generation.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import { memo } from "react";
import type { DiagramReference } from "../../../../../domain";
import { useDiagramSvg } from "./useDiagramSvg";
import { SvgInnerHtml, Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for DiagramContent component
 */
export type DiagramContentProps = ContentProps<DiagramReference>;

/**
 * Renders diagram content within a GraphicFrame.
 *
 * Uses useDiagramSvg hook to encapsulate context extraction,
 * ensuring correct parameters are passed to the SVG renderer.
 */
export const DiagramContent = memo(function DiagramContent({
  data,
  width,
  height,
}: DiagramContentProps) {
  const { svg, hasContent } = useDiagramSvg(data, width, height);

  if (!hasContent || svg === null) {
    return <Placeholder width={width} height={height} label="Diagram" />;
  }

  return <SvgInnerHtml html={svg} />;
});
