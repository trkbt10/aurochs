/**
 * @file Table cell renderer component
 *
 * Renders DocxTableCell with appropriate formatting.
 */

import type { CSSProperties, ReactNode, MouseEvent } from "react";
import type { DocxTableCell, DocxTableCellProperties, DocxCellBorders } from "@oxen/docx/domain/table";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import { ParagraphRenderer } from "./ParagraphRenderer";

// =============================================================================
// Design Tokens
// =============================================================================

// Selection colors using design tokens
const SELECTION_OUTLINE = "2px solid var(--selection-primary)";
const SELECTION_BG = "color-mix(in srgb, var(--selection-primary) 5%, transparent)";
// Default border color
const DEFAULT_BORDER_COLOR = "var(--text-inverse)";
// Default cell padding
const DEFAULT_CELL_PADDING = "var(--spacing-xs) var(--spacing-sm)";

// =============================================================================
// Types
// =============================================================================

export type TableCellRendererProps = {
  /** Cell to render */
  readonly cell: DocxTableCell;
  /** Row index */
  readonly rowIndex: number;
  /** Column index */
  readonly colIndex: number;
  /** Whether this cell is selected */
  readonly isSelected: boolean;
  /** Click handler */
  readonly onClick: (event: MouseEvent) => void;
};

// =============================================================================
// Style Computation
// =============================================================================

/**
 * Compute border style from cell border edge.
 */
function computeBorderStyle(
  edge: DocxCellBorders[keyof DocxCellBorders]
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
    case "triple":
    case "thinThickSmallGap":
    case "thickThinSmallGap":
    case "thinThickThinSmallGap":
    case "thinThickMediumGap":
    case "thickThinMediumGap":
    case "thinThickThinMediumGap":
    case "thinThickLargeGap":
    case "thickThinLargeGap":
    case "thinThickThinLargeGap":
      style = "double";
      break;
    case "dotDash":
    case "dotDotDash":
      style = "dashed";
      break;
    case "wave":
    case "doubleWave":
      style = "solid"; // CSS doesn't support wave
      break;
    default:
      style = "solid";
  }

  return `${width} ${style} ${color}`;
}

/**
 * Compute CSS styles from cell properties.
 */
export function computeCellStyles(
  properties: DocxTableCellProperties | undefined
): CSSProperties {
  const style: CSSProperties = {
    padding: DEFAULT_CELL_PADDING,
    verticalAlign: "top",
  };

  if (!properties) {
    return style;
  }

  // Cell width
  if (properties.tcW) {
    if (properties.tcW.type === "dxa" && properties.tcW.value) {
      // Width in twips
      const points = properties.tcW.value / 20;
      style.width = `${points}pt`;
    } else if (properties.tcW.type === "pct" && properties.tcW.value) {
      // Width as percentage (in fifths of a percent)
      const percent = properties.tcW.value / 50;
      style.width = `${percent}%`;
    }
  }

  // Cell borders
  if (properties.tcBorders) {
    if (properties.tcBorders.top) {
      style.borderTop = computeBorderStyle(properties.tcBorders.top);
    }
    if (properties.tcBorders.left) {
      style.borderLeft = computeBorderStyle(properties.tcBorders.left);
    }
    if (properties.tcBorders.bottom) {
      style.borderBottom = computeBorderStyle(properties.tcBorders.bottom);
    }
    if (properties.tcBorders.right) {
      style.borderRight = computeBorderStyle(properties.tcBorders.right);
    }
  }

  // Cell shading (background)
  if (properties.shd?.fill && properties.shd.fill !== "auto") {
    style.backgroundColor = `#${properties.shd.fill}`;
  }

  // Vertical alignment
  if (properties.vAlign) {
    switch (properties.vAlign) {
      case "top":
        style.verticalAlign = "top";
        break;
      case "center":
        style.verticalAlign = "middle";
        break;
      case "bottom":
        style.verticalAlign = "bottom";
        break;
    }
  }

  // Cell margins (stored as Pixels)
  if (properties.tcMar) {
    if (properties.tcMar.top) {
      style.paddingTop = `${properties.tcMar.top}px`;
    }
    if (properties.tcMar.left) {
      style.paddingLeft = `${properties.tcMar.left}px`;
    }
    if (properties.tcMar.bottom) {
      style.paddingBottom = `${properties.tcMar.bottom}px`;
    }
    if (properties.tcMar.right) {
      style.paddingRight = `${properties.tcMar.right}px`;
    }
  }

  // Text direction
  if (properties.textDirection) {
    switch (properties.textDirection) {
      case "tbRl":
        style.writingMode = "vertical-rl";
        break;
      case "btLr":
        style.writingMode = "vertical-lr";
        break;
    }
  }

  // No wrap
  if (properties.noWrap) {
    style.whiteSpace = "nowrap";
  }

  return style;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render a table cell with its content.
 */
export function TableCellRenderer({
  cell,
  rowIndex,
  colIndex,
  isSelected,
  onClick,
}: TableCellRendererProps): ReactNode {
  const cellStyle = computeCellStyles(cell.properties);

  // Handle selection styling
  if (isSelected) {
    cellStyle.outline = SELECTION_OUTLINE;
    cellStyle.backgroundColor = cellStyle.backgroundColor ?? SELECTION_BG;
  }

  // Get colspan from gridSpan
  const colSpan = cell.properties?.gridSpan ?? 1;

  // Handle vertical merge
  const vMerge = cell.properties?.vMerge;
  if (vMerge === "continue") {
    // This cell is merged into the cell above, don't render it
    return null;
  }

  // Calculate rowSpan for restart cells (simplified - actual implementation would need row analysis)
  const rowSpan = vMerge === "restart" ? undefined : 1;

  // Handle click
  const handleClick = (e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
    onClick(e);
  };

  return (
    <td
      style={cellStyle}
      colSpan={colSpan > 1 ? colSpan : undefined}
      rowSpan={rowSpan}
      onClick={handleClick}
      data-row={rowIndex}
      data-col={colIndex}
    >
      {cell.content.length === 0 ? (
        <p style={{ margin: 0, minHeight: "1em" }}>{"\u00A0"}</p>
      ) : (
        cell.content.map((content, index) => {
          if (content.type === "paragraph") {
            return (
              <ParagraphRenderer
                key={index}
                paragraph={content}
                elementId={`${rowIndex}-${colIndex}-${index}`}
                isSelected={false}
                isEditing={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
              />
            );
          }
          // Nested table - render as placeholder for now
          if (content.type === "table") {
            return (
              <div
                key={index}
                style={{
                  border: "1px dashed var(--border-strong)",
                  padding: "var(--spacing-xs)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "var(--font-size-md)",
                }}
              >
                [Nested table]
              </div>
            );
          }
          return null;
        })
      )}
    </td>
  );
}
