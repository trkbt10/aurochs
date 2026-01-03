/**
 * @file Context menu item component
 */

import { type CSSProperties, useCallback, useState } from "react";
import type { MenuItem } from "./types";

export type ContextMenuItemProps = {
  readonly item: MenuItem;
  readonly onClick: (id: string) => void;
};

const baseItemStyle: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "4px",
  margin: "0 4px",
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

const dangerStyle: CSSProperties = {
  ...enabledStyle,
  color: "var(--danger, #ef4444)",
};

export function ContextMenuItem({ item, onClick }: ContextMenuItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (!item.disabled) {
      onClick(item.id);
    }
  }, [item.disabled, item.id, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (!item.disabled) {
      setIsHovered(true);
    }
  }, [item.disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const getStyle = (): CSSProperties => {
    if (item.disabled) {
      return disabledStyle;
    }
    const base = item.danger ? dangerStyle : enabledStyle;
    if (isHovered) {
      return {
        ...base,
        backgroundColor: "var(--bg-secondary, #1a1a1a)",
      };
    }
    return base;
  };

  return (
    <div
      style={getStyle()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut && (
        <span style={{ color: "var(--text-tertiary, #555)", fontSize: "10px" }}>
          {item.shortcut}
        </span>
      )}
    </div>
  );
}
