/**
 * @file ContextMenuItem
 */

import { useCallback, useState, type CSSProperties } from "react";
import type { MenuItem } from "./types";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "../design-tokens";

export type ContextMenuItemProps = {
  readonly item: MenuItem;
  readonly onClick: (id: string) => void;
};

const baseItemStyle: CSSProperties = {
  padding: `6px ${spacingTokens.md}`,
  fontSize: fontTokens.size.md,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  borderRadius: radiusTokens.sm,
  margin: `0 ${spacingTokens.xs}`,
};

const enabledStyle: CSSProperties = {
  ...baseItemStyle,
  cursor: "pointer",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const disabledStyle: CSSProperties = {
  ...baseItemStyle,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  cursor: "default",
};

const dangerStyle: CSSProperties = {
  ...enabledStyle,
  color: `var(--danger, ${colorTokens.accent.danger})`,
};

/**
 * Render a clickable menu item (handles disabled + hover styling).
 */
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
        backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
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
        <span
          style={{
            color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
            fontSize: fontTokens.size.xs,
          }}
        >
          {item.shortcut}
        </span>
      )}
    </div>
  );
}
