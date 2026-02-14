/**
 * @file Search Results Panel
 *
 * Displays project-wide search results grouped by module.
 */

import {
  useCallback,
  useState,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import type { ProjectSearchMatch } from "../../context/vba-editor/types";
import { useVbaEditor } from "../../context/vba-editor";
import styles from "./SearchResultsPanel.module.css";

// =============================================================================
// Icons
// =============================================================================

function ChevronRightIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M4 2l4 4-4 4"
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
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModuleIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="2"
        y="2"
        width="10"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M5 5h4M5 7h3M5 9h4" stroke="currentColor" strokeWidth="1" />
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

// =============================================================================
// Types
// =============================================================================

export type SearchResultsPanelProps = {
  readonly onMatchSelect?: (moduleName: string, match: ProjectSearchMatch) => void;
  readonly onClose?: () => void;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Highlight matching text within line.
 */
function highlightMatch(
  lineText: string,
  startColumn: number,
  endColumn: number,
): ReactNode {
  const before = lineText.slice(0, startColumn - 1);
  const match = lineText.slice(startColumn - 1, endColumn - 1);
  const after = lineText.slice(endColumn - 1);

  return (
    <>
      {before}
      <span className={styles.highlight}>{match}</span>
      {after}
    </>
  );
}

// =============================================================================
// Module Result Group
// =============================================================================

type ModuleResultGroupProps = {
  readonly moduleName: string;
  readonly matches: readonly ProjectSearchMatch[];
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly onMatchClick: (match: ProjectSearchMatch) => void;
  readonly selectedMatchKey?: string;
};

function ModuleResultGroup({
  moduleName,
  matches,
  isExpanded,
  onToggle,
  onMatchClick,
  selectedMatchKey,
}: ModuleResultGroupProps): ReactNode {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return (
    <div className={styles.moduleGroup}>
      {/* Module header */}
      <div
        className={styles.moduleHeader}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span className={styles.chevron}>
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span className={styles.moduleIcon}>
          <ModuleIcon />
        </span>
        <span className={styles.moduleName}>{moduleName}</span>
        <span className={styles.matchBadge}>{matches.length}</span>
      </div>

      {/* Match list */}
      {isExpanded && (
        <div className={styles.matchList}>
          {matches.map((match, index) => {
            const matchKey = `${moduleName}:${match.line}:${match.startColumn}`;
            const isSelected = matchKey === selectedMatchKey;

            return (
              <div
                key={`${match.line}-${match.startColumn}-${index}`}
                className={`${styles.matchItem} ${isSelected ? styles.selected : ""}`}
                onClick={() => onMatchClick(match)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onMatchClick(match);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className={styles.lineNumber}>{match.line}</span>
                <span className={styles.lineText}>
                  {highlightMatch(
                    match.lineText,
                    match.startColumn,
                    match.endColumn,
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Search Results Panel
// =============================================================================

/**
 * Search Results Panel.
 *
 * Displays project-wide search results grouped by module.
 */
export function SearchResultsPanel({
  onMatchSelect,
  onClose,
}: SearchResultsPanelProps): ReactNode {
  const { state, dispatch } = useVbaEditor();
  const { search } = state;

  // Track expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(),
  );

  // Track selected match for highlighting
  const [selectedMatchKey, setSelectedMatchKey] = useState<string | undefined>();

  // Get sorted module names
  const sortedModuleNames = useMemo(() => {
    const names = Array.from(search.projectMatches.keys());
    return names.sort((a, b) => a.localeCompare(b));
  }, [search.projectMatches]);

  // Auto-expand all modules when results change
  useMemo(() => {
    setExpandedModules(new Set(sortedModuleNames));
  }, [sortedModuleNames]);

  const handleToggleModule = useCallback((moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  }, []);

  const handleMatchClick = useCallback(
    (moduleName: string, match: ProjectSearchMatch) => {
      // Update selected match key
      setSelectedMatchKey(`${moduleName}:${match.line}:${match.startColumn}`);

      // Select the module
      dispatch({ type: "SELECT_MODULE", moduleName });

      // Notify parent
      onMatchSelect?.(moduleName, match);
    },
    [dispatch, onMatchSelect],
  );

  const handleClose = useCallback(() => {
    dispatch({ type: "CLOSE_SEARCH" });
    onClose?.();
  }, [dispatch, onClose]);

  const handleExpandAll = useCallback(() => {
    setExpandedModules(new Set(sortedModuleNames));
  }, [sortedModuleNames]);

  const handleCollapseAll = useCallback(() => {
    setExpandedModules(new Set());
  }, []);

  // Don't render if not in project-wide mode or no results
  if (!search.isOpen || search.mode !== "project-wide") {
    return null;
  }

  const hasResults = search.projectMatchCount > 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>
          Search Results
          {hasResults && (
            <span className={styles.totalCount}>
              ({search.projectMatchCount} matches in {sortedModuleNames.length} files)
            </span>
          )}
        </span>
        <div className={styles.headerActions}>
          {hasResults && (
            <>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleExpandAll}
                title="Expand All"
              >
                +
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleCollapseAll}
                title="Collapse All"
              >
                -
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className={styles.results}>
        {!hasResults ? (
          <div className={styles.noResults}>
            {search.query ? "No results found" : "Enter a search term"}
          </div>
        ) : (
          sortedModuleNames.map((moduleName) => {
            const matches = search.projectMatches.get(moduleName);
            if (!matches) return null;

            return (
              <ModuleResultGroup
                key={moduleName}
                moduleName={moduleName}
                matches={matches}
                isExpanded={expandedModules.has(moduleName)}
                onToggle={() => handleToggleModule(moduleName)}
                onMatchClick={(match) => handleMatchClick(moduleName, match)}
                selectedMatchKey={selectedMatchKey}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
