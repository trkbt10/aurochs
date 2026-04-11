/**
 * @file Chart content renderer for GraphicFrame
 *
 * Renders chart content within a graphic frame using useChartSvg.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import { memo } from "react";
import type { ChartReference } from "@aurochs-office/pptx/domain";
import { useChartSvg } from "./useChartSvg";
import { Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for ChartContent component
 */
export type ChartContentProps = ContentProps<ChartReference>;

/**
 * Renders chart content within a GraphicFrame.
 */
export const ChartContent = memo(function ChartContent({ data, width, height }: ChartContentProps) {
  const { content, hasContent } = useChartSvg(data, width, height);

  if (!hasContent || content === null) {
    return <Placeholder width={width} height={height} label="Chart" />;
  }

  return <g>{content}</g>;
});
