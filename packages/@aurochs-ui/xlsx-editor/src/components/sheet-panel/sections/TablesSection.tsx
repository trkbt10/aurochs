/**
 * @file Tables section
 *
 * Section for table (ListObject) management.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, Toggle } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxTable } from "@aurochs-office/xlsx/domain/table/types";
import { formatRange, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type TablesSectionProps = {
  readonly disabled: boolean;
  readonly sheetIndex: number;
  readonly tables: readonly XlsxTable[] | undefined;
  readonly selectedRange: CellRange | undefined;
  readonly onCreateTable: (range: CellRange, name?: string, hasHeaderRow?: boolean) => void;
  readonly onDeleteTable: (tableName: string) => void;
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
};

const tableItemStyle: CSSProperties = {
  padding: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  fontSize: fontTokens.size.sm,
};

const tableNameStyle: CSSProperties = {
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

const tableRangeStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
  marginTop: spacingTokens.xs,
};

/**
 * Tables management section.
 */
export function TablesSection({
  disabled,
  sheetIndex,
  tables,
  selectedRange,
  onCreateTable,
  onDeleteTable,
}: TablesSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftHasHeader, setDraftHasHeader] = useState(true);

  // Filter tables for current sheet
  const sheetTables = useMemo(
    () => tables?.filter((t) => t.sheetIndex === sheetIndex) ?? [],
    [tables, sheetIndex],
  );

  const hasTables = sheetTables.length > 0;

  // Find table at the current selection
  const currentTable = useMemo(() => {
    if (!selectedRange) {
      return undefined;
    }
    return sheetTables.find((t) => {
      const tRef = t.ref;
      return (
        selectedRange.start.row >= tRef.start.row &&
        selectedRange.start.col >= tRef.start.col &&
        selectedRange.end.row <= tRef.end.row &&
        selectedRange.end.col <= tRef.end.col
      );
    });
  }, [selectedRange, sheetTables]);

  const handleStartCreate = useCallback(() => {
    setDraftName("");
    setDraftHasHeader(true);
    setIsCreating(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
  }, []);

  const handleCreate = useCallback(() => {
    if (!selectedRange) {
      return;
    }
    onCreateTable(selectedRange, draftName || undefined, draftHasHeader);
    setIsCreating(false);
  }, [selectedRange, draftName, draftHasHeader, onCreateTable]);

  const handleDelete = useCallback(
    (tableName: string) => {
      onDeleteTable(tableName);
    },
    [onDeleteTable],
  );

  return (
    <Accordion title="Tables" defaultExpanded={hasTables || isCreating}>
      <div style={descriptionStyle}>
        Convert a range of cells into a table for easier data management.
      </div>

      {isCreating && selectedRange ? (
        <>
          <FieldGroup label="Range">
            <div style={{ fontSize: fontTokens.size.md }}>{formatRange(selectedRange)}</div>
          </FieldGroup>

          <FieldGroup label="Name (optional)">
            <Input
              type="text"
              value={draftName}
              placeholder="Table1"
              disabled={disabled}
              onChange={(v) => setDraftName(String(v))}
            />
          </FieldGroup>

          <FieldGroup label="Has header row" inline labelWidth={120}>
            <Toggle
              checked={draftHasHeader}
              disabled={disabled}
              onChange={setDraftHasHeader}
            />
          </FieldGroup>

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleCreate}>
              Create Table
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancelCreate}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {currentTable && (
            <div style={tableItemStyle}>
              <div style={tableNameStyle}>{currentTable.name}</div>
              <div style={tableRangeStyle}>
                Range: {formatRange(currentTable.ref)}
                {currentTable.headerRowCount > 0 && " (with header)"}
              </div>
              <div style={buttonRowStyle}>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleDelete(currentTable.name)}
                >
                  Delete Table
                </Button>
              </div>
            </div>
          )}

          {hasTables && !currentTable && (
            <div style={{ marginBottom: spacingTokens.sm }}>
              <div style={{ color: colorTokens.text.secondary, fontSize: fontTokens.size.sm }}>
                {sheetTables.length} table{sheetTables.length !== 1 ? "s" : ""} on this sheet:
              </div>
              {sheetTables.map((table) => (
                <div key={table.name} style={{ ...tableItemStyle, marginTop: spacingTokens.sm }}>
                  <div style={tableNameStyle}>{table.name}</div>
                  <div style={tableRangeStyle}>{formatRange(table.ref)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={buttonRowStyle}>
            {selectedRange && !currentTable && (
              <Button size="sm" disabled={disabled} onClick={handleStartCreate}>
                Create Table
              </Button>
            )}
          </div>

          {!selectedRange && !hasTables && (
            <div style={{ ...descriptionStyle, fontStyle: "italic" }}>
              Select a range to create a table.
            </div>
          )}
        </>
      )}
    </Accordion>
  );
}
