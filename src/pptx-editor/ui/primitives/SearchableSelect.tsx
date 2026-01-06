/**
 * @file SearchableSelect primitive component
 *
 * A searchable dropdown component with custom item rendering support.
 * Supports grouping, filtering, and custom preview rendering for each item.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

/**
 * Option item for SearchableSelect
 */
export type SearchableSelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  /** Optional group/category name */
  readonly group?: string;
  /** Optional search keywords (for matching beyond label) */
  readonly keywords?: readonly string[];
};

/**
 * Props for custom item rendering
 */
export type SearchableSelectItemProps<T extends string = string> = {
  readonly option: SearchableSelectOption<T>;
  readonly isSelected: boolean;
  readonly isHighlighted: boolean;
};

/**
 * Props for SearchableSelect component
 */
export type SearchableSelectProps<T extends string = string> = {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly SearchableSelectOption<T>[];
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  /**
   * Custom renderer for each option item.
   * If not provided, renders label only.
   */
  readonly renderItem?: (props: SearchableSelectItemProps<T>) => ReactNode;
  /**
   * Custom renderer for the trigger button value display.
   * If not provided, shows the selected option's label.
   */
  readonly renderValue?: (option: SearchableSelectOption<T>) => ReactNode;
  /** Width of the dropdown panel */
  readonly dropdownWidth?: number | string;
  /** Maximum height of the dropdown list */
  readonly maxHeight?: number;
};

// =============================================================================
// Styles
// =============================================================================

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

const chevronStyle: CSSProperties = {
  marginLeft: "4px",
  flexShrink: 0,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
};

const dropdownStyle = (width: number | string, maxHeight: number): CSSProperties => ({
  position: "fixed",
  zIndex: 1000,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  overflow: "hidden",
  width: typeof width === "number" ? `${width}px` : width,
  maxHeight: `${maxHeight}px`,
  display: "flex",
  flexDirection: "column",
});

const searchContainerStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  border: "none",
  borderRadius: radiusTokens.sm,
  outline: "none",
};

const listStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.xs,
};

const groupHeaderStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  userSelect: "none",
};

function getItemColor(isDisabled: boolean): string {
  if (isDisabled) {
    return `var(--text-tertiary, ${colorTokens.text.tertiary})`;
  }
  return `var(--text-primary, ${colorTokens.text.primary})`;
}

function getItemBackground(isSelected: boolean, isHighlighted: boolean): string {
  if (isHighlighted) {
    return `var(--bg-hover, ${colorTokens.background.hover})`;
  }
  if (isSelected) {
    return "rgba(68, 114, 196, 0.15)";
  }
  return "transparent";
}

function getItemCursor(isDisabled: boolean): string {
  return isDisabled ? "not-allowed" : "pointer";
}

const itemStyle = (isSelected: boolean, isHighlighted: boolean, isDisabled: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.md,
  color: getItemColor(isDisabled),
  backgroundColor: getItemBackground(isSelected, isHighlighted),
  borderRadius: radiusTokens.sm,
  cursor: getItemCursor(isDisabled),
  userSelect: "none",
});

const noResultsStyle: CSSProperties = {
  padding: spacingTokens.md,
  textAlign: "center",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  fontSize: fontTokens.size.sm,
};

// =============================================================================
// Chevron Icon
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

// =============================================================================
// Component
// =============================================================================

/**
 * A searchable dropdown select with custom item rendering support.
 */
export function SearchableSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled,
  className,
  style,
  renderItem,
  renderValue,
  dropdownWidth = 280,
  maxHeight = 320,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options.filter((opt) => !opt.disabled);
    }
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => {
      if (opt.disabled) {
        return false;
      }
      if (opt.label.toLowerCase().includes(query)) {
        return true;
      }
      if (opt.keywords?.some((kw) => kw.toLowerCase().includes(query))) {
        return true;
      }
      return false;
    });
  }, [options, searchQuery]);

  // Group filtered options
  const groupedOptions = useMemo(() => {
    const groups = new Map<string | undefined, SearchableSelectOption<T>[]>();
    for (const opt of filteredOptions) {
      const group = opt.group;
      const existing = groups.get(group);
      if (existing) {
        existing.push(opt);
      } else {
        groups.set(group, [opt]);
      }
    }
    return groups;
  }, [filteredOptions]);

  // Flatten for keyboard navigation
  const flatOptions = useMemo(() => {
    const result: SearchableSelectOption<T>[] = [];
    for (const opts of groupedOptions.values()) {
      result.push(...opts);
    }
    return result;
  }, [groupedOptions]);

  // Position state
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(maxHeight, 400);

    const hasSpaceBelow = spaceBelow >= dropdownHeight;
    const top = hasSpaceBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4;

    setPosition({
      top: Math.max(8, top),
      left: Math.max(8, rect.left),
    });
  }, [maxHeight]);

  // Handle open
  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    setSearchQuery("");
    setHighlightedIndex(0);
  }, [disabled]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
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

  // Handle select
  const handleSelect = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < flatOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (flatOptions[highlightedIndex]) {
            handleSelect(flatOptions[highlightedIndex].value);
          }
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [flatOptions, highlightedIndex, handleSelect, handleClose]
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, updatePosition]);

  // Update position on scroll/resize
  useEffect(() => {
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return;
    }
    const items = listRef.current.querySelectorAll("[data-option-index]");
    const highlighted = items[highlightedIndex];
    if (highlighted instanceof HTMLElement) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, highlightedIndex]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Render trigger content
  function getTriggerContent() {
    if (!selectedOption) {
      return placeholder;
    }
    return renderValue?.(selectedOption) ?? selectedOption.label;
  }
  const triggerContent = getTriggerContent();

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
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {triggerContent}
        </span>
        <ChevronDown />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div style={overlayStyle} onClick={handleClose} />
            <div
              ref={dropdownRef}
              style={{
                ...dropdownStyle(dropdownWidth, maxHeight),
                top: position.top,
                left: position.left,
              }}
              onClick={handleDropdownClick}
              onPointerDown={handleDropdownPointerDown}
            >
              {/* Search input */}
              <div style={searchContainerStyle}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  style={searchInputStyle}
                />
              </div>

              {/* Options list */}
              <div ref={listRef} style={listStyle}>
                {flatOptions.length === 0 && (
                  <div style={noResultsStyle}>No results found</div>
                )}
                {flatOptions.length > 0 &&
                  Array.from(groupedOptions.entries()).map(([group, opts]) => (
                    <div key={group ?? "__ungrouped__"}>
                      {group && <div style={groupHeaderStyle}>{group}</div>}
                      {opts.map((opt) => {
                        const globalIndex = flatOptions.indexOf(opt);
                        const isSelected = opt.value === value;
                        const isHighlighted = globalIndex === highlightedIndex;

                        return (
                          <div
                            key={opt.value}
                            data-option-index={globalIndex}
                            style={itemStyle(isSelected, isHighlighted, !!opt.disabled)}
                            onClick={() => {
                              if (!opt.disabled) {
                                handleSelect(opt.value);
                              }
                            }}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                          >
                            {renderItem?.(
                              { option: opt, isSelected, isHighlighted }
                            ) ?? opt.label}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
