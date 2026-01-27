/**
 * @file LayoutSelector - Dropdown-based layout selection component
 *
 * Displays layouts in a dropdown with grid-based SVG previews for selection.
 */

import { type CSSProperties, useCallback, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { px } from "@oxen/ooxml/domain/units";
import type { SlideSize, PresentationFile, Shape } from "@oxen/pptx/domain";
import type { SlideLayoutOption } from "@oxen/pptx/app";
import { LayoutThumbnail, useLayoutThumbnails } from "../../thumbnail";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "@oxen-ui/ui-components/design-tokens";

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

// Trigger button styles
const triggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "5px 8px",
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  border: "none",
  borderRadius: radiusTokens.sm,
  outline: "none",
  cursor: "pointer",
  width: "100%",
  minHeight: "28px",
  textAlign: "left",
};

const triggerDisabledStyle: CSSProperties = {
  ...triggerStyle,
  cursor: "not-allowed",
  opacity: 0.5,
};

const triggerPreviewStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  flex: 1,
  overflow: "hidden",
};

const triggerLabelStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chevronStyle: CSSProperties = {
  marginLeft: "4px",
  flexShrink: 0,
};

// Dropdown styles
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
};

const dropdownStyle: CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  width: "320px",
  maxHeight: "360px",
};

const searchContainerStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: fontTokens.size.sm,
  fontFamily: "inherit",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  border: "none",
  borderRadius: radiusTokens.sm,
  outline: "none",
};

const gridContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.sm,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: spacingTokens.sm,
};

const cardBaseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: spacingTokens.xs,
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  border: "2px solid transparent",
  minWidth: 0,
  overflow: "hidden",
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
  fontSize: "10px",
  color: colorTokens.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
  width: "100%",
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

function ChevronDown() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={chevronStyle}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayoutSelectorEmpty({ hasOptions }: { hasOptions: boolean }) {
  const message = hasOptions ? "No matching layouts" : "No layouts available";
  return <div style={emptyStyle}>{message}</div>;
}

type LayoutSelectorGridProps = {
  readonly layouts: readonly { value: string; label: string; shapes: readonly Shape[] }[];
  readonly hasOptions: boolean;
  readonly value?: string;
  readonly hoveredPath: string | null;
  readonly slideSize: SlideSize;
  readonly getCardStyle: (isSelected: boolean, isHovered: boolean) => CSSProperties;
  readonly onSelect: (path: string) => void;
  readonly onHover: (path: string | null) => void;
};

function LayoutSelectorGrid({
  layouts,
  hasOptions,
  value,
  hoveredPath,
  slideSize,
  getCardStyle,
  onSelect,
  onHover,
}: LayoutSelectorGridProps) {
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
            <LayoutThumbnail shapes={layout.shapes} slideSize={slideSize} width={70} />
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
 * Dropdown-based layout selector with SVG previews.
 * Displays a trigger button that opens a popover with layout grid.
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load layout shapes for preview
  const layoutThumbnails = useLayoutThumbnails({
    presentationFile,
    layoutOptions: options,
    slideSize,
  });

  // Find selected layout
  const selectedLayout = layoutThumbnails.find((l) => l.value === value);

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

  // Calculate dropdown position with viewport boundary clamping
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const padding = 8;

    // Use actual rendered size
    const { width: dropdownWidth, height: dropdownHeight } = dropdownRect;

    // Vertical positioning
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const hasSpaceBelow = spaceBelow >= dropdownHeight + padding;
    const rawTop = hasSpaceBelow ? triggerRect.bottom + 4 : triggerRect.top - dropdownHeight - 4;
    const top = Math.max(padding, Math.min(rawTop, window.innerHeight - dropdownHeight - padding));

    // Horizontal positioning - clamp to viewport
    const left = Math.max(padding, Math.min(triggerRect.left, window.innerWidth - dropdownWidth - padding));

    setPosition({ top, left });
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    setSearchTerm("");
    setHoveredPath(null);
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    setPosition(null);
  }, []);

  const handleSelect = useCallback(
    (layoutPath: string) => {
      if (disabled) {
        return;
      }
      onChange(layoutPath);
      handleClose();
    },
    [disabled, onChange, handleClose],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDropdownPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
    },
    []
  );

  const handleDropdownClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
    },
    []
  );

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

  // Calculate position after render and focus search input
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, updatePosition]);

  // Update position on scroll/resize
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const buttonBaseStyle = disabled ? triggerDisabledStyle : triggerStyle;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={className}
        style={{ ...buttonBaseStyle, ...style }}
      >
        <div style={triggerPreviewStyle}>
          {selectedLayout && (
            <LayoutThumbnail shapes={selectedLayout.shapes} slideSize={slideSize} width={32} />
          )}
          <span style={triggerLabelStyle}>
            {selectedLayout?.label ?? "Select layout..."}
          </span>
        </div>
        <ChevronDown />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div style={overlayStyle} onClick={handleClose} />
            <div
              ref={dropdownRef}
              style={{
                ...dropdownStyle,
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
              onClick={handleDropdownClick}
              onPointerDown={handleDropdownPointerDown}
            >
              {/* Search input */}
              <div style={searchContainerStyle}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search layouts..."
                  style={searchInputStyle}
                />
              </div>

              {/* Layout grid */}
              <div style={gridContainerStyle}>
                <LayoutSelectorGrid
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
            </div>
          </>,
          document.body
        )}
    </>
  );
}
