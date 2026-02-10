/**
 * @file FormulaReferenceOverlay
 *
 * Renders colored borders on cells/ranges referenced in the formula being edited.
 * Only shows references that belong to the currently active sheet.
 * Uses the 8-color cycle from formula-reference-colors.
 */

import { useMemo, type CSSProperties } from "react";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { getReferenceColor } from "../../formula-edit/formula-reference-colors";
import type { FormulaReferenceToken } from "../../formula-edit/types";
import { getSelectedRangeRect, clipRectToViewport, type CellRect } from "./selection-geometry";

export type FormulaReferenceOverlayProps = {
  readonly references: readonly FormulaReferenceToken[];
  /** Name of the currently active (visible) sheet */
  readonly activeSheetName: string;
  /** Name of the sheet where editing started — unqualified refs belong to this sheet */
  readonly editingSheetName: string | undefined;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
};

type VisibleRefRect = {
  readonly key: string;
  readonly rect: CellRect;
  readonly color: string;
};

/**
 * Overlay that renders colored borders on formula-referenced cells/ranges.
 */
export function FormulaReferenceOverlay({
  references,
  activeSheetName,
  editingSheetName,
  layout,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
}: FormulaReferenceOverlayProps) {
  const visibleRefs = useMemo(() => {
    const results: VisibleRefRect[] = [];
    // The sheet that unqualified refs belong to (editing sheet, or active sheet as fallback)
    const unqualifiedSheet = editingSheetName ?? activeSheetName;

    for (const ref of references) {
      if (ref.sheetName === undefined) {
        // Unqualified ref belongs to the editing sheet — only show when viewing that sheet
        if (activeSheetName !== unqualifiedSheet) {
          continue;
        }
      } else {
        // Qualified ref — show only on the explicitly named sheet
        if (ref.sheetName !== activeSheetName) {
          continue;
        }
      }

      const rawRect = getSelectedRangeRect({ range: ref.range, layout, scrollTop, scrollLeft });
      const clipped = clipRectToViewport(rawRect, viewportWidth, viewportHeight);
      if (!clipped) {
        continue;
      }

      results.push({
        key: `ref-${ref.startOffset}-${ref.endOffset}`,
        rect: clipped,
        color: getReferenceColor(ref.colorIndex),
      });
    }

    return results;
  }, [activeSheetName, editingSheetName, layout, references, scrollLeft, scrollTop, viewportHeight, viewportWidth]);

  if (visibleRefs.length === 0) {
    return null;
  }

  return (
    <>
      {visibleRefs.map((vr) => (
        <div
          key={vr.key}
          data-testid="xlsx-formula-ref-highlight"
          style={refHighlightStyle(vr.rect, vr.color)}
        />
      ))}
    </>
  );
}

function refHighlightStyle(rect: CellRect, color: string): CSSProperties {
  return {
    position: "absolute",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    border: `2px solid ${color}`,
    backgroundColor: `${color}18`, // 10% opacity fill
    boxSizing: "border-box",
    pointerEvents: "none",
  };
}
