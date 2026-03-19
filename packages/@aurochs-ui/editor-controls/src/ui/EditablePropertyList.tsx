/**
 * @file EditablePropertyList - Flat list with add/remove/rename operations
 *
 * Generic list component for key-value property editing.
 * Each item renders via a caller-provided render function.
 * Supports adding, removing, and renaming items.
 */

import { useState, useCallback, useRef, useEffect, type ReactNode, type CSSProperties, type KeyboardEvent } from "react";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type EditablePropertyListItem = {
  readonly key: string;
  /** Display label. Falls back to `key` if not provided. */
  readonly label?: string;
  /** Whether this item can be removed. Default: true. */
  readonly removable?: boolean;
  /** Whether this item's key can be renamed. Default: false. */
  readonly renamable?: boolean;
};

export type EditablePropertyListProps = {
  readonly items: readonly EditablePropertyListItem[];
  readonly renderItem: (item: EditablePropertyListItem) => ReactNode;
  readonly onAdd?: (key: string) => void;
  readonly onRemove?: (key: string) => void;
  readonly onRename?: (oldKey: string, newKey: string) => void;
  readonly disabled?: boolean;
  /** Placeholder for the add input. Default: "key" */
  readonly addPlaceholder?: string;
  /** Label for the add button. Default: "Add" */
  readonly addLabel?: string;
};

// =============================================================================
// Styles
// =============================================================================

const itemRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.md,
  padding: spacingTokens.xs,
  lineHeight: 1,
  flexShrink: 0,
};

const addRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  alignItems: "center",
};

const renameInputStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  background: "transparent",
  border: `1px solid var(--accent-primary, ${colorTokens.accent.primary})`,
  borderRadius: "2px",
  padding: "0 2px",
  outline: "none",
  width: "100%",
};

// =============================================================================
// InlineRenameLabel
// =============================================================================

type InlineRenameLabelProps = {
  readonly label: string;
  readonly onRename: (newLabel: string) => void;
};

/**
 * Inline label that becomes an editable text input on double-click.
 */
export function InlineRenameLabel({ label, onRename }: InlineRenameLabelProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onRename(trimmed);
    }
    setEditing(false);
  }, [editValue, label, onRename]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditValue(label);
      setEditing(false);
    }
  }, [handleCommit, label]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(label);
    setEditing(true);
  }, [label]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        style={renameInputStyle}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      style={{ cursor: "text" }}
      title="Double-click to rename"
    >
      {label}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editable property list with add/remove/rename operations.
 *
 * Items are rendered via `renderItem`. The list itself handles the remove button,
 * inline rename, and add input + button. Intended to be placed inside an
 * `OptionalPropertySection` which provides the outer gap and padding via its
 * `contentStyle`.
 */
export function EditablePropertyList({
  items,
  renderItem,
  onAdd,
  onRemove,
  disabled,
  addPlaceholder = "key",
  addLabel = "Add",
}: EditablePropertyListProps) {
  const [newKey, setNewKey] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = newKey.trim();
    if (!trimmed || !onAdd) {
      return;
    }
    onAdd(trimmed);
    setNewKey("");
  }, [newKey, onAdd]);

  const handleNewKeyChange = useCallback((value: string | number) => {
    setNewKey(String(value));
  }, []);

  return (
    <>
      {items.map((item) => (
        <div key={item.key} style={itemRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
          {(item.removable !== false) && onRemove && !disabled && (
            <button
              type="button"
              style={removeButtonStyle}
              onClick={() => onRemove(item.key)}
              title={`Remove ${item.key}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {onAdd && !disabled && (
        <div style={addRowStyle}>
          <FieldGroup label="Name" inline labelWidth={40} style={{ flex: 1 }}>
            <Input
              value={newKey}
              onChange={handleNewKeyChange}
              placeholder={addPlaceholder}
            />
          </FieldGroup>
          <Button variant="secondary" size="sm" onClick={handleAdd} disabled={!newKey.trim()}>
            {addLabel}
          </Button>
        </div>
      )}
    </>
  );
}
