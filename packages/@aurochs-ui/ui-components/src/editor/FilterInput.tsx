/**
 * @file Filter Input Component
 *
 * Xcode-style filter input for filtering lists.
 * Appears at the bottom of list views with search icon.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties, ReactNode, ChangeEvent, KeyboardEvent } from "react";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type FilterInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly onClear?: () => void;
  readonly autoFocus?: boolean;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.primary,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
};

const inputWrapperStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.secondary,
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: radiusTokens.sm,
  transition: "border-color 0.15s",
};

const inputWrapperFocusStyle: CSSProperties = {
  ...inputWrapperStyle,
  borderColor: colorTokens.accent.primary,
};

const inputStyle: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  fontSize: fontTokens.size.sm,
  fontFamily: "inherit",
  color: colorTokens.text.primary,
  minWidth: 0,
};

const iconStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: colorTokens.text.tertiary,
  flexShrink: 0,
};

const clearButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  color: colorTokens.text.tertiary,
  borderRadius: "50%",
  transition: "background-color 0.15s, color 0.15s",
  flexShrink: 0,
};

// =============================================================================
// Icons
// =============================================================================

function SearchIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function FilterInput({
  value,
  onChange,
  placeholder = "Filter",
  onClear,
  autoFocus = false,
  style,
}: FilterInputProps): ReactNode {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [handleClear]
  );

  return (
    <div style={{ ...containerStyle, ...style }}>
      <div style={isFocused ? inputWrapperFocusStyle : inputWrapperStyle}>
        <span style={iconStyle}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            style={clearButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorTokens.background.tertiary;
              e.currentTarget.style.color = colorTokens.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.color = colorTokens.text.tertiary;
            }}
            aria-label="Clear filter"
          >
            <ClearIcon />
          </button>
        )}
      </div>
    </div>
  );
}
