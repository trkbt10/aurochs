/**
 * @file LayoutSelector - Dropdown-based layout selection component
 *
 * Displays layouts in a dropdown with grid-based SVG previews for selection.
 */

import { type CSSProperties, useCallback, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { LayoutThumbnailData } from "./use-layout-thumbnails";
import { LayoutThumbnail } from "./LayoutThumbnail";
import { LayoutThumbnailPickerGrid } from "./LayoutThumbnailPickerGrid";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type LayoutSelectorProps = {
  /** Currently selected layout path */
  readonly value?: string;
  /** Thumbnail rows (from `useLayoutThumbnails` in the parent). */
  readonly layouts: readonly LayoutThumbnailData[];
  /** True when the presentation exposes at least one layout part (before search filter). */
  readonly hasSourceOptions: boolean;
  /** Callback when layout is selected */
  readonly onChange: (layoutPath: string) => void;
  /** Slide size for preview */
  readonly slideSize?: SlideSize;
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

// =============================================================================
// Subcomponents
// =============================================================================

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={chevronStyle}>
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

// =============================================================================
// Component
// =============================================================================

/**
 * Dropdown-based layout selector with SVG previews.
 * Displays a trigger button that opens a popover with layout grid.
 */
export function LayoutSelector({
  value,
  layouts,
  hasSourceOptions,
  onChange,
  slideSize = DEFAULT_SLIDE_SIZE,
  disabled,
  className,
  style,
}: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLayout = layouts.find((l) => l.value === value);

  const filteredLayouts = layouts.filter((layout) => {
    if (!searchTerm) {
      return true;
    }
    const term = searchTerm.toLowerCase();
    return layout.label.toLowerCase().includes(term) || layout.keywords?.some((k) => k.toLowerCase().includes(term));
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

  const handleDropdownPointerDown = useCallback((event: React.PointerEvent) => {
    event.stopPropagation();
  }, []);

  const handleDropdownClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

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
            <LayoutThumbnail
              shapes={selectedLayout.shapes}
              svg={selectedLayout.svg}
              slideSize={slideSize}
              width={32}
            />
          )}
          <span style={triggerLabelStyle}>{selectedLayout?.label ?? "Select layout..."}</span>
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
                <LayoutThumbnailPickerGrid
                  layouts={filteredLayouts}
                  selectedPath={value}
                  slideSize={slideSize}
                  thumbnailWidth={70}
                  variant="selector"
                  onSelect={handleSelect}
                  disabled={disabled}
                  hasSourceOptions={hasSourceOptions}
                />
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
