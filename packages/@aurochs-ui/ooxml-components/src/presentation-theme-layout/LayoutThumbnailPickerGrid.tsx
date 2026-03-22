/**
 * @file LayoutThumbnailPickerGrid — reusable layout-part thumbnail grid
 *
 * Shared by `LayoutSelector` (dropdown), `LayoutInfoPanel` (read-only catalog), and
 * `SlideLayoutEditor` (inline POTX picker) so preview styling stays consistent.
 */

import { useState, type CSSProperties } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { LayoutThumbnail } from "./LayoutThumbnail";
import type { LayoutThumbnailData } from "./use-layout-thumbnails";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailPickerGridProps = {
  readonly layouts: readonly LayoutThumbnailData[];
  /** Highlighted layout part path (active slide / active POTX layout). */
  readonly selectedPath?: string;
  readonly slideSize: SlideSize;
  readonly thumbnailWidth?: number;
  /**
   * `selector`: fixed 3-column grid (dropdown popover).
   * `inspector`: responsive auto-fill (side panel catalog).
   */
  readonly variant: "selector" | "inspector";
  /** When set, clicking a card selects that layout part. Omit for read-only. */
  readonly onSelect?: (layoutPath: string) => void;
  readonly disabled?: boolean;
  /**
   * When `layouts` is empty: if true, assume filters removed all matches; if false, no layouts exist.
   */
  readonly hasSourceOptions: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const emptyStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const labelStyle: CSSProperties = {
  fontSize: "10px",
  color: colorTokens.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
  width: "100%",
  marginTop: "2px",
};

const gridSelectorStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: spacingTokens.sm,
};

const gridInspectorStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
};

const cardBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  padding: spacingTokens.xs,
  borderRadius: "6px",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  minWidth: 0,
  overflow: "hidden",
};

function cardInteractiveBase(interactive: boolean): CSSProperties {
  if (!interactive) {
    return { ...cardBaseStyle, cursor: "default", border: "2px solid transparent" };
  }
  return {
    ...cardBaseStyle,
    cursor: "pointer",
    border: "2px solid transparent",
  };
}

function cardSelectedStyle(interactive: boolean): CSSProperties {
  return {
    ...cardInteractiveBase(interactive),
    backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})20`,
    border: `2px solid var(--accent-primary, ${colorTokens.accent.primary})`,
  };
}

function cardUnselectedStyle(interactive: boolean): CSSProperties {
  return {
    ...cardInteractiveBase(interactive),
    backgroundColor: interactive ? "transparent" : colorTokens.background.secondary,
    border: "2px solid transparent",
  };
}

const cardHoverStyle: CSSProperties = {
  backgroundColor: "var(--bg-tertiary, #1a1a1a)",
};

const cardDisabledStyle: CSSProperties = {
  ...cardInteractiveBase(true),
  opacity: 0.5,
  cursor: "not-allowed",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Grid of layout thumbnails — selectable or read-only depending on `onSelect`.
 */
export function LayoutThumbnailPickerGrid({
  layouts,
  selectedPath,
  slideSize,
  thumbnailWidth = 70,
  variant,
  onSelect,
  disabled,
  hasSourceOptions,
}: LayoutThumbnailPickerGridProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const interactive = onSelect !== undefined && !disabled;
  const gridStyle = variant === "selector" ? gridSelectorStyle : gridInspectorStyle;

  if (layouts.length === 0) {
    const message = hasSourceOptions ? "No matching layouts" : "No layouts available";
    return <div style={emptyStyle}>{message}</div>;
  }

  const resolveCardStyle = (isSelected: boolean, isHovered: boolean): CSSProperties => {
    if (disabled && onSelect !== undefined) {
      return cardDisabledStyle;
    }
    if (isSelected) {
      return cardSelectedStyle(interactive);
    }
    if (interactive && isHovered) {
      return { ...cardUnselectedStyle(true), ...cardHoverStyle };
    }
    return cardUnselectedStyle(interactive);
  };

  return (
    <div style={gridStyle}>
      {layouts.map((layout) => {
        const isSelected = layout.value === selectedPath;
        const isHovered = layout.value === hoveredPath;

        return (
          <div
            key={layout.value}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            style={resolveCardStyle(isSelected, isHovered)}
            title={layout.value}
            onClick={() => {
              if (!interactive) {
                return;
              }
              onSelect(layout.value);
            }}
            onKeyDown={(e) => {
              if (!interactive) {
                return;
              }
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(layout.value);
              }
            }}
            onMouseEnter={() => interactive && setHoveredPath(layout.value)}
            onMouseLeave={() => interactive && setHoveredPath(null)}
          >
            <LayoutThumbnail
              shapes={layout.shapes}
              svg={layout.svg}
              slideSize={slideSize}
              width={thumbnailWidth}
            />
            <div style={labelStyle}>{layout.label}</div>
          </div>
        );
      })}
    </div>
  );
}
