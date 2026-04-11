/**
 * @file Table content renderer for GraphicFrame
 *
 * Renders table content within a graphic frame using useTableSvg.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import { memo } from "react";
import type { TableReference } from "@aurochs-office/pptx/domain";
import { useTableSvg } from "./useTableSvg";
import { Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for TableContent component
 */
export type TableContentProps = ContentProps<TableReference>;

/**
 * Renders table content within a GraphicFrame.
 */
export const TableContent = memo(function TableContent({ data, width, height }: TableContentProps) {
  const { content, hasContent } = useTableSvg(data.table, width, height);

  if (!hasContent || content === null) {
    return <Placeholder width={width} height={height} label="Table" />;
  }

  return <g>{content}</g>;
});
