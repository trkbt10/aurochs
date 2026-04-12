/**
 * @file Completion Popup Component
 *
 * Displays completion suggestions in a popup.
 * Uses design tokens from @aurochs-ui/ui-components for consistent styling.
 */

import { useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import {
  colorTokens,
  fontTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
} from "@aurochs-ui/ui-components";
import type { CompletionItem, CompletionItemKind } from "../../completion/types";

// =============================================================================
// Icon badge colors (VBA completion kind semantic colors)
// =============================================================================

/**
 * Background color for each completion item kind badge.
 *
 * These are domain-specific semantic colors for VBA code completion:
 * each kind has a distinct color to help users quickly identify the type.
 */
const KIND_BADGE_COLORS: Record<CompletionItemKind, string> = {
  keyword: "#5c6bc0",   // indigo - language keywords
  type: "#26a69a",      // teal - data types
  builtin: "#8d6e63",   // brown - built-in functions
  variable: "#7e57c2",  // purple - variables
  procedure: "#ff7043", // orange - Sub/Function
  property: "#26c6da",  // cyan - properties
  constant: "#9ccc65",  // green - constants
  module: "#78909c",    // grey - modules
};

const KIND_LABELS: Record<CompletionItemKind, string> = {
  keyword: "K",
  type: "T",
  builtin: "F",
  variable: "V",
  procedure: "S",
  property: "P",
  constant: "C",
  module: "M",
};

// =============================================================================
// Styles
// =============================================================================

const MONO_FONT = `"Consolas", "Monaco", "Courier New", monospace`;

const listStyle: CSSProperties = {
  maxHeight: 300,
  overflowY: "auto",
  padding: `${spacingTokens.xs} 0`,
};

const itemBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const itemHighlightedStyle: CSSProperties = {
  ...itemBaseStyle,
  background: `var(--bg-selected, rgba(68, 114, 196, 0.12))`,
};

const labelStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const detailStyle: CSSProperties = {
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  fontSize: fontTokens.size.sm,
  marginLeft: "auto",
  paddingLeft: spacingTokens.sm,
};

const overflowStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.sm,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  borderTop: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  textAlign: "center",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build the icon badge style for a completion kind.
 */
function buildIconBadgeStyle(kind: CompletionItemKind): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    fontSize: fontTokens.size.xs,
    fontWeight: fontTokens.weight.semibold,
    borderRadius: radiusTokens.xs,
    flexShrink: 0,
    background: KIND_BADGE_COLORS[kind],
    color: "#ffffff",
  };
}

// =============================================================================
// Types
// =============================================================================

export type CompletionPopupProps = {
  /** Completion items to display */
  readonly items: readonly CompletionItem[];
  /** Currently highlighted item index */
  readonly highlightedIndex: number;
  /** Position of popup (relative to code editor) */
  readonly position: { x: number; y: number };
  /** Callback when item is selected */
  readonly onSelect: (index: number) => void;
  /** Callback when popup should be dismissed */
  readonly onDismiss: () => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Completion Popup component.
 *
 * Displays a list of completion suggestions.
 */
export function CompletionPopup({
  items,
  highlightedIndex,
  position,
  onSelect,
}: CompletionPopupProps): ReactNode {
  const listRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedRef.current && listRef.current) {
      const list = listRef.current;
      const item = highlightedRef.current;

      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.top < listRect.top) {
        item.scrollIntoView({ block: "start" });
      } else if (itemRect.bottom > listRect.bottom) {
        item.scrollIntoView({ block: "end" });
      }
    }
  }, [highlightedIndex]);

  if (items.length === 0) {
    return null;
  }

  const containerStyle: CSSProperties = {
    position: "absolute",
    zIndex: 150,
    minWidth: 200,
    maxWidth: 400,
    background: `var(--bg-primary, ${colorTokens.background.primary})`,
    border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
    borderRadius: radiusTokens.sm,
    boxShadow: shadowTokens.lg,
    fontFamily: MONO_FONT,
    fontSize: fontTokens.size.lg,
    left: position.x,
    top: position.y,
  };

  return (
    <div style={containerStyle}>
      <div ref={listRef} style={listStyle}>
        {items.slice(0, 50).map((item, index) => {
          const isHighlighted = index === highlightedIndex;

          return (
            <div
              key={`${item.kind}-${item.label}`}
              ref={isHighlighted ? highlightedRef : undefined}
              style={isHighlighted ? itemHighlightedStyle : itemBaseStyle}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onSelect(index)}
            >
              <span style={buildIconBadgeStyle(item.kind)}>
                {KIND_LABELS[item.kind]}
              </span>
              <span style={labelStyle}>{item.label}</span>
              {item.detail && (
                <span style={detailStyle}>{item.detail}</span>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 50 && (
        <div style={overflowStyle}>
          +{items.length - 50} more
        </div>
      )}
    </div>
  );
}
