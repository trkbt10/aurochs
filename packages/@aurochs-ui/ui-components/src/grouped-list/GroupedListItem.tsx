/**
 * @file GroupedListItem
 *
 * Individual item in a grouped list with:
 * - Click to select
 * - Double-click to edit name (in editable mode)
 * - Right-click for context menu
 * - Drag support for reordering
 * - Keyboard focus support (F2 for rename, Delete for delete)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { colorTokens, radiusTokens, spacingTokens, fontTokens } from "../design-tokens";
import type { GroupedListItemProps, DropTargetPosition } from "./types";

const itemBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  paddingLeft: spacingTokens.md,
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
  position: "relative",
  userSelect: "none",
  transition: "background-color 0.15s ease",
  borderRadius: radiusTokens.sm,
  margin: `0 ${spacingTokens.xs}`,
};

const activeItemStyle: CSSProperties = {
  ...itemBaseStyle,
  backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})`,
  color: `var(--text-inverse, ${colorTokens.text.inverse})`,
};

const draggingStyle: CSSProperties = {
  opacity: 0.5,
};

const dropIndicatorColor = `var(--accent-primary, ${colorTokens.accent.primary})`;

const dropTargetAboveStyle: CSSProperties = {
  boxShadow: `inset 0 2px 0 0 ${dropIndicatorColor}`,
};

const dropTargetBelowStyle: CSSProperties = {
  boxShadow: `inset 0 -2px 0 0 ${dropIndicatorColor}`,
};

const iconStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: fontTokens.size.xs,
  opacity: 0.7,
};

const labelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: `0 ${spacingTokens.xs}`,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  borderRadius: radiusTokens.sm,
  fontSize: fontTokens.size.sm,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

function getDropTargetStyle(position: DropTargetPosition): CSSProperties {
  if (position === "above") {
    return dropTargetAboveStyle;
  }
  if (position === "below") {
    return dropTargetBelowStyle;
  }
  return {};
}

function getItemStyle(
  isActive: boolean,
  isDragging: boolean,
  dropTargetPosition: DropTargetPosition
): CSSProperties {
  const base = isActive ? activeItemStyle : itemBaseStyle;
  if (!isDragging && !dropTargetPosition) {
    return base;
  }
  return {
    ...base,
    ...(isDragging ? draggingStyle : {}),
    ...getDropTargetStyle(dropTargetPosition),
  };
}

/**
 * Individual item in a grouped list.
 */
export function GroupedListItem<TMeta = unknown>({
  item,
  isActive,
  isEditing,
  mode,
  isDragging,
  isAnyDragging,
  dropTargetPosition,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  onRenameSubmit,
  onRenameCancel,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: GroupedListItemProps<TMeta>) {
  const [isHovered, setIsHovered] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(item.label);
  }, [item.label]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onItemClick(item.id);
    }
  }, [isEditing, onItemClick, item.id]);

  const handleDoubleClick = useCallback(() => {
    if (mode === "editable" && item.canRename !== false) {
      onItemDoubleClick(item.id);
    }
  }, [mode, item.canRename, onItemDoubleClick, item.id]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onItemContextMenu(item.id, e);
    },
    [onItemContextMenu, item.id]
  );

  const handleInputBlur = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.label) {
      onRenameSubmit(item.id, trimmed);
    }
    onRenameCancel(item.id);
  }, [editValue, item.label, item.id, onRenameSubmit, onRenameCancel]);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== item.label) {
          onRenameSubmit(item.id, trimmed);
        }
        onRenameCancel(item.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditValue(item.label);
        onRenameCancel(item.id);
      }
    },
    [editValue, item.label, item.id, onRenameSubmit, onRenameCancel]
  );

  const handleDragStartInternal = useCallback(
    (e: React.DragEvent) => {
      if (isEditing || mode === "readonly") {
        e.preventDefault();
        return;
      }
      onDragStart(item.id, e);
    },
    [isEditing, mode, onDragStart, item.id]
  );

  const handleDragOverInternal = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver(item.id, e);
    },
    [onDragOver, item.id]
  );

  const handleDropInternal = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(item.id, e);
    },
    [onDrop, item.id]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onItemClick(item.id);
      } else if (e.key === "F2" && mode === "editable" && item.canRename !== false) {
        e.preventDefault();
        onItemDoubleClick(item.id);
      }
    },
    [onItemClick, onItemDoubleClick, mode, item.canRename, item.id]
  );

  const itemStyle = getItemStyle(isActive, isDragging, dropTargetPosition);

  const hoverStyle: CSSProperties = isHovered && !isActive && !isAnyDragging
    ? { backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})` }
    : {};

  return (
    <div
      role="option"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      style={{ ...itemStyle, ...hoverStyle }}
      draggable={mode === "editable" && !isEditing}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={handleDragStartInternal}
      onDragOver={handleDragOverInternal}
      onDrop={handleDropInternal}
      onDragEnd={onDragEnd}
      onKeyDown={handleKeyDown}
      data-item-id={item.id}
    >
      {item.icon && <span style={iconStyle}>{item.icon}</span>}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          style={inputStyle}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span style={labelStyle} title={item.label}>
          {item.label}
        </span>
      )}
    </div>
  );
}
