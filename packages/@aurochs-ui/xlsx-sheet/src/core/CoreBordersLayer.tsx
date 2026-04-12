/**
 * @file Core borders layer
 *
 * Renders cell borders as SVG line elements for the visible viewport.
 * Shared by both the editor and viewer for consistent border rendering.
 *
 * Context-free: all data is passed via props.
 */

import { useMemo } from "react";
import { colorTokens } from "@aurochs-ui/ui-components";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { SheetLayout } from "../selectors/sheet-layout";
import { buildBorderOverlayLines } from "../selectors/border-overlay";
import type { VisibleRange } from "./types";

export type CoreBordersLayerProps = {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: SheetLayout;
  readonly rowRange: VisibleRange;
  readonly colRange: VisibleRange;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly rowCount: number;
  readonly colCount: number;
};

/**
 * Renders cell borders as SVG line elements for the visible viewport.
 *
 * Supports all Excel border styles (thin, medium, thick, dashed, double, etc.)
 * via stroke-width and stroke-dasharray mapping from `buildBorderOverlayLines`.
 *
 * Returns null when there are no borders to render or the viewport has no area.
 */
export function CoreBordersLayer({
  sheet,
  styles,
  layout,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  rowCount,
  colCount,
}: CoreBordersLayerProps) {
  const borderLines = useMemo(() => {
    return buildBorderOverlayLines({
      sheet,
      styles,
      layout,
      rowRange,
      colRange,
      rowCount,
      colCount,
      scrollTop,
      scrollLeft,
      defaultBorderColor: `var(--border-primary, ${colorTokens.border.primary})`,
    });
  }, [colRange, layout, colCount, rowCount, rowRange, scrollLeft, scrollTop, sheet, styles]);

  if (borderLines.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  return (
    <svg
      data-testid="xlsx-borders"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      width={viewportWidth}
      height={viewportHeight}
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
    >
      {borderLines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          strokeDasharray={line.strokeDasharray}
          shapeRendering="crispEdges"
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
}
