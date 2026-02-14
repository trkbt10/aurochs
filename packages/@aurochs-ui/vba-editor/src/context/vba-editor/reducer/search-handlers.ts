/**
 * @file Search Action Handlers
 *
 * Handlers for search/replace actions.
 */

import type { VbaEditorState, VbaEditorAction, SearchState, SearchMatch } from "../types";
import { INITIAL_SEARCH_STATE } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";

// =============================================================================
// Handler Type
// =============================================================================

type ActionHandler<A extends VbaEditorAction = VbaEditorAction> = (
  state: VbaEditorState,
  action: A,
) => VbaEditorState;

// =============================================================================
// Search Panel Handlers
// =============================================================================

export const handleOpenSearch: ActionHandler<
  Extract<VbaEditorAction, { type: "OPEN_SEARCH" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      isOpen: true,
      mode: action.mode ?? state.search.mode,
    },
  };
};

export const handleCloseSearch: ActionHandler<
  Extract<VbaEditorAction, { type: "CLOSE_SEARCH" }>
> = (state) => {
  return {
    ...state,
    search: {
      ...state.search,
      isOpen: false,
      matches: [],
      currentMatchIndex: -1,
    },
  };
};

// =============================================================================
// Query and Options Handlers
// =============================================================================

export const handleSetSearchQuery: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_SEARCH_QUERY" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      query: action.query,
      currentMatchIndex: -1, // Reset selection when query changes
    },
  };
};

export const handleSetReplaceText: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_REPLACE_TEXT" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      replaceText: action.replaceText,
    },
  };
};

export const handleSetSearchOptions: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_SEARCH_OPTIONS" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      options: {
        ...state.search.options,
        ...action.options,
      },
      currentMatchIndex: -1, // Reset selection when options change
    },
  };
};

export const handleSetSearchMode: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_SEARCH_MODE" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      mode: action.mode,
      matches: [],
      currentMatchIndex: -1,
      projectMatches: new Map(),
      projectMatchCount: 0,
    },
  };
};

// =============================================================================
// Match Handlers
// =============================================================================

export const handleUpdateMatches: ActionHandler<
  Extract<VbaEditorAction, { type: "UPDATE_MATCHES" }>
> = (state, action) => {
  const newIndex =
    action.matches.length > 0 && state.search.currentMatchIndex === -1
      ? 0
      : state.search.currentMatchIndex >= action.matches.length
        ? action.matches.length - 1
        : state.search.currentMatchIndex;

  return {
    ...state,
    search: {
      ...state.search,
      matches: action.matches,
      currentMatchIndex: newIndex,
    },
  };
};

export const handleUpdateProjectMatches: ActionHandler<
  Extract<VbaEditorAction, { type: "UPDATE_PROJECT_MATCHES" }>
> = (state, action) => {
  return {
    ...state,
    search: {
      ...state.search,
      projectMatches: action.projectMatches,
      projectMatchCount: action.totalCount,
    },
  };
};

export const handleNavigateMatch: ActionHandler<
  Extract<VbaEditorAction, { type: "NAVIGATE_MATCH" }>
> = (state, action) => {
  const { matches, currentMatchIndex } = state.search;
  if (matches.length === 0) {
    return state;
  }

  let newIndex: number;
  if (action.direction === "next") {
    newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
  } else {
    newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
  }

  return {
    ...state,
    search: {
      ...state.search,
      currentMatchIndex: newIndex,
    },
  };
};

export const handleSelectMatch: ActionHandler<
  Extract<VbaEditorAction, { type: "SELECT_MATCH" }>
> = (state, action) => {
  const { matches } = state.search;
  if (action.matchIndex < 0 || action.matchIndex >= matches.length) {
    return state;
  }

  return {
    ...state,
    search: {
      ...state.search,
      currentMatchIndex: action.matchIndex,
    },
  };
};

// =============================================================================
// Replace Handlers
// =============================================================================

/**
 * Get current module source, considering modifications.
 */
function getModuleSource(state: VbaEditorState): string | undefined {
  const { activeModuleName, program, sourceHistory } = state;
  if (!activeModuleName || !program) {
    return undefined;
  }

  const modified = sourceHistory.present.get(activeModuleName);
  if (modified) {
    return modified.source;
  }

  const module = program.modules.find((m) => m.name === activeModuleName);
  return module?.sourceCode;
}

export const handleReplaceCurrent: ActionHandler<
  Extract<VbaEditorAction, { type: "REPLACE_CURRENT" }>
> = (state) => {
  const { search, activeModuleName } = state;
  if (!activeModuleName) {
    return state;
  }

  const { matches, currentMatchIndex, replaceText } = search;
  if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) {
    return state;
  }

  const match = matches[currentMatchIndex];
  const source = getModuleSource(state);
  if (!source) {
    return state;
  }

  // Replace match in source
  const newSource =
    source.slice(0, match.startOffset) +
    replaceText +
    source.slice(match.endOffset);

  // Update source map
  const newSourceMap = new Map(state.sourceHistory.present);
  newSourceMap.set(activeModuleName, {
    source: newSource,
    cursorOffset: match.startOffset + replaceText.length,
  });

  // Recalculate matches - shift offsets for matches after current
  const offsetDelta = replaceText.length - match.text.length;
  const newMatches: SearchMatch[] = [];
  for (let i = 0; i < matches.length; i++) {
    if (i === currentMatchIndex) {
      continue; // Skip replaced match
    }
    const m = matches[i];
    if (m.startOffset > match.startOffset) {
      // Shift offsets
      newMatches.push({
        ...m,
        startOffset: m.startOffset + offsetDelta,
        endOffset: m.endOffset + offsetDelta,
      });
    } else {
      newMatches.push(m);
    }
  }

  // Adjust current index
  const newIndex =
    newMatches.length === 0
      ? -1
      : currentMatchIndex >= newMatches.length
        ? newMatches.length - 1
        : currentMatchIndex;

  return {
    ...state,
    sourceHistory: pushHistory(state.sourceHistory, newSourceMap),
    search: {
      ...search,
      matches: newMatches,
      currentMatchIndex: newIndex,
    },
    pendingCursorOffset: match.startOffset + replaceText.length,
  };
};

export const handleReplaceAll: ActionHandler<
  Extract<VbaEditorAction, { type: "REPLACE_ALL" }>
> = (state) => {
  const { search, activeModuleName } = state;
  if (!activeModuleName) {
    return state;
  }

  const { matches, replaceText } = search;
  if (matches.length === 0) {
    return state;
  }

  const source = getModuleSource(state);
  if (!source) {
    return state;
  }

  // Replace all matches from end to start to preserve offsets
  const sortedMatches = [...matches].sort((a, b) => b.startOffset - a.startOffset);
  let newSource = source;
  for (const match of sortedMatches) {
    newSource =
      newSource.slice(0, match.startOffset) +
      replaceText +
      newSource.slice(match.endOffset);
  }

  // Update source map
  const newSourceMap = new Map(state.sourceHistory.present);
  const lastMatch = matches[matches.length - 1];
  const finalCursorOffset = lastMatch.startOffset + replaceText.length;
  newSourceMap.set(activeModuleName, {
    source: newSource,
    cursorOffset: finalCursorOffset,
  });

  return {
    ...state,
    sourceHistory: pushHistory(state.sourceHistory, newSourceMap),
    search: {
      ...search,
      matches: [],
      currentMatchIndex: -1,
    },
    pendingCursorOffset: finalCursorOffset,
  };
};

// =============================================================================
// Handler Map Export
// =============================================================================

export const SEARCH_HANDLERS = {
  OPEN_SEARCH: handleOpenSearch,
  CLOSE_SEARCH: handleCloseSearch,
  SET_SEARCH_QUERY: handleSetSearchQuery,
  SET_REPLACE_TEXT: handleSetReplaceText,
  SET_SEARCH_OPTIONS: handleSetSearchOptions,
  SET_SEARCH_MODE: handleSetSearchMode,
  UPDATE_MATCHES: handleUpdateMatches,
  UPDATE_PROJECT_MATCHES: handleUpdateProjectMatches,
  NAVIGATE_MATCH: handleNavigateMatch,
  SELECT_MATCH: handleSelectMatch,
  REPLACE_CURRENT: handleReplaceCurrent,
  REPLACE_ALL: handleReplaceAll,
} as const;
