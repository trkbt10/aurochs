/**
 * @file Context menu component
 *
 * A floating context menu that appears at specified coordinates.
 * Uses a portal to render outside the DOM hierarchy.
 */

import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MenuEntry } from "./types";
import { ContextMenuItem } from "./ContextMenuItem";
import { ContextMenuSeparator } from "./ContextMenuSeparator";
import { ContextMenuSubmenu } from "./ContextMenuSubmenu";
import { isSeparator, isSubmenu } from "./types";

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
  backgroundColor: "var(--bg-primary, #0a0a0a)",
  border: "1px solid var(--border-subtle, #333)",
  borderRadius: "6px",
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

  let left = x;
  let top = y;

  // Adjust horizontal position
  if (x + menuWidth + padding > viewportWidth) {
    left = x - menuWidth;
    if (left < padding) {
      left = padding;
    }
  }

  // Adjust vertical position
  if (y + menuHeight + padding > viewportHeight) {
    top = y - menuHeight;
    if (top < padding) {
      top = padding;
    }
  }

  return { left, top };
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
    if (!menuRef.current) return;

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
