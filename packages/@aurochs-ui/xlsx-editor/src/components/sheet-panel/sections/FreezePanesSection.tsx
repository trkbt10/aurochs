/**
 * @file Freeze Panes section
 *
 * Section for freeze panes configuration.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, FieldRow } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxPane } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";

export type FreezePanesSectionProps = {
  readonly disabled: boolean;
  readonly pane: XlsxPane | undefined;
  readonly activeCell: CellAddress | undefined;
  readonly onFreezeRows: (rowCount: number) => void;
  readonly onFreezeColumns: (colCount: number) => void;
  readonly onFreezeRowsAndColumns: (rowCount: number, colCount: number) => void;
  readonly onUnfreeze: () => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
  flexWrap: "wrap",
};

const statusStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  marginBottom: spacingTokens.sm,
  padding: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
};

const statusLabelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
};

const statusValueStyle: CSSProperties = {
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

/**
 * Freeze panes configuration section.
 */
export function FreezePanesSection({
  disabled,
  pane,
  activeCell,
  onFreezeRows,
  onFreezeColumns,
  onFreezeRowsAndColumns,
  onUnfreeze,
}: FreezePanesSectionProps) {
  const [draftRows, setDraftRows] = useState("");
  const [draftCols, setDraftCols] = useState("");

  const isFrozen = pane?.state === "frozen" || pane?.state === "frozenSplit";

  const freezeStatus = useMemo(() => {
    if (!isFrozen || !pane) {
      return null;
    }
    const rows = pane.ySplit ?? 0;
    const cols = pane.xSplit ?? 0;
    if (rows > 0 && cols > 0) {
      return `Frozen: ${rows} row(s), ${cols} column(s)`;
    }
    if (rows > 0) {
      return `Frozen: ${rows} row(s)`;
    }
    if (cols > 0) {
      return `Frozen: ${cols} column(s)`;
    }
    return null;
  }, [isFrozen, pane]);

  const handleFreezeAtSelection = useCallback(() => {
    if (!activeCell) {
      return;
    }
    // Freeze rows above and columns to the left of the active cell
    const rowsToFreeze = activeCell.row;
    const colsToFreeze = activeCell.col;
    if (rowsToFreeze > 0 || colsToFreeze > 0) {
      onFreezeRowsAndColumns(rowsToFreeze, colsToFreeze);
    }
  }, [activeCell, onFreezeRowsAndColumns]);

  const handleFreezeTopRow = useCallback(() => {
    onFreezeRows(1);
  }, [onFreezeRows]);

  const handleFreezeFirstColumn = useCallback(() => {
    onFreezeColumns(1);
  }, [onFreezeColumns]);

  const handleApplyCustom = useCallback(() => {
    const rows = parseInt(draftRows, 10) || 0;
    const cols = parseInt(draftCols, 10) || 0;
    if (rows > 0 || cols > 0) {
      onFreezeRowsAndColumns(rows, cols);
    }
    setDraftRows("");
    setDraftCols("");
  }, [draftRows, draftCols, onFreezeRowsAndColumns]);

  return (
    <Accordion title="Freeze Panes" defaultExpanded={isFrozen}>
      <div style={descriptionStyle}>
        Keep rows or columns visible while scrolling.
      </div>

      {freezeStatus && (
        <div style={statusStyle}>
          <div style={statusLabelStyle}>Current freeze:</div>
          <div style={statusValueStyle}>{freezeStatus}</div>
        </div>
      )}

      {!isFrozen && (
        <>
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleFreezeTopRow}>
              Freeze Top Row
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleFreezeFirstColumn}>
              Freeze First Column
            </Button>
          </div>

          {activeCell && (activeCell.row > 0 || activeCell.col > 0) && (
            <div style={buttonRowStyle}>
              <Button size="sm" disabled={disabled} onClick={handleFreezeAtSelection}>
                Freeze at Cell ({String.fromCharCode(65 + activeCell.col)}{activeCell.row + 1})
              </Button>
            </div>
          )}

          <div style={{ marginTop: spacingTokens.md }}>
            <FieldRow>
              <FieldGroup label="Rows" inline labelWidth={50}>
                <Input
                  type="number"
                  value={draftRows}
                  placeholder="0"
                  disabled={disabled}
                  onChange={(v) => setDraftRows(String(v))}
                />
              </FieldGroup>
              <FieldGroup label="Cols" inline labelWidth={50}>
                <Input
                  type="number"
                  value={draftCols}
                  placeholder="0"
                  disabled={disabled}
                  onChange={(v) => setDraftCols(String(v))}
                />
              </FieldGroup>
            </FieldRow>
            <div style={buttonRowStyle}>
              <Button
                size="sm"
                disabled={disabled || (!draftRows && !draftCols)}
                onClick={handleApplyCustom}
              >
                Apply Custom Freeze
              </Button>
            </div>
          </div>
        </>
      )}

      {isFrozen && (
        <div style={buttonRowStyle}>
          <Button size="sm" disabled={disabled} onClick={onUnfreeze}>
            Unfreeze Panes
          </Button>
        </div>
      )}
    </Accordion>
  );
}
