/**
 * @file Search Bar Component
 *
 * Floating search/replace bar for VBA code editor.
 */

import {
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { IconButton } from "@aurochs-ui/ui-components/primitives";
import { useVbaEditor } from "../../context/vba-editor";
import styles from "./SearchBar.module.css";

// =============================================================================
// Icons
// =============================================================================

function ChevronUpIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 9l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplaceIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 7h10M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplaceAllIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 5h10M8 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 9h10M8 5l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Search Bar Component
// =============================================================================

export type SearchBarProps = {
  readonly onClose?: () => void;
};

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
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey) {
          dispatch({ type: "NAVIGATE_MATCH", direction: "previous" });
        } else {
          dispatch({ type: "NAVIGATE_MATCH", direction: "next" });
        }
      } else if (event.key === "F3") {
        event.preventDefault();
        dispatch({
          type: "NAVIGATE_MATCH",
          direction: event.shiftKey ? "previous" : "next",
        });
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

  return (
    <div className={styles.container} onKeyDown={handleKeyDown}>
      {/* Expand toggle */}
      <button
        type="button"
        className={`${styles.expandButton} ${showReplace ? styles.expanded : ""}`}
        onClick={toggleReplace}
        title="Toggle Replace"
      >
        <ExpandIcon />
      </button>

      <div className={styles.content}>
        {/* Search input row */}
        <div className={styles.row}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={search.query}
            onChange={handleQueryChange}
            placeholder="Find..."
            autoComplete="off"
            spellCheck={false}
          />

          <span className={styles.matchCount}>{matchDisplay}</span>

          <IconButton
            icon={<ChevronUpIcon />}
            onClick={handlePrevious}
            variant="ghost"
            size="sm"
            disabled={matchCount === 0}
          />
          <IconButton
            icon={<ChevronDownIcon />}
            onClick={handleNext}
            variant="ghost"
            size="sm"
            disabled={matchCount === 0}
          />
          <IconButton
            icon={<CloseIcon />}
            onClick={handleClose}
            variant="ghost"
            size="sm"
          />
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className={styles.row}>
            <input
              ref={replaceInputRef}
              type="text"
              className={styles.input}
              value={search.replaceText}
              onChange={handleReplaceChange}
              placeholder="Replace..."
              autoComplete="off"
              spellCheck={false}
            />
            <IconButton
              icon={<ReplaceIcon />}
              onClick={handleReplaceCurrent}
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
            />
            <IconButton
              icon={<ReplaceAllIcon />}
              onClick={handleReplaceAll}
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
            />
          </div>
        )}

        {/* Options row */}
        <div className={styles.options}>
          <button
            type="button"
            className={`${styles.optionButton} ${search.options.caseSensitive ? styles.active : ""}`}
            onClick={() => toggleOption("caseSensitive")}
            title="Match Case"
          >
            Aa
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${search.options.wholeWord ? styles.active : ""}`}
            onClick={() => toggleOption("wholeWord")}
            title="Match Whole Word"
          >
            ab
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${search.options.useRegex ? styles.active : ""}`}
            onClick={() => toggleOption("useRegex")}
            title="Use Regular Expression"
          >
            .*
          </button>
        </div>
      </div>
    </div>
  );
}
