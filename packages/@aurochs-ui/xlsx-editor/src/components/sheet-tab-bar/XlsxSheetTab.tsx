/**
 * @file XlsxSheetTab
 *
 * Individual sheet tab component with:
 * - Click to select
 * - Double-click to edit name
 * - Right-click for context menu
 * - Hover to show close button
 * - Drag support for reordering
 * - Keyboard focus support
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { colorTokens, radiusTokens, spacingTokens, fontTokens } from "@aurochs-ui/ui-components";
import type { DropTargetPosition, XlsxSheetTabProps } from "./types";

const DROP_INDICATOR_WIDTH = "2px";
const TAB_MIN_WIDTH = "80px";

const tabBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderTop: "none",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
  position: "relative",
  userSelect: "none",
  transition: "background-color 0.15s ease, box-shadow 0.1s ease",
  flex: "1 1 0",
  minWidth: TAB_MIN_WIDTH,
  boxSizing: "border-box",
};

const activeTabStyle: CSSProperties = {
  ...tabBaseStyle,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  fontWeight: fontTokens.weight.medium,
};

const draggingTabStyle: CSSProperties = {
  opacity: 0.5,
};

const dropIndicatorColor = `var(--accent-primary, ${colorTokens.accent.primary})`;

const dropTargetLeftStyle: CSSProperties = {
  boxShadow: `inset ${DROP_INDICATOR_WIDTH} 0 0 0 ${dropIndicatorColor}`,
};

const dropTargetRightStyle: CSSProperties = {
  boxShadow: `inset -${DROP_INDICATOR_WIDTH} 0 0 0 ${dropIndicatorColor}`,
};

const closeButtonContainerStyle: CSSProperties = {
  width: "16px",
  height: "16px",
  flexShrink: 0,
};

const closeButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
  borderRadius: radiusTokens.sm,
  border: "none",
  backgroundColor: "transparent",
  cursor: "pointer",
  padding: 0,
  fontSize: "12px",
  lineHeight: 1,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  transition: "background-color 0.15s ease, opacity 0.15s ease",
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: `0 ${spacingTokens.xs}`,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  borderRadius: radiusTokens.sm,
  fontSize: fontTokens.size.sm,
};

const nameStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function getDropTargetStyle(position: DropTargetPosition): CSSProperties {
  if (position === "left") {
    return dropTargetLeftStyle;
  }
  if (position === "right") {
    return dropTargetRightStyle;
  }
  return {};
}

function getTabStyle(isActive: boolean, isDragging: boolean, dropTargetPosition: DropTargetPosition): CSSProperties {
  const base = isActive ? activeTabStyle : tabBaseStyle;
  if (!isDragging && !dropTargetPosition) {
    return base;
  }
  return {
    ...base,
    ...(isDragging ? draggingTabStyle : {}),
    ...getDropTargetStyle(dropTargetPosition),
  };
}

type SheetNameInputProps = {
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};

function SheetNameInput({ inputRef, value, onChange, onBlur, onKeyDown }: SheetNameInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      style={inputStyle}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

type SheetNameDisplayProps = {
  readonly sheetName: string;
};

function SheetNameDisplay({ sheetName }: SheetNameDisplayProps) {
  return (
    <span style={nameStyle} title={sheetName}>
      {sheetName}
    </span>
  );
}

type CloseButtonProps = {
  readonly visible: boolean;
  readonly sheetName: string;
  readonly canDelete: boolean;
  readonly onClick: (e: React.MouseEvent) => void;
};

function CloseButton({ visible, sheetName, canDelete, onClick }: CloseButtonProps) {
  if (!canDelete) {
    return <div style={closeButtonContainerStyle} />;
  }

  const buttonStyle: CSSProperties = {
    ...closeButtonStyle,
    visibility: visible ? "visible" : "hidden",
  };

  return (
    <div style={closeButtonContainerStyle}>
      <button
        type="button"
        style={buttonStyle}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `var(--bg-tertiary, ${colorTokens.background.tertiary})`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        title="Close sheet"
        aria-label={`Close ${sheetName}`}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Individual sheet tab component
 */
export function XlsxSheetTab({
  sheetIndex,
  sheetName,
  isActive,
  isEditing,
  canDelete,
  onSelect,
  onClose,
  onRename,
  onStartEdit,
  onCancelEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dropTargetPosition,
  onContextMenu,
}: XlsxSheetTabProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editValue, setEditValue] = useState(sheetName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(sheetName);
  }, [sheetName]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onSelect();
    }
  }, [isEditing, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onStartEdit();
  }, [onStartEdit]);

  const handleInputBlur = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== sheetName) {
      onRename(trimmed);
    }
    onCancelEdit();
  }, [editValue, sheetName, onRename, onCancelEdit]);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== sheetName) {
          onRename(trimmed);
        }
        onCancelEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditValue(sheetName);
        onCancelEdit();
      }
    },
    [editValue, sheetName, onRename, onCancelEdit],
  );

  const handleCloseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose],
  );

  const handleDragStartInternal = useCallback(
    (e: React.DragEvent) => {
      if (isEditing) {
        e.preventDefault();
        return;
      }
      onDragStart(e);
    },
    [isEditing, onDragStart],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect();
      } else if (e.key === "F2") {
        e.preventDefault();
        onStartEdit();
      }
    },
    [onSelect, onStartEdit],
  );

  const showCloseButton = (isHovered || isActive) && !isEditing;
  const tabStyle = getTabStyle(isActive, isDragging, dropTargetPosition);

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      style={tabStyle}
      draggable={!isEditing}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={handleDragStartInternal}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={handleKeyDown}
      data-sheet-index={sheetIndex}
    >
      {isEditing && (
        <SheetNameInput
          inputRef={inputRef}
          value={editValue}
          onChange={setEditValue}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
      )}
      {!isEditing && <SheetNameDisplay sheetName={sheetName} />}
      <CloseButton visible={showCloseButton} sheetName={sheetName} canDelete={canDelete} onClick={handleCloseClick} />
    </div>
  );
}
