/**
 * @file Table content renderer for GraphicFrame
 *
 * Renders table content within a graphic frame using the useTableSvg hook
 * for context extraction and SVG generation.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import { memo } from "react";
import type { TableReference } from "@oxen-office/pptx/domain";
import { useTableSvg } from "./useTableSvg";
import { SvgInnerHtml, Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for TableContent component
 */
export type TableContentProps = ContentProps<TableReference>;

/**
 * Renders table content within a GraphicFrame.
 *
 * Uses useTableSvg hook to encapsulate context extraction,
 * ensuring correct parameters are passed to the SVG renderer.
 */
export const TableContent = memo(function TableContent({
  data,
  width,
  height,
}: TableContentProps) {
  const { svg, hasContent } = useTableSvg(data.table, width, height);

  if (!hasContent || svg === null) {
    return <Placeholder width={width} height={height} label="Table" />;
  }

  return <SvgInnerHtml html={svg} />;
});
