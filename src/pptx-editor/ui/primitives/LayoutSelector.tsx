/**
 * @file LayoutSelector - Grid-based layout selection component
 *
 * Displays layouts in a grid with SVG previews for selection.
 */

import { type CSSProperties, useCallback, useState } from "react";
import type { SlideSize, PresentationFile, Shape } from "../../../pptx/domain";
import type { SlideLayoutOption } from "../../../pptx/app";
import { px } from "../../../pptx/domain/types";
import { LayoutThumbnail, useLayoutThumbnails } from "../../thumbnail";
import { colorTokens, fontTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type LayoutSelectorProps = {
  /** Currently selected layout path */
  readonly value?: string;
  /** Available layout options */
  readonly options: readonly SlideLayoutOption[];
  /** Callback when layout is selected */
  readonly onChange: (layoutPath: string) => void;
  /** Slide size for preview */
  readonly slideSize?: SlideSize;
  /** Presentation file for loading layout shapes */
  readonly presentationFile?: PresentationFile;
  /** Disabled state */
  readonly disabled?: boolean;
  /** CSS class */
  readonly className?: string;
  /** CSS style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const DEFAULT_SLIDE_SIZE: SlideSize = { width: px(9144000 / 914.4), height: px(6858000 / 914.4) };

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "var(--bg-secondary, #111111)",
  border: "1px solid var(--border-subtle, #333)",
  borderRadius: "6px",
  color: "var(--text-primary, #fff)",
  fontSize: fontTokens.size.sm,
  outline: "none",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: spacingTokens.xs,
  maxHeight: "200px",
  overflow: "auto",
  padding: "2px",
};

const cardBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: spacingTokens.xs,
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  border: "2px solid transparent",
};

const cardSelectedStyle: CSSProperties = {
  ...cardBaseStyle,
  backgroundColor: `var(--accent-primary, ${colorTokens.accent.primary})20`,
  borderColor: `var(--accent-primary, ${colorTokens.accent.primary})`,
};

const cardUnselectedStyle: CSSProperties = {
  ...cardBaseStyle,
  backgroundColor: "transparent",
  borderColor: "transparent",
};

const cardHoverStyle: CSSProperties = {
  backgroundColor: "var(--bg-tertiary, #1a1a1a)",
};

const cardDisabledStyle: CSSProperties = {
  ...cardBaseStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const labelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

// =============================================================================
// Subcomponents
// =============================================================================

function LayoutSelectorEmpty({ hasOptions }: { hasOptions: boolean }) {
  const message = hasOptions ? "No matching layouts" : "No layouts available";
  return <div style={emptyStyle}>{message}</div>;
}

type LayoutSelectorContentProps = {
  readonly layouts: readonly { value: string; label: string; shapes: readonly Shape[] }[];
  readonly hasOptions: boolean;
  readonly value?: string;
  readonly hoveredPath: string | null;
  readonly slideSize: SlideSize;
  readonly getCardStyle: (isSelected: boolean, isHovered: boolean) => CSSProperties;
  readonly onSelect: (path: string) => void;
  readonly onHover: (path: string | null) => void;
};

function LayoutSelectorContent({
  layouts,
  hasOptions,
  value,
  hoveredPath,
  slideSize,
  getCardStyle,
  onSelect,
  onHover,
}: LayoutSelectorContentProps) {
  if (layouts.length === 0) {
    return <LayoutSelectorEmpty hasOptions={hasOptions} />;
  }

  return (
    <div style={gridStyle}>
      {layouts.map((layout) => {
        const isSelected = layout.value === value;
        const isHovered = layout.value === hoveredPath;

        return (
          <div
            key={layout.value}
            style={getCardStyle(isSelected, isHovered)}
            onClick={() => onSelect(layout.value)}
            onMouseEnter={() => onHover(layout.value)}
            onMouseLeave={() => onHover(null)}
            title={layout.value}
          >
            <LayoutThumbnail shapes={layout.shapes} slideSize={slideSize} width={55} />
            <div style={labelStyle}>{layout.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Grid-based layout selector with SVG previews.
 */
export function LayoutSelector({
  value,
  options,
  onChange,
  slideSize = DEFAULT_SLIDE_SIZE,
  presentationFile,
  disabled,
  className,
  style,
}: LayoutSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Load layout shapes for preview
  const layoutThumbnails = useLayoutThumbnails({
    presentationFile,
    layoutOptions: options,
    slideSize,
  });

  // Filter layouts by search term
  const filteredLayouts = layoutThumbnails.filter((layout) => {
    if (!searchTerm) {
      return true;
    }
    const term = searchTerm.toLowerCase();
    return (
      layout.label.toLowerCase().includes(term) ||
      layout.keywords?.some((k) => k.toLowerCase().includes(term))
    );
  });

  const handleSelect = useCallback(
    (layoutPath: string) => {
      if (disabled) {
        return;
      }
      onChange(layoutPath);
    },
    [disabled, onChange],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const getCardStyle = (isSelected: boolean, isHovered: boolean): CSSProperties => {
    if (disabled) {
      return cardDisabledStyle;
    }
    if (isSelected) {
      return cardSelectedStyle;
    }
    if (isHovered) {
      return { ...cardUnselectedStyle, ...cardHoverStyle };
    }
    return cardUnselectedStyle;
  };

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <input
        type="text"
        placeholder="Search layouts..."
        value={searchTerm}
        onChange={handleSearchChange}
        style={searchInputStyle}
        disabled={disabled}
      />

      <LayoutSelectorContent
        layouts={filteredLayouts}
        hasOptions={options.length > 0}
        value={value}
        hoveredPath={hoveredPath}
        slideSize={slideSize}
        getCardStyle={getCardStyle}
        onSelect={handleSelect}
        onHover={setHoveredPath}
      />
    </div>
  );
}
