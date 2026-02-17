/**
 * @file Row/Column Size section
 *
 * Section for adjusting row heights and column widths.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, FieldRow } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { RowIndex, ColIndex } from "@aurochs-office/xlsx/domain/types";
import { rowIdx, colIdx } from "@aurochs-office/xlsx/domain/types";

export type RowColumnSizeSectionProps = {
  readonly disabled: boolean;
  readonly sheet: XlsxWorksheet;
  readonly selectedRange: CellRange | undefined;
  readonly onSetRowHeight: (rowIndex: RowIndex, height: number) => void;
  readonly onSetColumnWidth: (colIndex: ColIndex, width: number) => void;
  readonly onHideRows: (startRow: RowIndex, count: number) => void;
  readonly onUnhideRows: (startRow: RowIndex, count: number) => void;
  readonly onHideColumns: (startCol: ColIndex, count: number) => void;
  readonly onUnhideColumns: (startCol: ColIndex, count: number) => void;
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

/** Default row height in points */
const DEFAULT_ROW_HEIGHT = 15;
/** Default column width in character units */
const DEFAULT_COLUMN_WIDTH = 8.43;

/**
 * Get the height of a row from the worksheet
 */
function getRowHeight(sheet: XlsxWorksheet, rowIndex: RowIndex): number | undefined {
  const row = sheet.rows.find((r) => r.rowNumber === rowIndex);
  return row?.height;
}

/**
 * Get the width of a column from the worksheet
 */
function getColumnWidth(sheet: XlsxWorksheet, colIndex: ColIndex): number | undefined {
  const colDef = sheet.columns?.find((c) => c.min <= colIndex && c.max >= colIndex);
  return colDef?.width;
}

/**
 * Row/Column Size adjustment section.
 */
export function RowColumnSizeSection({
  disabled,
  sheet,
  selectedRange,
  onSetRowHeight,
  onSetColumnWidth,
  onHideRows,
  onUnhideRows,
  onHideColumns,
  onUnhideColumns,
}: RowColumnSizeSectionProps) {
  const [draftRowHeight, setDraftRowHeight] = useState("");
  const [draftColWidth, setDraftColWidth] = useState("");

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

  // Get current row height (for single row selection)
  const currentRowHeight = useMemo(() => {
    if (!selectedRowRange || selectedRowRange.count !== 1) return undefined;
    return getRowHeight(sheet, rowIdx(selectedRowRange.start));
  }, [sheet, selectedRowRange]);

  // Get current column width (for single column selection)
  const currentColWidth = useMemo(() => {
    if (!selectedColRange || selectedColRange.count !== 1) return undefined;
    return getColumnWidth(sheet, colIdx(selectedColRange.start));
  }, [sheet, selectedColRange]);

  // Check if any selected rows are hidden
  const hasHiddenRows = useMemo(() => {
    if (!selectedRowRange) return false;
    for (let i = selectedRowRange.start; i <= selectedRowRange.end; i++) {
      const row = sheet.rows.find((r) => r.rowNumber === rowIdx(i));
      if (row?.hidden) return true;
    }
    return false;
  }, [sheet, selectedRowRange]);

  // Check if any selected columns are hidden
  const hasHiddenCols = useMemo(() => {
    if (!selectedColRange) return false;
    for (let i = selectedColRange.start; i <= selectedColRange.end; i++) {
      const colDef = sheet.columns?.find((c) => c.min <= colIdx(i) && c.max >= colIdx(i));
      if (colDef?.hidden) return true;
    }
    return false;
  }, [sheet, selectedColRange]);

  const handleApplyRowHeight = useCallback(() => {
    if (!selectedRowRange) return;
    const height = parseFloat(draftRowHeight);
    if (isNaN(height) || height < 0) return;

    for (let i = selectedRowRange.start; i <= selectedRowRange.end; i++) {
      onSetRowHeight(rowIdx(i), height);
    }
    setDraftRowHeight("");
  }, [selectedRowRange, draftRowHeight, onSetRowHeight]);

  const handleApplyColWidth = useCallback(() => {
    if (!selectedColRange) return;
    const width = parseFloat(draftColWidth);
    if (isNaN(width) || width < 0) return;

    for (let i = selectedColRange.start; i <= selectedColRange.end; i++) {
      onSetColumnWidth(colIdx(i), width);
    }
    setDraftColWidth("");
  }, [selectedColRange, draftColWidth, onSetColumnWidth]);

  const handleHideRows = useCallback(() => {
    if (!selectedRowRange) return;
    onHideRows(rowIdx(selectedRowRange.start), selectedRowRange.count);
  }, [selectedRowRange, onHideRows]);

  const handleUnhideRows = useCallback(() => {
    if (!selectedRowRange) return;
    onUnhideRows(rowIdx(selectedRowRange.start), selectedRowRange.count);
  }, [selectedRowRange, onUnhideRows]);

  const handleHideColumns = useCallback(() => {
    if (!selectedColRange) return;
    onHideColumns(colIdx(selectedColRange.start), selectedColRange.count);
  }, [selectedColRange, onHideColumns]);

  const handleUnhideColumns = useCallback(() => {
    if (!selectedColRange) return;
    onUnhideColumns(colIdx(selectedColRange.start), selectedColRange.count);
  }, [selectedColRange, onUnhideColumns]);

  const handleAutoFitRowHeight = useCallback(() => {
    if (!selectedRowRange) return;
    // Auto-fit sets to default height
    for (let i = selectedRowRange.start; i <= selectedRowRange.end; i++) {
      onSetRowHeight(rowIdx(i), DEFAULT_ROW_HEIGHT);
    }
  }, [selectedRowRange, onSetRowHeight]);

  const handleAutoFitColWidth = useCallback(() => {
    if (!selectedColRange) return;
    // Auto-fit sets to default width
    for (let i = selectedColRange.start; i <= selectedColRange.end; i++) {
      onSetColumnWidth(colIdx(i), DEFAULT_COLUMN_WIDTH);
    }
  }, [selectedColRange, onSetColumnWidth]);

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
    <Accordion title="Row/Column Size" defaultExpanded={false}>
      <div style={descriptionStyle}>
        Adjust the height of rows and width of columns in the selected range.
      </div>

      {!hasSelection && (
        <div style={statusStyle}>
          Select cells to adjust row height or column width.
        </div>
      )}

      {hasSelection && (
        <>
          {/* Row Height Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{rowLabel}</div>
            {currentRowHeight !== undefined && (
              <div style={statusStyle}>Current height: {currentRowHeight.toFixed(2)} pt</div>
            )}
            <FieldRow>
              <FieldGroup label="Height (pt)" inline labelWidth={80}>
                <Input
                  type="number"
                  value={draftRowHeight}
                  placeholder={String(currentRowHeight ?? DEFAULT_ROW_HEIGHT)}
                  disabled={disabled}
                  onChange={(v) => setDraftRowHeight(String(v))}
                />
              </FieldGroup>
            </FieldRow>
            <div style={buttonRowStyle}>
              <Button
                size="sm"
                disabled={disabled || !draftRowHeight}
                onClick={handleApplyRowHeight}
              >
                Set Height
              </Button>
              <Button size="sm" disabled={disabled} onClick={handleAutoFitRowHeight}>
                Auto Fit
              </Button>
              <Button size="sm" disabled={disabled} onClick={handleHideRows}>
                Hide
              </Button>
              {hasHiddenRows && (
                <Button size="sm" disabled={disabled} onClick={handleUnhideRows}>
                  Unhide
                </Button>
              )}
            </div>
          </div>

          {/* Column Width Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{colLabel}</div>
            {currentColWidth !== undefined && (
              <div style={statusStyle}>Current width: {currentColWidth.toFixed(2)}</div>
            )}
            <FieldRow>
              <FieldGroup label="Width" inline labelWidth={80}>
                <Input
                  type="number"
                  value={draftColWidth}
                  placeholder={String(currentColWidth ?? DEFAULT_COLUMN_WIDTH)}
                  disabled={disabled}
                  onChange={(v) => setDraftColWidth(String(v))}
                />
              </FieldGroup>
            </FieldRow>
            <div style={buttonRowStyle}>
              <Button
                size="sm"
                disabled={disabled || !draftColWidth}
                onClick={handleApplyColWidth}
              >
                Set Width
              </Button>
              <Button size="sm" disabled={disabled} onClick={handleAutoFitColWidth}>
                Auto Fit
              </Button>
              <Button size="sm" disabled={disabled} onClick={handleHideColumns}>
                Hide
              </Button>
              {hasHiddenCols && (
                <Button size="sm" disabled={disabled} onClick={handleUnhideColumns}>
                  Unhide
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Accordion>
  );
}
