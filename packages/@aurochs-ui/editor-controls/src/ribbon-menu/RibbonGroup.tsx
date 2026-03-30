/**
 * @file Single ribbon group with items, label, DnD, and inline rename.
 */

import { useState, type CSSProperties, type DragEvent } from "react";
import { CloseIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { GROUP_REORDER_MIME } from "./dnd";
import type { RibbonGroupDef } from "./types";
import { renderRibbonItem } from "./render-item";

// =============================================================================
// Styles
// =============================================================================

const base: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: spacingTokens["2xs"],
  borderRight: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  paddingRight: spacingTokens.sm,
  position: "relative",
  minWidth: 40,
  minHeight: 32,
};

const dropHint: CSSProperties = {
  ...base,
  outline: `1px dashed var(--border-primary, ${colorTokens.border.primary})`,
  outlineOffset: -1,
  borderRadius: radiusTokens.sm,
};

const dropTarget: CSSProperties = {
  ...base,
  outline: `2px dashed var(--accent-primary, ${colorTokens.accent.primary})`,
  outlineOffset: -1,
  borderRadius: radiusTokens.sm,
};

const itemsRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens["2xs"],
};

const labelRow: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  lineHeight: 1,
  paddingTop: spacingTokens["2xs"],
};

const closeBadge: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  borderRadius: radiusTokens.full,
  padding: "1px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  zIndex: 1,
};

const draggingItem: CSSProperties = { opacity: 0.4 };

// =============================================================================
// Props
// =============================================================================

export type RibbonGroupProps = {
  readonly group: RibbonGroupDef;
  readonly groupIndex: number;
  readonly customizing: boolean;
  readonly isDraggingItem: boolean;
  readonly isDropTarget: boolean;
  readonly onExecute: (id: string) => void;
  readonly onRemove: (groupId: string) => void;
  readonly onRename: (groupId: string, label: string) => void;
  readonly onItemDragStart: (groupId: string, index: number, e: DragEvent) => void;
  readonly onItemDragEnd: (groupId: string, index: number, e: DragEvent) => void;
  readonly onGroupDragOver: (groupId: string, e: DragEvent) => void;
  readonly onGroupDragLeave: () => void;
  readonly onGroupDrop: (groupId: string, e: DragEvent) => void;
  readonly onGroupReorderStart: (index: number, e: DragEvent) => void;
  readonly onGroupReorderOver: (index: number, e: DragEvent) => void;
  readonly onGroupReorderDrop: (index: number) => void;
  readonly onGroupReorderEnd: () => void;
  readonly dragItemState: { groupId: string; index: number } | null;
};

// =============================================================================
// Helpers
// =============================================================================

function resolveStyle(isDrop: boolean, showHint: boolean): CSSProperties {
  if (isDrop) { return dropTarget; }
  if (showHint) { return dropHint; }
  return base;
}

// =============================================================================
// Component
// =============================================================================

/** A single ribbon group with items, label, and editing controls. */
export function RibbonGroup({
  group, groupIndex, customizing, isDraggingItem: dragging, isDropTarget: isDrop,
  onExecute, onRemove, onRename,
  onItemDragStart, onItemDragEnd,
  onGroupDragOver, onGroupDragLeave, onGroupDrop,
  onGroupReorderStart, onGroupReorderOver, onGroupReorderDrop, onGroupReorderEnd,
  dragItemState,
}: RibbonGroupProps) {
  const [renamingGrp, setRenamingGrp] = useState(false);
  const showHint = dragging && !isDrop;

  function handleDragOver(e: DragEvent) {
    onGroupReorderOver(groupIndex, e);
    onGroupDragOver(group.id, e);
  }

  function handleDrop(e: DragEvent) {
    if (e.dataTransfer.types.includes(GROUP_REORDER_MIME)) {
      onGroupReorderDrop(groupIndex);
    } else {
      onGroupDrop(group.id, e);
    }
  }

  return (
    <div
      role="group"
      aria-label={group.label}
      style={resolveStyle(isDrop, showHint)}
      draggable={customizing}
      onDragStart={customizing ? (e) => onGroupReorderStart(groupIndex, e) : undefined}
      onDragOver={customizing ? handleDragOver : undefined}
      onDragLeave={customizing ? onGroupDragLeave : undefined}
      onDrop={customizing ? handleDrop : undefined}
      onDragEnd={customizing ? onGroupReorderEnd : undefined}
    >
      <div style={itemsRow}>
        {group.items.map((item, idx) => {
          const isDragItem = dragItemState?.groupId === group.id && dragItemState?.index === idx;
          return (
            <div
              key={`${item.id}-${idx}`}
              style={isDragItem ? draggingItem : undefined}
              draggable={customizing}
              onDragStart={customizing ? (e) => onItemDragStart(group.id, idx, e) : undefined}
              onDragEnd={customizing ? (e) => onItemDragEnd(group.id, idx, e) : undefined}
            >
              {renderRibbonItem(item, onExecute)}
            </div>
          );
        })}
      </div>
      <div
        style={labelRow}
        draggable={customizing}
        onDragStart={customizing ? (e) => { e.stopPropagation(); onGroupReorderStart(groupIndex, e); } : undefined}
        onDragEnd={customizing ? onGroupReorderEnd : undefined}
      >
        <span
          contentEditable={customizing && renamingGrp}
          suppressContentEditableWarning
          onDoubleClick={customizing ? () => setRenamingGrp(true) : undefined}
          onBlur={(e) => { onRename(group.id, e.currentTarget.textContent ?? group.label); setRenamingGrp(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        >{group.label}</span>
      </div>
      {customizing && (
        <button type="button" style={closeBadge} onClick={() => onRemove(group.id)} title={`Remove ${group.label}`}>
          <CloseIcon size={8} />
        </button>
      )}
    </div>
  );
}
