/**
 * @file Chart content renderer for GraphicFrame
 *
 * Renders chart content within a graphic frame using the useChartSvg hook
 * for context extraction and SVG generation.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import { memo } from "react";
import type { ChartReference } from "@oxen-office/pptx/domain";
import { useChartSvg } from "./useChartSvg";
import { SvgInnerHtml, Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for ChartContent component
 */
export type ChartContentProps = ContentProps<ChartReference>;

/**
 * Renders chart content within a GraphicFrame.
 *
 * Uses useChartSvg hook to encapsulate context extraction,
 * ensuring correct parameters are passed to the SVG renderer.
 */
export const ChartContent = memo(function ChartContent({
  data,
  width,
  height,
}: ChartContentProps) {
  const { svg, hasContent } = useChartSvg(data, width, height);

  if (!hasContent || svg === null) {
    return <Placeholder width={width} height={height} label="Chart" />;
  }

  return <SvgInnerHtml html={svg} />;
});
