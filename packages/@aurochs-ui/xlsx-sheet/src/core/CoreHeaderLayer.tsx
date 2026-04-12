/**
 * @file Core header layer
 *
 * Renders read-only row and column headers (A,B,C... / 1,2,3...).
 * No interactive behavior (resize, selection, context menus).
 *
 * Used by the viewer. The editor has its own interactive header layer
 * that adds resize handles, selection highlights, and context menus.
 *
 * Context-free: all data is passed via props.
 */

import { useMemo, type CSSProperties } from "react";
import { colorTokens } from "@aurochs-ui/ui-components";
import { indexToColumnLetter } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx } from "@aurochs-office/xlsx/domain/types";
import type { SheetLayout } from "../selectors/sheet-layout";
import type { VisibleRange } from "./types";

export type CoreHeaderLayerProps = {
  readonly layout: SheetLayout;
  readonly rowRange: VisibleRange;
  readonly colRange: VisibleRange;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  /** Width of the row header gutter (row numbers) in pixels */
  readonly rowHeaderWidthPx: number;
  /** Height of the column header gutter (A, B, C...) in pixels */
  readonly colHeaderHeightPx: number;
};

/**
 * Base style for header cells.
 *
 * Uses CSS custom properties with fallbacks so that the editor's theme
 * variables (--text-secondary, --bg-tertiary, --border-primary) take
 * effect when present, while the viewer gets sensible defaults.
 *
 * This is the single source of truth for header cell appearance.
 * The editor's interactive header layer imports this style and adds
 * selection highlights and resize handles on top.
 */
export const headerCellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  fontSize: 12,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRight: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderBottom: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
};

/**
 * Renders read-only row and column headers.
 *
 * Column headers display letters (A, B, C...) at the top.
 * Row headers display numbers (1, 2, 3...) on the left.
 * The top-left corner cell fills the intersection.
 */
export function CoreHeaderLayer({
  layout,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  rowHeaderWidthPx,
  colHeaderHeightPx,
}: CoreHeaderLayerProps) {
  const colHeaders = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    for (let col0 = colRange.start; col0 <= colRange.end; col0++) {
      const width = layout.cols.getSizePx(col0);
      if (width <= 0) { continue; }
      nodes.push(
        <div
          key={`col-${col0}`}
          style={{
            ...headerCellBaseStyle,
            position: "absolute",
            left: rowHeaderWidthPx + layout.cols.getOffsetPx(col0) - scrollLeft,
            top: 0,
            width,
            height: colHeaderHeightPx,
          }}
        >
          {indexToColumnLetter(colIdx(col0 + 1))}
        </div>,
      );
    }
    return nodes;
  }, [colRange, layout.cols, scrollLeft, rowHeaderWidthPx, colHeaderHeightPx]);

  const rowHeaders = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    for (let row0 = rowRange.start; row0 <= rowRange.end; row0++) {
      const height = layout.rows.getSizePx(row0);
      if (height <= 0) { continue; }
      nodes.push(
        <div
          key={`row-${row0}`}
          style={{
            ...headerCellBaseStyle,
            position: "absolute",
            left: 0,
            top: colHeaderHeightPx + layout.rows.getOffsetPx(row0) - scrollTop,
            width: rowHeaderWidthPx,
            height,
          }}
        >
          {row0 + 1}
        </div>,
      );
    }
    return nodes;
  }, [rowRange, layout.rows, scrollTop, rowHeaderWidthPx, colHeaderHeightPx]);

  return (
    <>
      {/* Top-left corner */}
      <div
        style={{
          ...headerCellBaseStyle,
          position: "absolute",
          left: 0,
          top: 0,
          width: rowHeaderWidthPx,
          height: colHeaderHeightPx,
          zIndex: 2,
        }}
      />
      {colHeaders}
      {rowHeaders}
    </>
  );
}
