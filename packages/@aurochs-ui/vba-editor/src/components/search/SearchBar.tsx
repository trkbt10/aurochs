/**
 * @file Search Bar Component
 *
 * Floating search/replace bar for VBA code editor.
 * Uses shared icons and primitives from @aurochs-ui/ui-components.
 */

import {
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type KeyboardEvent,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  IconButton,
  ToggleButton,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  ReplaceIcon,
  ReplaceAllIcon,
  iconTokens,
  colorTokens,
  spacingTokens,
  fontTokens,
  radiusTokens,
  shadowTokens,
} from "@aurochs-ui/ui-components";
import { useVbaEditor } from "../../context/vba-editor";

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "absolute",
  top: spacingTokens.sm,
  right: spacingTokens.lg,
  zIndex: 100,
  display: "flex",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  borderRadius: radiusTokens.md,
  boxShadow: shadowTokens.md,
};

const expandButtonBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  padding: `${spacingTokens["xs-plus"]} ${spacingTokens["2xs"]}`,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  transition: "transform 0.15s ease",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens["xs-plus"],
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const SEARCH_INPUT_FONT = `"Consolas", "Monaco", "Courier New", monospace`;

const inputBaseStyle: CSSProperties = {
  width: 180,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.lg,
  fontFamily: SEARCH_INPUT_FONT,
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  borderRadius: radiusTokens.sm,
  outline: "none",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const inputFocusStyle: CSSProperties = {
  ...inputBaseStyle,
  borderColor: `var(--color-primary, ${colorTokens.accent.primary})`,
  boxShadow: `0 0 0 2px rgba(68, 114, 196, 0.2)`,
};

const matchCountStyle: CSSProperties = {
  minWidth: 60,
  padding: `0 ${spacingTokens.sm}`,
  fontSize: fontTokens.size.md,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const optionsStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens["2xs"],
};

// =============================================================================
// Types
// =============================================================================

export type SearchBarProps = {
  readonly onClose?: () => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Search Bar component.
 *
 * Floating search/replace UI with keyboard navigation.
 */
export function SearchBar({ onClose }: SearchBarProps): ReactNode {
  const { state, dispatch } = useVbaEditor();
  const { search } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [replaceFocused, setReplaceFocused] = useState(false);

  // State for showing replace row
  const showReplace = search.mode === "in-file" && search.replaceText !== "" || false;

  // Focus input on open
  useEffect(() => {
    if (search.isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [search.isOpen]);

  const handleQueryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_SEARCH_QUERY", query: e.target.value });
    },
    [dispatch],
  );

  const handleReplaceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_REPLACE_TEXT", replaceText: e.target.value });
    },
    [dispatch],
  );

  const handleClose = useCallback(() => {
    dispatch({ type: "CLOSE_SEARCH" });
    onClose?.();
  }, [dispatch, onClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          handleClose();
          break;
        case "Enter":
          event.preventDefault();
          dispatch({
            type: "NAVIGATE_MATCH",
            direction: event.shiftKey ? "previous" : "next",
          });
          break;
        case "F3":
          event.preventDefault();
          dispatch({
            type: "NAVIGATE_MATCH",
            direction: event.shiftKey ? "previous" : "next",
          });
          break;
      }
    },
    [dispatch, handleClose],
  );

  const handlePrevious = useCallback(() => {
    dispatch({ type: "NAVIGATE_MATCH", direction: "previous" });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    dispatch({ type: "NAVIGATE_MATCH", direction: "next" });
  }, [dispatch]);

  const handleReplaceCurrent = useCallback(() => {
    dispatch({ type: "REPLACE_CURRENT" });
  }, [dispatch]);

  const handleReplaceAll = useCallback(() => {
    dispatch({ type: "REPLACE_ALL" });
  }, [dispatch]);

  const toggleOption = useCallback(
    (option: "caseSensitive" | "useRegex" | "wholeWord") => {
      dispatch({
        type: "SET_SEARCH_OPTIONS",
        options: { [option]: !search.options[option] },
      });
    },
    [dispatch, search.options],
  );

  const toggleReplace = useCallback(() => {
    if (showReplace) {
      dispatch({ type: "SET_REPLACE_TEXT", replaceText: "" });
    } else {
      replaceInputRef.current?.focus();
    }
  }, [dispatch, showReplace]);

  if (!search.isOpen) {
    return null;
  }

  const matchCount = search.matches.length;
  const currentMatch = search.currentMatchIndex + 1;
  const matchDisplay =
    matchCount > 0 ? `${currentMatch}/${matchCount}` : "No results";

  const iconSize = iconTokens.size.sm;

  const expandStyle: CSSProperties = {
    ...expandButtonBaseStyle,
    transform: showReplace ? "rotate(90deg)" : undefined,
  };

  return (
    <div style={containerStyle} onKeyDown={handleKeyDown}>
      {/* Expand toggle */}
      <button
        type="button"
        style={expandStyle}
        onClick={toggleReplace}
        title="Toggle Replace"
      >
        <ChevronRightIcon size={iconSize} />
      </button>

      <div style={contentStyle}>
        {/* Search input row */}
        <div style={rowStyle}>
          <input
            ref={inputRef}
            type="text"
            style={searchFocused ? inputFocusStyle : inputBaseStyle}
            value={search.query}
            onChange={handleQueryChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Find..."
            autoComplete="off"
            spellCheck={false}
          />

          <span style={matchCountStyle}>{matchDisplay}</span>

          <IconButton
            icon={<ChevronUpIcon size={iconSize} />}
            onClick={handlePrevious}
            variant="ghost"
            size="sm"
            disabled={matchCount === 0}
          />
          <IconButton
            icon={<ChevronDownIcon size={iconSize} />}
            onClick={handleNext}
            variant="ghost"
            size="sm"
            disabled={matchCount === 0}
          />
          <IconButton
            icon={<CloseIcon size={iconSize} />}
            onClick={handleClose}
            variant="ghost"
            size="sm"
          />
        </div>

        {/* Replace row */}
        {showReplace && (
          <div style={rowStyle}>
            <input
              ref={replaceInputRef}
              type="text"
              style={replaceFocused ? inputFocusStyle : inputBaseStyle}
              value={search.replaceText}
              onChange={handleReplaceChange}
              onFocus={() => setReplaceFocused(true)}
              onBlur={() => setReplaceFocused(false)}
              placeholder="Replace..."
              autoComplete="off"
              spellCheck={false}
            />
            <IconButton
              icon={<ReplaceIcon size={iconSize} />}
              onClick={handleReplaceCurrent}
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
            />
            <IconButton
              icon={<ReplaceAllIcon size={iconSize} />}
              onClick={handleReplaceAll}
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
            />
          </div>
        )}

        {/* Options row */}
        <div style={optionsStyle}>
          <ToggleButton
            pressed={search.options.caseSensitive}
            onChange={() => toggleOption("caseSensitive")}
            label="Match Case"
            ariaLabel="Match Case"
          >
            Aa
          </ToggleButton>
          <ToggleButton
            pressed={search.options.wholeWord}
            onChange={() => toggleOption("wholeWord")}
            label="Match Whole Word"
            ariaLabel="Match Whole Word"
          >
            ab
          </ToggleButton>
          <ToggleButton
            pressed={search.options.useRegex}
            onChange={() => toggleOption("useRegex")}
            label="Use Regular Expression"
            ariaLabel="Use Regular Expression"
          >
            .*
          </ToggleButton>
        </div>
      </div>
    </div>
  );
}
