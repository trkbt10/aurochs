/**
 * @file Hook for table SVG generation
 *
 * Encapsulates context extraction and SVG generation for tables.
 * This hook ensures correct parameters are always passed to renderTableSvg,
 * preventing bugs like passing the wrong context properties.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import { useMemo } from "react";
import type { Table } from "../../../../../domain/table/types";
import { px } from "../../../../../domain/types";
import { useRenderContext } from "../../../context";
import { renderTableSvg } from "../../../../svg/table";
import type { SvgResult } from "../types";

/**
 * Hook to render table to SVG string.
 *
 * Encapsulates context extraction to prevent incorrect parameter passing.
 * The bug that occurred was passing renderCtx instead of renderCtx.colorContext
 * to renderTableSvg - this hook ensures correct context is always used.
 *
 * @param table - Table domain object (may be undefined)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns SVG result with content flag
 */
export function useTableSvg(
  table: Table | undefined,
  width: number,
  height: number,
): SvgResult {
  // Extract only the required context properties
  // This encapsulation prevents bugs where wrong properties are passed
  const { colorContext, options, tableStyles } = useRenderContext();

  return useMemo(() => {
    if (table === undefined) {
      return { svg: null, hasContent: false };
    }

    const svg = renderTableSvg(
      table,
      px(width),
      px(height),
      colorContext,
      options,
      tableStyles,
    );

    return { svg, hasContent: true };
  }, [table, width, height, colorContext, options, tableStyles]);
}
