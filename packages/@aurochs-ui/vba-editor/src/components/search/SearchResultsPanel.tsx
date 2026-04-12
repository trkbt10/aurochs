/**
 * @file Search Results Panel
 *
 * Displays project-wide search results grouped by module.
 * Uses shared icons and primitives from @aurochs-ui/ui-components.
 */

import {
  useCallback,
  useState,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import {
  IconButton,
  ChevronRightIcon,
  ChevronDownIcon,
  CloseIcon,
  AddIcon,
  LineIcon,
  FileIcon,
  iconTokens,
  colorTokens,
  fontTokens,
  spacingTokens,
} from "@aurochs-ui/ui-components";
import type { ProjectSearchMatch } from "../../context/vba-editor/types";
import { useVbaEditor } from "../../context/vba-editor";

// =============================================================================
// Styles
// =============================================================================

const MONO_FONT = `"Consolas", "Monaco", "Courier New", monospace`;

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
  borderLeft: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
};

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const totalCountStyle: CSSProperties = {
  marginLeft: spacingTokens["xs-plus"],
  fontWeight: fontTokens.weight.normal,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.xs,
};

const resultsStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

const noResultsStyle: CSSProperties = {
  padding: spacingTokens.xl,
  textAlign: "center",
  fontSize: fontTokens.size.lg,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

const moduleGroupStyle: CSSProperties = {
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const moduleHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens["xs-plus"],
  padding: `${spacingTokens["xs-plus"]} ${spacingTokens.sm}`,
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  cursor: "pointer",
  userSelect: "none",
};

const chevronStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const moduleIconStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  color: `var(--color-primary, ${colorTokens.accent.primary})`,
};

const moduleNameStyle: CSSProperties = {
  flex: 1,
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.medium,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const matchBadgeStyle: CSSProperties = {
  padding: `1px ${spacingTokens["xs-plus"]}`,
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  background: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: "10px",
};

const matchListStyle: CSSProperties = {
  background: `var(--bg-primary, ${colorTokens.background.primary})`,
};

const matchItemBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.xs} ${spacingTokens.sm} ${spacingTokens.xs} 28px`,
  cursor: "pointer",
  fontFamily: MONO_FONT,
  fontSize: fontTokens.size.md,
  lineHeight: "1.4",
};

const matchItemSelectedStyle: CSSProperties = {
  ...matchItemBaseStyle,
  background: `rgba(68, 114, 196, 0.1)`,
};

const lineNumberStyle: CSSProperties = {
  minWidth: 32,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  textAlign: "right",
  flexShrink: 0,
};

const lineTextStyle: CSSProperties = {
  flex: 1,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  whiteSpace: "pre",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const highlightStyle: CSSProperties = {
  background: `var(--search-match-bg, rgba(255, 200, 0, 0.4))`,
  borderRadius: "2px",
};

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
 * Render the expand/collapse chevron icon.
 */
function renderChevron(isExpanded: boolean, size: number): ReactNode {
  if (isExpanded) {
    return <ChevronDownIcon size={size} />;
  }
  return <ChevronRightIcon size={size} />;
}

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
      <span style={highlightStyle}>{match}</span>
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

/**
 * A single module's search results with expandable header.
 */
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

  const iconSize = iconTokens.size.sm - 2; // 12px for compact display

  return (
    <div style={moduleGroupStyle}>
      {/* Module header */}
      <div
        style={moduleHeaderStyle}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span style={chevronStyle}>
          {renderChevron(isExpanded, iconSize)}
        </span>
        <span style={moduleIconStyle}>
          <FileIcon size={iconSize + 2} />
        </span>
        <span style={moduleNameStyle}>{moduleName}</span>
        <span style={matchBadgeStyle}>{matches.length}</span>
      </div>

      {/* Match list */}
      {isExpanded && (
        <div style={matchListStyle}>
          {matches.map((match, index) => {
            const matchKey = `${moduleName}:${match.line}:${match.startColumn}`;
            const isSelected = matchKey === selectedMatchKey;

            return (
              <div
                key={`${match.line}-${match.startColumn}-${index}`}
                style={isSelected ? matchItemSelectedStyle : matchItemBaseStyle}
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
                <span style={lineNumberStyle}>{match.line}</span>
                <span style={lineTextStyle}>
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
// Render helpers
// =============================================================================

type RenderResultsListOptions = {
  readonly hasResults: boolean;
  readonly query: string;
  readonly sortedModuleNames: readonly string[];
  readonly projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>;
  readonly expandedModules: Set<string>;
  readonly handleToggleModule: (moduleName: string) => void;
  readonly handleMatchClick: (moduleName: string, match: ProjectSearchMatch) => void;
  readonly selectedMatchKey: string | undefined;
};

/**
 * Render the results list content.
 */
function renderResultsList(options: RenderResultsListOptions): ReactNode {
  const {
    hasResults, query, sortedModuleNames, projectMatches,
    expandedModules, handleToggleModule, handleMatchClick, selectedMatchKey,
  } = options;
  if (!hasResults) {
    return (
      <div style={noResultsStyle}>
        {query ? "No results found" : "Enter a search term"}
      </div>
    );
  }
  return sortedModuleNames.map((moduleName) => {
    const matches = projectMatches.get(moduleName);
    if (!matches) {
      return null;
    }
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
  });
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
  const actionIconSize = iconTokens.size.sm;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>
          Search Results
          {hasResults && (
            <span style={totalCountStyle}>
              ({search.projectMatchCount} matches in {sortedModuleNames.length} files)
            </span>
          )}
        </span>
        <div style={headerActionsStyle}>
          {hasResults && (
            <>
              <IconButton
                icon={<AddIcon size={actionIconSize} />}
                onClick={handleExpandAll}
                variant="ghost"
                size="sm"
                label="Expand All"
              />
              <IconButton
                icon={<LineIcon size={actionIconSize} />}
                onClick={handleCollapseAll}
                variant="ghost"
                size="sm"
                label="Collapse All"
              />
            </>
          )}
          <IconButton
            icon={<CloseIcon size={actionIconSize} />}
            onClick={handleClose}
            variant="ghost"
            size="sm"
            label="Close"
          />
        </div>
      </div>

      {/* Results */}
      <div style={resultsStyle}>
        {renderResultsList({
          hasResults,
          query: search.query,
          sortedModuleNames,
          projectMatches: search.projectMatches,
          expandedModules,
          handleToggleModule,
          handleMatchClick,
          selectedMatchKey,
        })}
      </div>
    </div>
  );
}
