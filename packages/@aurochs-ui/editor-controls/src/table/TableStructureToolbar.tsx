/**
 * @file TableStructureToolbar - Shared table structure operation buttons
 *
 * Provides buttons for row/column add/remove and cell merge/split.
 * Format-agnostic — callbacks are provided by the parent component.
 */

import { type CSSProperties } from "react";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";

// =============================================================================
// Types
// =============================================================================

export type TableStructureToolbarProps = {
  readonly onInsertRow?: (position: "above" | "below") => void;
  readonly onRemoveRow?: () => void;
  readonly onInsertColumn?: (position: "before" | "after") => void;
  readonly onRemoveColumn?: () => void;
  readonly onMergeCells?: () => void;
  readonly onSplitCell?: () => void;
  readonly hasSelection?: boolean;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  padding: "4px 8px",
  fontSize: "11px",
  borderRadius: "4px",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  color: "var(--text-secondary, #a1a1a1)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: "default",
};

// =============================================================================
// Component
// =============================================================================

/** Shared toolbar for table structure operations (add/remove rows/cols, merge/split). */
export function TableStructureToolbar({
  onInsertRow,
  onRemoveRow,
  onInsertColumn,
  onRemoveColumn,
  onMergeCells,
  onSplitCell,
  hasSelection,
  disabled,
}: TableStructureToolbarProps) {
  const isDisabled = disabled || !hasSelection;

  const getButtonStyle = (extraDisabled?: boolean) =>
    isDisabled || extraDisabled ? disabledButtonStyle : buttonStyle;

  return (
    <div style={containerStyle}>
      <FieldGroup label="Rows">
        <div style={rowStyle}>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onInsertRow?.("above")}
          >
            + Above
          </button>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onInsertRow?.("below")}
          >
            + Below
          </button>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onRemoveRow?.()}
          >
            Remove
          </button>
        </div>
      </FieldGroup>

      <FieldGroup label="Columns">
        <div style={rowStyle}>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onInsertColumn?.("before")}
          >
            + Before
          </button>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onInsertColumn?.("after")}
          >
            + After
          </button>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onRemoveColumn?.()}
          >
            Remove
          </button>
        </div>
      </FieldGroup>

      <FieldGroup label="Cells">
        <div style={rowStyle}>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onMergeCells?.()}
          >
            Merge
          </button>
          <button
            type="button"
            style={getButtonStyle()}
            disabled={isDisabled}
            onClick={() => onSplitCell?.()}
          >
            Split
          </button>
        </div>
      </FieldGroup>
    </div>
  );
}
