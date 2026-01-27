/**
 * @file Table Editors Test
 *
 * Test component for table-related editors.
 */

import { useState, type CSSProperties } from "react";
import {
  TableCellPropertiesEditor,
  TableCellEditor,
  TablePropertiesEditor,
  TableEditor,
  createDefaultTableCellProperties,
  createDefaultTableCell,
  createDefaultTableProperties,
  createTable,
} from "@oxen-ui/pptx-editor";
import type {
  TableCellProperties,
  TableCell,
  TableProperties,
  Table,
} from "@oxen/pptx/domain/table/types";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  marginTop: "16px",
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "200px",
  overflow: "auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "24px",
};

/**
 * Table editors test component
 */
export function TableEditorsTest() {
  const [cellProps, setCellProps] = useState<TableCellProperties>(createDefaultTableCellProperties());
  const [tableCell, setTableCell] = useState<TableCell>(createDefaultTableCell());
  const [tableProps, setTableProps] = useState<TableProperties>(createDefaultTableProperties());
  const [table, setTable] = useState<Table>(createTable(3, 3));

  return (
    <div style={gridStyle}>
      {/* Table Cell Properties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Table Cell Properties Editor</h2>
        <TableCellPropertiesEditor value={cellProps} onChange={setCellProps} />
        <div style={valueDisplayStyle}>{JSON.stringify(cellProps, null, 2)}</div>
      </div>

      {/* Table Cell Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Table Cell Editor</h2>
        <TableCellEditor value={tableCell} onChange={setTableCell} />
        <div style={valueDisplayStyle}>{JSON.stringify(tableCell, null, 2)}</div>
      </div>

      {/* Table Properties Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Table Properties Editor</h2>
        <TablePropertiesEditor value={tableProps} onChange={setTableProps} />
        <div style={valueDisplayStyle}>{JSON.stringify(tableProps, null, 2)}</div>
      </div>

      {/* Table Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Table Editor (3x3)</h2>
        <TableEditor value={table} onChange={setTable} />
        <div style={valueDisplayStyle}>{JSON.stringify(table, null, 2)}</div>
      </div>
    </div>
  );
}
