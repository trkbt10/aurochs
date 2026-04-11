/**
 * @file Hook for table rendering
 *
 * Encapsulates context extraction, table SVG generation, and conversion
 * to React elements. Returns ReactNode ready for rendering.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import { useMemo, type ReactNode } from "react";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { useRenderContext } from "../../../context";
import { renderTableSvg } from "../../../../svg/table";
import { createDefsCollector } from "../../../../svg/slide-utils";
import { parseSvgFragment } from "../../../../svg/svg-parse";
import { svgChildrenToJsx } from "../../../../svg/svg-to-jsx";

/**
 * Result of table rendering hook.
 *
 * Returns React nodes (not SVG strings) — the content is already
 * parsed and converted to React elements within the hook.
 */
export type TableSvgResult = {
  /** React elements representing the table SVG content, or null if no content */
  readonly content: ReactNode;
  /** Whether table content was successfully generated */
  readonly hasContent: boolean;
};

/**
 * Hook to render table as React elements.
 *
 * Renders the table domain object via the SVG table renderer and
 * returns the result as React elements.
 *
 * @param table - Table domain object (may be undefined)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns React elements and content flag
 */
export function useTableSvg(table: Table | undefined, width: number, height: number): TableSvgResult {
  const renderCtx = useRenderContext();
  const {
    colorContext,
    options,
    tableStyles,
    resourceStore,
    fontScheme,
    warnings,
    slideSize,
    resolvedBackground,
    layoutShapes,
  } = renderCtx;

  return useMemo(() => {
    if (table === undefined) {
      return { content: null, hasContent: false };
    }

    const defsCollector = createDefsCollector();
    const tableSvgString = renderTableSvg({
      table,
      frameWidth: px(width),
      frameHeight: px(height),
      ctx: renderCtx,
      defsCollector,
      options: renderCtx.options,
      tableStyles: renderCtx.tableStyles,
    });

    // renderTableSvg returns an SVG fragment (no outer <svg> wrapper).
    // defsCollector.toDefsElement() returns <defs>...</defs> or "".
    // Together they form a multi-root SVG fragment.
    const combinedFragment = defsCollector.toDefsElement() + tableSvgString;

    const nodes = parseSvgFragment(combinedFragment);
    const content = svgChildrenToJsx(nodes, "table");
    return { content, hasContent: true };
  }, [
    table,
    width,
    height,
    colorContext,
    options,
    tableStyles,
    resourceStore,
    fontScheme,
    warnings,
    slideSize,
    resolvedBackground,
    layoutShapes,
  ]);
}
