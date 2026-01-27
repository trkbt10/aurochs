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
  type UIEvent as ReactUIEvent,
} from "react";
import { createPortal } from "react-dom";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

function lowerBound(values: readonly number[], target: number): number {
  const recur = (lo: number, hi: number): number => {
    if (lo >= hi) {
      return lo;
    }
    const mid = Math.floor((lo + hi) / 2);
    if (values[mid] < target) {
      return recur(mid + 1, hi);
    }
    return recur(lo, mid);
  };
  return recur(0, values.length);
}

/**
 * Option item for SearchableSelect
 */
export type SearchableSelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  /**
   * If true, hides this option when the search query is empty.
   * Useful for very large catalogs that should only appear when searching.
   */
  readonly hiddenWhenEmptySearch?: boolean;
  /** Optional group/category name */
  readonly group?: string;
  /** Optional search keywords (for matching beyond label) */
  readonly keywords?: readonly string[];
  /** Optional tags used for UI filtering */
  readonly tags?: readonly string[];
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
  /**
   * Enables virtual-window rendering to avoid constructing a huge DOM.
   *
   * This assumes fixed row heights.
   */
  readonly virtualization?: {
    /** Height of each option row in px */
    readonly itemHeight: number;
    /** Height of each group header row in px (default: 22) */
    readonly headerHeight?: number;
    /** Overscan rows above/below viewport (default: 8) */
    readonly overscan?: number;
  };
  /** Optional test id for the list container */
  readonly listTestId?: string;
  /**
   * Optional tag filter shown inside the dropdown (under the search box).
   * Intended for large lists to narrow by category.
   */
  readonly tagFilter?: {
    readonly tags: readonly { readonly id: string; readonly label: string }[];
    readonly allLabel?: string;
  };
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

const filterRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.xs,
  flexWrap: "wrap",
  marginTop: spacingTokens.xs,
};

const filterChipStyle = (isActive: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  fontSize: fontTokens.size.xs,
  borderRadius: radiusTokens.sm,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  backgroundColor: isActive ? "rgba(68, 114, 196, 0.18)" : `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  cursor: "pointer",
  userSelect: "none",
});

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

function includesActiveTag<T extends string>(opt: SearchableSelectOption<T>, activeTagId: string): boolean {
  // If an option has no tags, treat it as untagged and keep it visible.
  // This keeps utility rows (e.g. Actions) available even when filtering.
  if (!opt.tags || opt.tags.length === 0) {
    return true;
  }
  return opt.tags.includes(activeTagId);
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

const virtualContainerStyle: CSSProperties = {
  position: "relative",
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
  virtualization,
  listTestId,
  tagFilter,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isVirtualized = !!virtualization;
  const virtualItemHeight = virtualization?.itemHeight ?? 0;
  const virtualHeaderHeight = virtualization?.headerHeight ?? 22;
  const virtualOverscan = virtualization?.overscan ?? 8;

  // Find selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const activeTag = activeTagId;
    if (!searchQuery.trim()) {
      return options.filter((opt) => {
        if (opt.hiddenWhenEmptySearch && opt.value !== value) {
          return false;
        }
        if (activeTag && !includesActiveTag(opt, activeTag)) {
          return false;
        }
        return true;
      });
    }
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => {
      if (activeTag && !includesActiveTag(opt, activeTag)) {
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
  }, [options, searchQuery, activeTagId, value]);

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

  type Row =
    | { readonly kind: "header"; readonly group: string; readonly key: string }
    | { readonly kind: "option"; readonly option: SearchableSelectOption<T>; readonly optionIndex: number };

  const rows = useMemo((): readonly Row[] => {
    const optionCounter = { value: 0 };
    const result: Row[] = [];
    for (const [group, opts] of groupedOptions.entries()) {
      if (group) {
        result.push({ kind: "header", group, key: `__group__${group}` });
      }
      for (const opt of opts) {
        const optionIndex = optionCounter.value;
        optionCounter.value += 1;
        result.push({ kind: "option", option: opt, optionIndex });
      }
    }
    return result;
  }, [groupedOptions]);

  const virtualLayout = useMemo(() => {
    if (!isVirtualized) {
      return null;
    }
    if (!Number.isFinite(virtualItemHeight) || virtualItemHeight <= 0) {
      throw new Error('SearchableSelect: "virtualization.itemHeight" must be > 0');
    }
    if (!Number.isFinite(virtualHeaderHeight) || virtualHeaderHeight <= 0) {
      throw new Error('SearchableSelect: "virtualization.headerHeight" must be > 0');
    }
    if (!Number.isFinite(virtualOverscan) || virtualOverscan < 0) {
      throw new Error('SearchableSelect: "virtualization.overscan" must be >= 0');
    }

    const offsets: number[] = [];
    const heights: number[] = [];
    const optionRowIndexByOptionIndex = new Array<number>(flatOptions.length);

    const acc = { offset: 0 };
    rows.forEach((row, rowIndex) => {
      offsets.push(acc.offset);
      const height = row.kind === "header" ? virtualHeaderHeight : virtualItemHeight;
      heights.push(height);
      acc.offset += height;
      if (row.kind === "option") {
        optionRowIndexByOptionIndex[row.optionIndex] = rowIndex;
      }
    });

    const totalHeight = acc.offset;

    const fallbackViewportHeight = Math.max(1, Math.min(maxHeight, 400) - 84);
    const effectiveViewportHeight = viewportHeight > 0 ? viewportHeight : fallbackViewportHeight;

    const overscanPx = virtualOverscan * virtualItemHeight;
    const startOffset = Math.max(0, scrollTop - overscanPx);
    const endOffset = scrollTop + effectiveViewportHeight + overscanPx;

    const startIndex = Math.max(0, lowerBound(offsets, startOffset) - 1);
    const endIndex = Math.min(rows.length, lowerBound(offsets, endOffset) + 1);

    return {
      offsets,
      heights,
      totalHeight,
      optionRowIndexByOptionIndex,
      startIndex,
      endIndex,
      effectiveViewportHeight,
    } as const;
  }, [
    isVirtualized,
    virtualItemHeight,
    virtualHeaderHeight,
    virtualOverscan,
    rows,
    flatOptions.length,
    maxHeight,
    viewportHeight,
    scrollTop,
  ]);

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
    setScrollTop(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [disabled]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setScrollTop(0);
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
          if (flatOptions[highlightedIndex] && !flatOptions[highlightedIndex].disabled) {
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

  const handleListScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const measureViewport = useCallback(() => {
    const next = listRef.current?.clientHeight ?? 0;
    setViewportHeight(next);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    measureViewport();
    window.addEventListener("resize", measureViewport);
    return () => {
      window.removeEventListener("resize", measureViewport);
    };
  }, [isOpen, measureViewport]);

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

  // Keep highlighted option in view
  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return;
    }

    if (!virtualLayout) {
      const items = listRef.current.querySelectorAll("[data-option-index]");
      const highlighted = items[highlightedIndex];
      if (highlighted instanceof HTMLElement) {
        highlighted.scrollIntoView?.({ block: "nearest" });
      }
      return;
    }

    const rowIndex = virtualLayout.optionRowIndexByOptionIndex[highlightedIndex];
    if (rowIndex === undefined) {
      return;
    }
    const top = virtualLayout.offsets[rowIndex] ?? 0;
    const height = virtualLayout.heights[rowIndex] ?? virtualItemHeight;
    const viewTop = listRef.current.scrollTop;
    const viewBottom = viewTop + virtualLayout.effectiveViewportHeight;
    const bottom = top + height;

    if (top < viewTop) {
      listRef.current.scrollTop = top;
    } else if (bottom > viewBottom) {
      listRef.current.scrollTop = Math.max(0, bottom - virtualLayout.effectiveViewportHeight);
    }
  }, [isOpen, highlightedIndex, virtualLayout, virtualItemHeight]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, activeTagId]);

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
                {tagFilter && tagFilter.tags.length > 0 && (
                  <div style={filterRowStyle}>
                    <div
                      role="button"
                      tabIndex={0}
                      style={filterChipStyle(activeTagId === null)}
                      onClick={() => setActiveTagId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveTagId(null);
                        }
                      }}
                    >
                      {tagFilter.allLabel ?? "All"}
                    </div>
                    {tagFilter.tags.map((tag) => (
                      <div
                        key={tag.id}
                        role="button"
                        tabIndex={0}
                        style={filterChipStyle(activeTagId === tag.id)}
                        onClick={() => setActiveTagId(tag.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveTagId(tag.id);
                          }
                        }}
                      >
                        {tag.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options list */}
              <div ref={listRef} style={listStyle} onScroll={handleListScroll} data-testid={listTestId}>
                {rows.length === 0 && <div style={noResultsStyle}>No results found</div>}

                {rows.length > 0 && !virtualLayout && (
                  <>
                    {rows.map((row) => {
                      if (row.kind === "header") {
                        return (
                          <div key={row.key} style={groupHeaderStyle}>
                            {row.group}
                          </div>
                        );
                      }

                      const opt = row.option;
                      const globalIndex = row.optionIndex;
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
                          {renderItem?.({ option: opt, isSelected, isHighlighted }) ?? opt.label}
                        </div>
                      );
                    })}
                  </>
                )}

                {rows.length > 0 && virtualLayout && (
                  <div style={{ ...virtualContainerStyle, height: `${virtualLayout.totalHeight}px` }}>
                    {rows.slice(virtualLayout.startIndex, virtualLayout.endIndex).map((row, localIndex) => {
                      const rowIndex = virtualLayout.startIndex + localIndex;
                      const top = virtualLayout.offsets[rowIndex] ?? 0;
                      const height = virtualLayout.heights[rowIndex] ?? virtualItemHeight;

                      if (row.kind === "header") {
                        return (
                          <div
                            key={`${row.key}:${rowIndex}`}
                            style={{
                              ...groupHeaderStyle,
                              position: "absolute",
                              top: `${top}px`,
                              height: `${height}px`,
                              boxSizing: "border-box",
                              left: 0,
                              right: 0,
                            }}
                          >
                            {row.group}
                          </div>
                        );
                      }

                      const opt = row.option;
                      const globalIndex = row.optionIndex;
                      const isSelected = opt.value === value;
                      const isHighlighted = globalIndex === highlightedIndex;

                      return (
                        <div
                          key={`${opt.value}:${rowIndex}`}
                          data-option-index={globalIndex}
                          style={{
                            ...itemStyle(isSelected, isHighlighted, !!opt.disabled),
                            position: "absolute",
                            top: `${top}px`,
                            height: `${height}px`,
                            boxSizing: "border-box",
                            left: 0,
                            right: 0,
                          }}
                          onClick={() => {
                            if (!opt.disabled) {
                              handleSelect(opt.value);
                            }
                          }}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                        >
                          {renderItem?.({ option: opt, isSelected, isHighlighted }) ?? opt.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
