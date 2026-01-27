/**
 * @file Table renderer component
 *
 * Renders DocxTable with appropriate formatting.
 */

import type { CSSProperties, ReactNode, MouseEvent } from "react";
import type { DocxTable, DocxTableProperties, DocxTableBorders } from "@oxen/docx/domain/table";
import type { ElementId } from "./DocumentCanvas";
import { TableCellRenderer } from "./TableCellRenderer";

// Selection colors using design tokens
const SELECTION_OUTLINE = "2px solid var(--selection-primary)";
// Default border color
const DEFAULT_BORDER_COLOR = "var(--text-inverse)";

// =============================================================================
// Types
// =============================================================================

export type TableRendererProps = {
  /** Table to render */
  readonly table: DocxTable;
  /** Element ID for selection */
  readonly elementId: ElementId;
  /** Whether this table is selected */
  readonly isSelected: boolean;
  /** Cell click handler */
  readonly onCellClick?: (
    rowIndex: number,
    colIndex: number,
    event: MouseEvent
  ) => void;
  /** Table click handler */
  readonly onClick: (event: MouseEvent) => void;
};

// =============================================================================
// Style Computation
// =============================================================================

/**
 * Compute border style from table border edge.
 */
function computeBorderStyle(
  edge: DocxTableBorders[keyof DocxTableBorders]
): string {
  if (!edge) {
    return "none";
  }

  const width = edge.sz ? `${edge.sz / 8}pt` : "1px";
  const color = edge.color ? `#${edge.color}` : DEFAULT_BORDER_COLOR;

  // Map border style
  let style = "solid";
  switch (edge.val) {
    case "none":
    case "nil":
      return "none";
    case "dotted":
      style = "dotted";
      break;
    case "dashed":
    case "dashDotStroked":
      style = "dashed";
      break;
    case "double":
      style = "double";
      break;
    default:
      style = "solid";
  }

  return `${width} ${style} ${color}`;
}

/**
 * Compute CSS styles from table properties.
 */
export function computeTableStyles(
  properties: DocxTableProperties | undefined
): CSSProperties {
  const style: CSSProperties = {
    borderCollapse: "collapse",
    width: "100%",
    tableLayout: "auto",
  };

  if (!properties) {
    return style;
  }

  // Table width
  if (properties.tblW) {
    if (properties.tblW.type === "dxa" && properties.tblW.value) {
      // Width in twips
      const points = properties.tblW.value / 20;
      style.width = `${points}pt`;
    } else if (properties.tblW.type === "pct" && properties.tblW.value) {
      // Width as percentage (in fifths of a percent)
      const percent = properties.tblW.value / 50;
      style.width = `${percent}%`;
    } else if (properties.tblW.type === "auto") {
      style.width = "auto";
    }
  }

  // Table alignment
  if (properties.jc) {
    switch (properties.jc) {
      case "left":
      case "start":
        style.marginRight = "auto";
        break;
      case "center":
        style.marginLeft = "auto";
        style.marginRight = "auto";
        break;
      case "right":
      case "end":
        style.marginLeft = "auto";
        break;
    }
  }

  // Table indentation
  if (properties.tblInd?.type === "dxa" && properties.tblInd.value) {
    const points = properties.tblInd.value / 20;
    style.marginLeft = `${points}pt`;
  }

  // Table borders
  if (properties.tblBorders) {
    if (properties.tblBorders.top) {
      style.borderTop = computeBorderStyle(properties.tblBorders.top);
    }
    if (properties.tblBorders.left) {
      style.borderLeft = computeBorderStyle(properties.tblBorders.left);
    }
    if (properties.tblBorders.bottom) {
      style.borderBottom = computeBorderStyle(properties.tblBorders.bottom);
    }
    if (properties.tblBorders.right) {
      style.borderRight = computeBorderStyle(properties.tblBorders.right);
    }
  }

  // Table shading (background)
  if (properties.shd?.fill && properties.shd.fill !== "auto") {
    style.backgroundColor = `#${properties.shd.fill}`;
  }

  // Table layout
  if (properties.tblLayout === "fixed") {
    style.tableLayout = "fixed";
  }

  // Bidirectional
  if (properties.bidiVisual) {
    style.direction = "rtl";
  }

  return style;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render a table with all its rows and cells.
 */
export function TableRenderer({
  table,
  elementId,
  isSelected,
  onCellClick,
  onClick,
}: TableRendererProps): ReactNode {
  const tableStyle = computeTableStyles(table.properties);

  // Container style for selection state
  const containerStyle: CSSProperties = {
    margin: "var(--spacing-sm) 0",
    cursor: "default",
    outline: isSelected ? SELECTION_OUTLINE : "none",
    outlineOffset: "2px",
  };

  // Handle table click
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick(e);
  };

  // Handle cell click
  const handleCellClick = (
    rowIndex: number,
    colIndex: number,
    event: MouseEvent
  ) => {
    onCellClick?.(rowIndex, colIndex, event);
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      data-element-id={elementId}
    >
      <table style={tableStyle}>
        <tbody>
          {table.rows.map((row, rowIndex) => {
            // Row style
            const rowStyle: CSSProperties = {};

            if (row.properties?.trHeight) {
              const points = (row.properties.trHeight.val as number) / 20;
              if (row.properties.trHeight.hRule === "exact") {
                rowStyle.height = `${points}pt`;
              } else if (row.properties.trHeight.hRule === "atLeast") {
                rowStyle.minHeight = `${points}pt`;
              }
            }

            if (row.properties?.hidden) {
              rowStyle.display = "none";
            }

            // Track actual column index accounting for colSpan
            let actualColIndex = 0;

            return (
              <tr key={rowIndex} style={rowStyle}>
                {row.cells.map((cell, cellIndex) => {
                  const currentColIndex = actualColIndex;
                  const colSpan = cell.properties?.gridSpan ?? 1;
                  actualColIndex += colSpan;

                  // Skip cells that are vertically merged continuations
                  if (cell.properties?.vMerge === "continue") {
                    return null;
                  }

                  return (
                    <TableCellRenderer
                      key={cellIndex}
                      cell={cell}
                      rowIndex={rowIndex}
                      colIndex={currentColIndex}
                      isSelected={false}
                      onClick={(e) => handleCellClick(rowIndex, currentColIndex, e)}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
