/**
 * @file Context menu submenu component
 *
 * Renders a menu item that expands to show child items on hover.
 */

import { type CSSProperties, useCallback, useState, useRef } from "react";
import type { MenuSubmenu, MenuEntry } from "./types";
import { ContextMenuItem } from "./ContextMenuItem";
import { ContextMenuSeparator } from "./ContextMenuSeparator";
import { isSeparator, isSubmenu } from "./types";

export type ContextMenuSubmenuProps = {
  readonly item: MenuSubmenu;
  readonly onAction: (id: string) => void;
};

const baseItemStyle: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "4px",
  margin: "0 4px",
  position: "relative",
};

const enabledStyle: CSSProperties = {
  ...baseItemStyle,
  cursor: "pointer",
  color: "var(--text-secondary, #a1a1a1)",
};

const disabledStyle: CSSProperties = {
  ...baseItemStyle,
  color: "var(--text-tertiary, #555)",
  cursor: "default",
};

const submenuStyle: CSSProperties = {
  position: "absolute",
  left: "100%",
  top: "-4px",
  backgroundColor: "var(--bg-primary, #0a0a0a)",
  border: "1px solid var(--border-subtle, #333)",
  borderRadius: "6px",
  padding: "4px 0",
  minWidth: "160px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  zIndex: 1001,
};

const chevronStyle: CSSProperties = {
  marginLeft: "auto",
  fontSize: "10px",
  color: "var(--text-tertiary, #555)",
};

export function ContextMenuSubmenu({ item, onAction }: ContextMenuSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (item.disabled) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
    setIsOpen(true);
  }, [item.disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Delay closing to allow mouse to move to submenu
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  const handleSubmenuMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleSubmenuMouseLeave = useCallback(() => {
    setIsOpen(false);
  }, []);

  const getStyle = (): CSSProperties => {
    if (item.disabled) {
      return disabledStyle;
    }
    if (isHovered) {
      return {
        ...enabledStyle,
        backgroundColor: "var(--bg-secondary, #1a1a1a)",
      };
    }
    return enabledStyle;
  };

  const renderEntry = (entry: MenuEntry, index: number) => {
    if (isSeparator(entry)) {
      return <ContextMenuSeparator key={`sep-${index}`} />;
    }
    if (isSubmenu(entry)) {
      return (
        <ContextMenuSubmenu
          key={entry.id}
          item={entry}
          onAction={onAction}
        />
      );
    }
    return (
      <ContextMenuItem
        key={entry.id}
        item={entry}
        onClick={onAction}
      />
    );
  };

  return (
    <div
      style={getStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ flex: 1 }}>{item.label}</span>
      <span style={chevronStyle}>▶</span>

      {isOpen && !item.disabled && (
        <div
          style={submenuStyle}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {item.children.map(renderEntry)}
        </div>
      )}
    </div>
  );
}
