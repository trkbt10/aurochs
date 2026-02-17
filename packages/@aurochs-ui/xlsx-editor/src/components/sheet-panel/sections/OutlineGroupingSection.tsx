/**
 * @file Outline Grouping section
 *
 * Section for managing row and column grouping (outlining).
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { RowIndex, ColIndex } from "@aurochs-office/xlsx/domain/types";
import { rowIdx, colIdx } from "@aurochs-office/xlsx/domain/types";

export type OutlineGroupingSectionProps = {
  readonly disabled: boolean;
  readonly sheet: XlsxWorksheet;
  readonly selectedRange: CellRange | undefined;
  readonly onGroupRows: (startRow: RowIndex, count: number) => void;
  readonly onUngroupRows: (startRow: RowIndex, count: number) => void;
  readonly onGroupColumns: (startCol: ColIndex, count: number) => void;
  readonly onUngroupColumns: (startCol: ColIndex, count: number) => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const sectionStyle: CSSProperties = {
  marginTop: spacingTokens.md,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
  marginBottom: spacingTokens.xs,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
  flexWrap: "wrap",
};

const statusStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
  marginTop: spacingTokens.xs,
};

const outlineInfoStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  padding: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  marginBottom: spacingTokens.sm,
};

/**
 * Get the maximum outline level in the selected row range
 */
function getMaxRowOutlineLevel(sheet: XlsxWorksheet, startRow: number, endRow: number): number {
  let maxLevel = 0;
  for (let i = startRow; i <= endRow; i++) {
    const row = sheet.rows.find((r) => r.rowNumber === rowIdx(i));
    if (row?.outlineLevel !== undefined && row.outlineLevel > maxLevel) {
      maxLevel = row.outlineLevel;
    }
  }
  return maxLevel;
}

/**
 * Get the maximum outline level in the selected column range
 */
function getMaxColumnOutlineLevel(sheet: XlsxWorksheet, startCol: number, endCol: number): number {
  let maxLevel = 0;
  for (let i = startCol; i <= endCol; i++) {
    const colDef = sheet.columns?.find((c) => c.min <= colIdx(i) && c.max >= colIdx(i));
    if (colDef?.outlineLevel !== undefined && colDef.outlineLevel > maxLevel) {
      maxLevel = colDef.outlineLevel;
    }
  }
  return maxLevel;
}

/**
 * Outline Grouping section for managing row/column groups.
 */
export function OutlineGroupingSection({
  disabled,
  sheet,
  selectedRange,
  onGroupRows,
  onUngroupRows,
  onGroupColumns,
  onUngroupColumns,
}: OutlineGroupingSectionProps) {
  const hasSelection = selectedRange !== undefined;

  // Calculate selected row and column ranges
  const selectedRowRange = useMemo(() => {
    if (!selectedRange) return null;
    return {
      start: selectedRange.start.row,
      end: selectedRange.end.row,
      count: selectedRange.end.row - selectedRange.start.row + 1,
    };
  }, [selectedRange]);

  const selectedColRange = useMemo(() => {
    if (!selectedRange) return null;
    return {
      start: selectedRange.start.col,
      end: selectedRange.end.col,
      count: selectedRange.end.col - selectedRange.start.col + 1,
    };
  }, [selectedRange]);

  // Get current outline levels
  const rowOutlineLevel = useMemo(() => {
    if (!selectedRowRange) return 0;
    return getMaxRowOutlineLevel(sheet, selectedRowRange.start, selectedRowRange.end);
  }, [sheet, selectedRowRange]);

  const colOutlineLevel = useMemo(() => {
    if (!selectedColRange) return 0;
    return getMaxColumnOutlineLevel(sheet, selectedColRange.start, selectedColRange.end);
  }, [sheet, selectedColRange]);

  // Check if sheet has any grouping
  const hasAnyGrouping = useMemo(() => {
    const hasRowGrouping = sheet.rows.some((r) => r.outlineLevel !== undefined && r.outlineLevel > 0);
    const hasColGrouping = sheet.columns?.some((c) => c.outlineLevel !== undefined && c.outlineLevel > 0) ?? false;
    return hasRowGrouping || hasColGrouping;
  }, [sheet]);

  const handleGroupRows = useCallback(() => {
    if (!selectedRowRange) return;
    onGroupRows(rowIdx(selectedRowRange.start), selectedRowRange.count);
  }, [selectedRowRange, onGroupRows]);

  const handleUngroupRows = useCallback(() => {
    if (!selectedRowRange) return;
    onUngroupRows(rowIdx(selectedRowRange.start), selectedRowRange.count);
  }, [selectedRowRange, onUngroupRows]);

  const handleGroupColumns = useCallback(() => {
    if (!selectedColRange) return;
    onGroupColumns(colIdx(selectedColRange.start), selectedColRange.count);
  }, [selectedColRange, onGroupColumns]);

  const handleUngroupColumns = useCallback(() => {
    if (!selectedColRange) return;
    onUngroupColumns(colIdx(selectedColRange.start), selectedColRange.count);
  }, [selectedColRange, onUngroupColumns]);

  const rowLabel = selectedRowRange
    ? selectedRowRange.count === 1
      ? `Row ${selectedRowRange.start + 1}`
      : `Rows ${selectedRowRange.start + 1}-${selectedRowRange.end + 1}`
    : "No selection";

  const colLabel = selectedColRange
    ? selectedColRange.count === 1
      ? `Column ${String.fromCharCode(65 + selectedColRange.start)}`
      : `Columns ${String.fromCharCode(65 + selectedColRange.start)}-${String.fromCharCode(65 + selectedColRange.end)}`
    : "No selection";

  return (
    <Accordion title="Outline Grouping" defaultExpanded={hasAnyGrouping}>
      <div style={descriptionStyle}>
        Group rows or columns to create collapsible sections.
      </div>

      {hasAnyGrouping && (
        <div style={outlineInfoStyle}>
          Outline grouping is active. Use Data → Group/Ungroup in Excel for collapse controls.
        </div>
      )}

      {!hasSelection && (
        <div style={statusStyle}>
          Select cells to group or ungroup rows/columns.
        </div>
      )}

      {hasSelection && (
        <>
          {/* Row Grouping Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{rowLabel}</div>
            {rowOutlineLevel > 0 && (
              <div style={statusStyle}>Current outline level: {rowOutlineLevel}</div>
            )}
            <div style={buttonRowStyle}>
              <Button
                size="sm"
                disabled={disabled || rowOutlineLevel >= 7}
                onClick={handleGroupRows}
              >
                Group Rows
              </Button>
              <Button
                size="sm"
                disabled={disabled || rowOutlineLevel === 0}
                onClick={handleUngroupRows}
              >
                Ungroup Rows
              </Button>
            </div>
          </div>

          {/* Column Grouping Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{colLabel}</div>
            {colOutlineLevel > 0 && (
              <div style={statusStyle}>Current outline level: {colOutlineLevel}</div>
            )}
            <div style={buttonRowStyle}>
              <Button
                size="sm"
                disabled={disabled || colOutlineLevel >= 7}
                onClick={handleGroupColumns}
              >
                Group Columns
              </Button>
              <Button
                size="sm"
                disabled={disabled || colOutlineLevel === 0}
                onClick={handleUngroupColumns}
              >
                Ungroup Columns
              </Button>
            </div>
          </div>
        </>
      )}
    </Accordion>
  );
}
