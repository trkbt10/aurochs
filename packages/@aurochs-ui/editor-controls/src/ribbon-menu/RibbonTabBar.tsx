/**
 * @file Ribbon tab bar with inline editing, DnD reorder, and hover-to-switch.
 */

import { useState, useCallback, useRef, type CSSProperties } from "react";
import { CloseIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { TAB_REORDER_MIME } from "./dnd";
import type { RibbonTabDef } from "./types";

// =============================================================================
// Styles
// =============================================================================

const barStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens["2xs"],
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: radiusTokens.sm,
  padding: spacingTokens["2xs"],
  margin: `${spacingTokens.xs} ${spacingTokens.sm} 0`,
  flexShrink: 0,
};

const btnBase: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.md}`,
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  border: "none",
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  transition: "all 150ms ease",
  backgroundColor: "transparent",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  position: "relative",
};

const btnActive: CSSProperties = {
  ...btnBase,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
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

// =============================================================================
// Props
// =============================================================================

export type RibbonTabBarProps = {
  readonly tabs: readonly RibbonTabDef[];
  readonly activeTabId: string;
  readonly customizing: boolean;
  readonly isDraggingItem: boolean;
  readonly onActivate: (tabId: string) => void;
  readonly onAdd: () => void;
  readonly onRemove: (tabId: string) => void;
  readonly onRename: (tabId: string, label: string) => void;
  readonly onReorder: (from: number, to: number) => void;
};

// =============================================================================
// Component
// =============================================================================

/** Tab bar for the ribbon menu. Supports inline rename, DnD reorder, and hover-to-switch. */
export function RibbonTabBar({
  tabs, activeTabId, customizing, isDraggingItem,
  onActivate, onAdd, onRemove, onRename, onReorder,
}: RibbonTabBarProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHover = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  function getTabStyle(isActive: boolean): CSSProperties {
    return isActive ? btnActive : btnBase;
  }

  function handleTabDragStart(idx: number, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(TAB_REORDER_MIME, String(idx));
    setDragFrom(idx);
  }

  function handleTabDragOver(tab: RibbonTabDef, e: React.DragEvent) {
    if (e.dataTransfer.types.includes(TAB_REORDER_MIME)) {
      e.preventDefault();
    }
    if (isDraggingItem && tab.id !== activeTabId) {
      e.preventDefault();
      if (!hoverTimer.current) {
        hoverTimer.current = setTimeout(() => {
          onActivate(tab.id);
          hoverTimer.current = null;
        }, 500);
      }
    }
  }

  function handleTabDrop(idx: number) {
    if (dragFrom !== null && dragFrom !== idx) {
      onReorder(dragFrom, idx);
    }
    setDragFrom(null);
  }

  function handleTabDragEnd() {
    setDragFrom(null);
    clearHover();
  }

  return (
    <div style={barStyle} role="tablist">
      {tabs.map((tab, idx) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTabId}
          style={getTabStyle(tab.id === activeTabId)}
          onClick={() => onActivate(tab.id)}
          draggable={customizing}
          onDragStart={customizing ? (e) => handleTabDragStart(idx, e) : undefined}
          onDragOver={customizing ? (e) => handleTabDragOver(tab, e) : undefined}
          onDragLeave={customizing ? clearHover : undefined}
          onDrop={customizing ? () => handleTabDrop(idx) : undefined}
          onDragEnd={customizing ? handleTabDragEnd : undefined}
        >
          <span
            contentEditable={customizing && renamingId === tab.id}
            suppressContentEditableWarning
            onDoubleClick={customizing ? () => setRenamingId(tab.id) : undefined}
            onBlur={(e) => {
              onRename(tab.id, e.currentTarget.textContent ?? tab.label);
              setRenamingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          >{tab.label}</span>
          {customizing && tabs.length > 1 && (
            <span style={closeBadge} onClick={(e) => { e.stopPropagation(); onRemove(tab.id); }}>
              <CloseIcon size={8} />
            </span>
          )}
        </button>
      ))}
      {customizing && (
        <button type="button" style={btnBase} onClick={onAdd} title="Add tab">+</button>
      )}
    </div>
  );
}
