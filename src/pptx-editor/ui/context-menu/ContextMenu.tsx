/**
 * @file Context menu component
 *
 * A floating context menu that appears at specified coordinates.
 * Uses a portal to render outside the DOM hierarchy.
 * Uses design tokens for consistent styling.
 */

import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MenuEntry } from "./types";
import { ContextMenuItem } from "./ContextMenuItem";
import { ContextMenuSeparator } from "./ContextMenuSeparator";
import { ContextMenuSubmenu } from "./ContextMenuSubmenu";
import { isSeparator, isSubmenu } from "./types";
import { colorTokens, radiusTokens } from "../design-tokens";

export type ContextMenuProps = {
  /** X coordinate (client) */
  readonly x: number;
  /** Y coordinate (client) */
  readonly y: number;
  /** Menu items to display */
  readonly items: readonly MenuEntry[];
  /** Called when a menu item is clicked */
  readonly onAction: (actionId: string) => void;
  /** Called when menu should close */
  readonly onClose: () => void;
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
};

const menuBaseStyle: CSSProperties = {
  position: "fixed",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  borderRadius: radiusTokens.md,
  padding: "4px 0",
  zIndex: 1000,
  minWidth: "160px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

/**
 * Adjust menu position to stay within viewport
 */
function getAdjustedPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number
): { left: number; top: number } {
  const padding = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = getAdjustedHorizontalPosition(x, menuWidth, viewportWidth, padding);
  const top = getAdjustedVerticalPosition(y, menuHeight, viewportHeight, padding);

  return { left, top };
}

function getAdjustedHorizontalPosition(
  x: number,
  menuWidth: number,
  viewportWidth: number,
  padding: number
): number {
  if (x + menuWidth + padding > viewportWidth) {
    const shifted = x - menuWidth;
    return shifted < padding ? padding : shifted;
  }
  return x;
}

function getAdjustedVerticalPosition(
  y: number,
  menuHeight: number,
  viewportHeight: number,
  padding: number
): number {
  if (y + menuHeight + padding > viewportHeight) {
    const shifted = y - menuHeight;
    return shifted < padding ? padding : shifted;
  }
  return y;
}

/**
 * Context menu component
 */
export function ContextMenu({
  x,
  y,
  items,
  onAction,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position after mount
  useEffect(() => {
    if (!menuRef.current) {
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const { left, top } = getAdjustedPosition(x, y, rect.width, rect.height);

    menuRef.current.style.left = `${left}px`;
    menuRef.current.style.top = `${top}px`;
  }, [x, y]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAction = useCallback(
    (actionId: string) => {
      onAction(actionId);
      onClose();
    },
    [onAction, onClose]
  );

  const renderEntry = (entry: MenuEntry, index: number) => {
    if (isSeparator(entry)) {
      return <ContextMenuSeparator key={`sep-${index}`} />;
    }
    if (isSubmenu(entry)) {
      return (
        <ContextMenuSubmenu
          key={entry.id}
          item={entry}
          onAction={handleAction}
        />
      );
    }
    return (
      <ContextMenuItem
        key={entry.id}
        item={entry}
        onClick={handleAction}
      />
    );
  };

  const menuStyle: CSSProperties = {
    ...menuBaseStyle,
    left: x,
    top: y,
  };

  return createPortal(
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div ref={menuRef} style={menuStyle}>
        {items.map(renderEntry)}
      </div>
    </>,
    document.body
  );
}
