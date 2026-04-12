/**
 * @file Core gridlines layer
 *
 * Renders merge-aware SVG gridlines for the visible viewport.
 * Shared by both the editor and viewer for consistent gridline rendering.
 *
 * Context-free: all data is passed via props.
 */

import { useMemo } from "react";
import { colorTokens } from "@aurochs-ui/ui-components";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { SheetLayout } from "../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../sheet/merge-range";
import { getVisibleGridLineSegments } from "../grid/gridline-geometry";
import type { VisibleRange } from "./types";

export type CoreGridlinesLayerProps = {
  readonly sheet: XlsxWorksheet;
  readonly layout: SheetLayout;
  readonly rowRange: VisibleRange;
  readonly colRange: VisibleRange;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly rowCount: number;
  readonly colCount: number;
};

/**
 * Renders merge-aware SVG gridlines for the visible viewport.
 *
 * Gridlines are suppressed inside merged cell regions, matching Excel behavior.
 * Returns null when gridlines are disabled via sheetView or viewport has no area.
 */
export function CoreGridlinesLayer({
  sheet,
  layout,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  normalizedMerges,
  rowCount,
  colCount,
}: CoreGridlinesLayerProps) {
  const gridLineSegments = useMemo(() => {
    if (sheet.sheetView?.showGridLines === false) {
      return { vertical: [], horizontal: [] } as const;
    }
    return getVisibleGridLineSegments({
      rowRange,
      colRange,
      layout,
      scrollTop,
      scrollLeft,
      viewportWidth,
      viewportHeight,
      normalizedMerges,
      rowCount,
      colCount,
    });
  }, [
    colRange,
    viewportHeight,
    viewportWidth,
    layout,
    colCount,
    rowCount,
    normalizedMerges,
    rowRange,
    scrollLeft,
    scrollTop,
    sheet.sheetView?.showGridLines,
  ]);

  if (sheet.sheetView?.showGridLines === false || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  return (
    <svg
      data-testid="xlsx-gridlines"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      width={viewportWidth}
      height={viewportHeight}
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
    >
      {gridLineSegments.vertical.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={`var(--border-primary, ${colorTokens.border.primary})`}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
      {gridLineSegments.horizontal.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={`var(--border-primary, ${colorTokens.border.primary})`}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
    </svg>
  );
}
