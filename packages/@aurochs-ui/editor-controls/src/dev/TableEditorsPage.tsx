/**
 * @file Table editors preview page
 *
 * Demonstrates TableStyleBandsEditor and CellFormattingEditor
 * with interactive state display.
 */

import { useState, type CSSProperties } from "react";
import { TableStyleBandsEditor } from "../table/TableStyleBandsEditor";
import { CellFormattingEditor } from "../table/CellFormattingEditor";
import type { TableStyleBands, CellFormatting } from "../table/types";

// =============================================================================
// Styles
// =============================================================================

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 16,
};

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: 12,
  padding: 20,
  border: "1px solid var(--border-subtle)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cardTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono, monospace)",
  color: "var(--text-tertiary)",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: 8,
  padding: 12,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: 200,
  overflow: "auto",
};

// =============================================================================
// Default values
// =============================================================================

const defaultBands: TableStyleBands = {
  headerRow: true,
  totalRow: false,
  firstColumn: false,
  lastColumn: false,
  bandedRows: true,
  bandedColumns: false,
};

const defaultCell: CellFormatting = {
  verticalAlignment: "top",
  backgroundColor: "#FFFFFF",
  wrapText: false,
};

// =============================================================================
// Component
// =============================================================================

/** Interactive preview page for table style and cell editors. */
export function TableEditorsPage() {
  const [bands, setBands] = useState<TableStyleBands>(defaultBands);
  const [cell, setCell] = useState<CellFormatting>(defaultCell);

  return (
    <div style={gridStyle}>
      {/* TableStyleBandsEditor */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>TableStyleBandsEditor</div>
        <TableStyleBandsEditor
          value={bands}
          onChange={(update) => setBands((prev) => ({ ...prev, ...update }))}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(bands, null, 2)}</div>
      </div>

      {/* CellFormattingEditor */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>CellFormattingEditor</div>
        <CellFormattingEditor
          value={cell}
          onChange={(update) => setCell((prev) => ({ ...prev, ...update }))}
          features={{ showWrapText: true }}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(cell, null, 2)}</div>
      </div>
    </div>
  );
}
