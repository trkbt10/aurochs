/**
 * @file AutoFilter button overlay
 *
 * Renders autoFilter dropdown buttons overlaid on the header row cells.
 * In Excel, these buttons appear on the actual data cells of the first row
 * of the autoFilter range, not on the column header strip (A, B, C...).
 *
 * Positioned as a sibling to cell-viewport in sheet-grid-layers.tsx,
 * inside its own overflow:hidden container with the same bounds.
 * Uses viewport-relative coordinates (offset - scroll) for positioning.
 */

import { useMemo, type ReactNode } from "react";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import { columnLetterToIndex } from "@aurochs-office/xlsx/domain/cell/address";
import type { SheetLayout } from "../../selectors/sheet-layout";
import { AutoFilterButton } from "./auto-filter-button";

export type AutoFilterOverlayProps = {
  readonly autoFilter: XlsxAutoFilter;
  readonly layout: SheetLayout;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly onButtonClick: (col1: number, buttonElement: HTMLElement) => void;
};

/**
 * Extract 1-based column index from a sortCondition ref string like "A2:A58".
 */
function sortConditionCol1(ref: string): number | undefined {
  const match = ref.match(/^(\$?)([A-Z]+)/);
  if (!match) return undefined;
  return columnLetterToIndex(match[2]) as number;
}

export function AutoFilterOverlay({
  autoFilter,
  layout,
  scrollTop,
  scrollLeft,
  onButtonClick,
}: AutoFilterOverlayProps) {
  const startCol = autoFilter.ref.start.col as number;
  const endCol = autoFilter.ref.end.col as number;
  const headerRow = autoFilter.ref.start.row as number;
  const headerRow0 = headerRow - 1;

  const sortDirectionByCol1 = useMemo(() => {
    const map = new Map<number, "ascending" | "descending">();
    if (autoFilter.sortState?.sortConditions) {
      for (const sc of autoFilter.sortState.sortConditions) {
        const col = sortConditionCol1(sc.ref);
        if (col !== undefined) {
          map.set(col, sc.descending ? "descending" : "ascending");
        }
      }
    }
    return map;
  }, [autoFilter.sortState]);

  const nodes: ReactNode[] = [];

  for (let col1 = startCol; col1 <= endCol; col1++) {
    const col0 = col1 - 1;
    const relativeColId = col1 - startCol;

    const fc = autoFilter.filterColumns?.find((c) => (c.colId as number) === relativeColId);
    if (fc?.hiddenButton === true) continue;

    const cellWidth = layout.cols.getSizePx(col0);
    const cellHeight = layout.rows.getSizePx(headerRow0);
    if (cellWidth <= 0 || cellHeight <= 0) continue;

    // Viewport-relative coordinates
    const left = layout.cols.getOffsetPx(col0) - scrollLeft;
    const top = layout.rows.getOffsetPx(headerRow0) - scrollTop;

    const hasActiveFilter = fc?.filter !== undefined;
    const sortDirection = sortDirectionByCol1.get(col1);

    nodes.push(
      <div
        key={`af-btn-${col1}`}
        data-testid={`auto-filter-cell-${col1}`}
        style={{
          position: "absolute",
          left,
          top,
          width: cellWidth,
          height: cellHeight,
        }}
      >
        <AutoFilterButton
          hasActiveFilter={hasActiveFilter}
          sortDirection={sortDirection}
          onClick={(el) => onButtonClick(col1, el)}
        />
      </div>,
    );
  }

  return (
    <div
      data-testid="auto-filter-overlay"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {nodes}
    </div>
  );
}
