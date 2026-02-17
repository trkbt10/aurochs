/**
 * @file Frozen panes overlay layer
 *
 * Renders frozen rows and columns that stay visible during scrolling.
 * Implements Excel-like freeze panes behavior.
 */

import { useMemo, type CSSProperties } from "react";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { FormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { SheetLayout } from "../../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../../sheet/merge-range";
import { XlsxSheetGridCellsLayer } from "./cells-layer";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type FrozenPanesLayerProps = {
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: SheetLayout;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly formulaEvaluator: FormulaEvaluator;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly rowHeaderWidthPx: number;
  readonly colHeaderHeightPx: number;
  readonly frozenRowCount: number;
  readonly frozenColCount: number;
  /** Visible row range from the main viewport (for performance) */
  readonly visibleRowRange: { start: number; end: number };
  /** Visible column range from the main viewport (for performance) */
  readonly visibleColRange: { start: number; end: number };
};

/**
 * Layer that renders frozen rows and columns.
 *
 * Creates up to 3 additional rendering areas:
 * - Frozen rows (top strip that doesn't scroll vertically)
 * - Frozen columns (left strip that doesn't scroll horizontally)
 * - Frozen corner (top-left that doesn't scroll at all)
 */
export function FrozenPanesLayer({
  sheetIndex,
  sheet,
  styles,
  layout,
  normalizedMerges,
  formulaEvaluator,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  rowHeaderWidthPx,
  colHeaderHeightPx,
  frozenRowCount,
  frozenColCount,
  visibleRowRange,
  visibleColRange,
}: FrozenPanesLayerProps) {
  // Calculate frozen dimensions
  const frozenRowsHeight = useMemo(() => {
    if (frozenRowCount === 0) return 0;
    // Use getBoundaryOffsetPx to get the offset at the boundary (end of frozen rows)
    return layout.rows.getBoundaryOffsetPx(frozenRowCount);
  }, [frozenRowCount, layout.rows]);

  const frozenColsWidth = useMemo(() => {
    if (frozenColCount === 0) return 0;
    // Use getBoundaryOffsetPx to get the offset at the boundary (end of frozen cols)
    return layout.cols.getBoundaryOffsetPx(frozenColCount);
  }, [frozenColCount, layout.cols]);

  if (frozenRowCount === 0 && frozenColCount === 0) {
    return null;
  }

  const frozenBorderColor = colorTokens.border.strong;

  // Common styles
  const frozenPaneStyle: CSSProperties = {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: colorTokens.background.primary,
    zIndex: 10,
  };

  return (
    <>
      {/* Frozen corner (top-left, doesn't scroll at all) */}
      {frozenRowCount > 0 && frozenColCount > 0 && (
        <div
          style={{
            ...frozenPaneStyle,
            left: rowHeaderWidthPx,
            top: colHeaderHeightPx,
            width: frozenColsWidth,
            height: frozenRowsHeight,
            zIndex: 12,
            borderRight: `2px solid ${frozenBorderColor}`,
            borderBottom: `2px solid ${frozenBorderColor}`,
          }}
        >
          <XlsxSheetGridCellsLayer
            sheetIndex={sheetIndex}
            sheet={sheet}
            styles={styles}
            layout={layout}
            rowRange={{ start: 0, end: frozenRowCount - 1 }}
            colRange={{ start: 0, end: frozenColCount - 1 }}
            scrollTop={0}
            scrollLeft={0}
            normalizedMerges={normalizedMerges}
            formulaEvaluator={formulaEvaluator}
          />
        </div>
      )}

      {/* Frozen rows (top strip, scrolls horizontally only) */}
      {frozenRowCount > 0 && (
        <div
          style={{
            ...frozenPaneStyle,
            left: rowHeaderWidthPx + (frozenColCount > 0 ? frozenColsWidth : 0),
            top: colHeaderHeightPx,
            width: viewportWidth - rowHeaderWidthPx - (frozenColCount > 0 ? frozenColsWidth : 0),
            height: frozenRowsHeight,
            zIndex: 11,
            borderBottom: `2px solid ${frozenBorderColor}`,
          }}
        >
          {/* Offset to account for frozen columns area */}
          <div
            style={{
              position: "absolute",
              left: -frozenColsWidth,
              top: 0,
            }}
          >
            <XlsxSheetGridCellsLayer
              sheetIndex={sheetIndex}
              sheet={sheet}
              styles={styles}
              layout={layout}
              rowRange={{ start: 0, end: frozenRowCount - 1 }}
              colRange={{ start: Math.max(frozenColCount, visibleColRange.start), end: visibleColRange.end }}
              scrollTop={0}
              scrollLeft={scrollLeft}
              normalizedMerges={normalizedMerges}
              formulaEvaluator={formulaEvaluator}
            />
          </div>
        </div>
      )}

      {/* Frozen columns (left strip, scrolls vertically only) */}
      {frozenColCount > 0 && (
        <div
          style={{
            ...frozenPaneStyle,
            left: rowHeaderWidthPx,
            top: colHeaderHeightPx + (frozenRowCount > 0 ? frozenRowsHeight : 0),
            width: frozenColsWidth,
            height: viewportHeight - colHeaderHeightPx - (frozenRowCount > 0 ? frozenRowsHeight : 0),
            zIndex: 11,
            borderRight: `2px solid ${frozenBorderColor}`,
          }}
        >
          {/* Offset to account for frozen rows area */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -frozenRowsHeight,
            }}
          >
            <XlsxSheetGridCellsLayer
              sheetIndex={sheetIndex}
              sheet={sheet}
              styles={styles}
              layout={layout}
              rowRange={{ start: Math.max(frozenRowCount, visibleRowRange.start), end: visibleRowRange.end }}
              colRange={{ start: 0, end: frozenColCount - 1 }}
              scrollTop={scrollTop}
              scrollLeft={0}
              normalizedMerges={normalizedMerges}
              formulaEvaluator={formulaEvaluator}
            />
          </div>
        </div>
      )}
    </>
  );
}
