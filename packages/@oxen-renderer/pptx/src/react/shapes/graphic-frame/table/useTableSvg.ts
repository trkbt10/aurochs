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
import type { Table } from "@oxen-office/pptx/domain/table/types";
import { px } from "@oxen-office/ooxml/domain/units";
import { useRenderContext } from "../../../context";
import { renderTableSvg } from "../../../../svg/table";
import { createDefsCollector } from "../../../../svg/slide-utils";
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
  const renderCtx = useRenderContext();
  const { colorContext, options, tableStyles, resources, resourceStore, fontScheme, warnings, slideSize, resolvedBackground, layoutShapes } = renderCtx;

  return useMemo(() => {
    if (table === undefined) {
      return { svg: null, hasContent: false };
    }

    const defsCollector = createDefsCollector();
    const svg = renderTableSvg(
      table,
      px(width),
      px(height),
      renderCtx,
      defsCollector,
      renderCtx.options,
      renderCtx.tableStyles,
    );

    return { svg: defsCollector.toDefsElement() + svg, hasContent: true };
  }, [
    table,
    width,
    height,
    colorContext,
    options,
    tableStyles,
    resources,
    resourceStore,
    fontScheme,
    warnings,
    slideSize,
    resolvedBackground,
    layoutShapes,
  ]);
}
