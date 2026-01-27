/**
 * @file ContextMenuSubmenu
 */

import { useCallback, useRef, useState, type CSSProperties } from "react";
import type { MenuSubmenu, MenuEntry } from "./types";
import { ContextMenuItem } from "./ContextMenuItem";
import { ContextMenuSeparator } from "./ContextMenuSeparator";
import { isSeparator, isSubmenu } from "./types";
import { colorTokens, fontTokens, radiusTokens, spacingTokens, iconTokens } from "../design-tokens";
import { ChevronRightIcon } from "../icons";

export type ContextMenuSubmenuProps = {
  readonly item: MenuSubmenu;
  readonly onAction: (actionId: string) => void;
};

const baseItemStyle: CSSProperties = {
  padding: `6px ${spacingTokens.md}`,
  fontSize: fontTokens.size.md,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  borderRadius: radiusTokens.sm,
  margin: `0 ${spacingTokens.xs}`,
  position: "relative",
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

const submenuStyle: CSSProperties = {
  position: "absolute",
  left: "100%",
  top: "-4px",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  borderRadius: radiusTokens.md,
  padding: "4px 0",
  minWidth: "160px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  zIndex: 1001,
};

const chevronStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

/**
 * Render a submenu entry that expands on hover.
 */
export function ContextMenuSubmenu({ item, onAction }: ContextMenuSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!item.disabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsHovered(true);
      setIsOpen(true);
    }
  }, [item.disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
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
        backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
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
      <span style={chevronStyle}>
        <ChevronRightIcon size={iconTokens.size.sm} strokeWidth={iconTokens.strokeWidth} />
      </span>

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
