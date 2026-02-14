/**
 * @file Search Handlers Tests
 *
 * Tests for search/replace action handlers.
 */

import { describe, expect, it } from "bun:test";
import {
  handleOpenSearch,
  handleCloseSearch,
  handleSetSearchQuery,
  handleNavigateMatch,
  handleReplaceCurrent,
  handleReplaceAll,
} from "./search-handlers";
import { INITIAL_SEARCH_STATE } from "../types";
import type { VbaEditorState, SearchMatch } from "../types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import type { VbaProgramIr } from "@aurochs-office/vba";

// =============================================================================
// Test Helpers
// =============================================================================

const testProgram: VbaProgramIr = {
  project: {
    name: "TestProject",
    helpFile: null,
    helpContext: 0,
    constants: null,
    version: { major: 1, minor: 0 },
  },
  modules: [
    {
      name: "Module1",
      type: "standard",
      sourceCode: "Dim x As Integer\nDim y As Integer\nDim z As Integer",
      procedures: [],
      streamOffset: 0,
    },
  ],
  references: [],
};

function createTestState(
  overrides: Partial<VbaEditorState> = {},
): VbaEditorState {
  return {
    program: testProgram,
    sourceHistory: createHistory(new Map()),
    activeModuleName: "Module1",
    cursor: { line: 1, column: 1 },
    selection: undefined,
    mode: "editing",
    selectedProcedureName: undefined,
    pendingCursorOffset: undefined,
    search: INITIAL_SEARCH_STATE,
    ...overrides,
  };
}

function createMatches(source: string, query: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = source.split("\n");
  let offset = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let idx = 0;
    while ((idx = line.indexOf(query, idx)) !== -1) {
      matches.push({
        startOffset: offset + idx,
        endOffset: offset + idx + query.length,
        line: lineNum + 1,
        startColumn: idx + 1,
        endColumn: idx + query.length + 1,
        text: query,
      });
      idx += 1;
    }
    offset += line.length + 1; // +1 for newline
  }
  return matches;
}

// =============================================================================
// Tests
// =============================================================================

describe("search-handlers", () => {
  describe("handleOpenSearch", () => {
    it("opens search panel", () => {
      const state = createTestState();
      const result = handleOpenSearch(state, { type: "OPEN_SEARCH" });
      expect(result.search.isOpen).toBe(true);
    });

    it("sets search mode when provided", () => {
      const state = createTestState();
      const result = handleOpenSearch(state, {
        type: "OPEN_SEARCH",
        mode: "project-wide",
      });
      expect(result.search.mode).toBe("project-wide");
    });

    it("keeps existing mode when not provided", () => {
      const state = createTestState({
        search: { ...INITIAL_SEARCH_STATE, mode: "project-wide" },
      });
      const result = handleOpenSearch(state, { type: "OPEN_SEARCH" });
      expect(result.search.mode).toBe("project-wide");
    });
  });

  describe("handleCloseSearch", () => {
    it("closes search panel", () => {
      const state = createTestState({
        search: { ...INITIAL_SEARCH_STATE, isOpen: true },
      });
      const result = handleCloseSearch(state, { type: "CLOSE_SEARCH" });
      expect(result.search.isOpen).toBe(false);
    });

    it("clears matches on close", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          isOpen: true,
          matches,
          currentMatchIndex: 1,
        },
      });
      const result = handleCloseSearch(state, { type: "CLOSE_SEARCH" });
      expect(result.search.matches).toHaveLength(0);
      expect(result.search.currentMatchIndex).toBe(-1);
    });
  });

  describe("handleSetSearchQuery", () => {
    it("updates query", () => {
      const state = createTestState();
      const result = handleSetSearchQuery(state, {
        type: "SET_SEARCH_QUERY",
        query: "test",
      });
      expect(result.search.query).toBe("test");
    });

    it("resets current match index when query changes", () => {
      const state = createTestState({
        search: { ...INITIAL_SEARCH_STATE, currentMatchIndex: 5 },
      });
      const result = handleSetSearchQuery(state, {
        type: "SET_SEARCH_QUERY",
        query: "new",
      });
      expect(result.search.currentMatchIndex).toBe(-1);
    });
  });

  describe("handleNavigateMatch", () => {
    it("moves to next match", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
        },
      });
      const result = handleNavigateMatch(state, {
        type: "NAVIGATE_MATCH",
        direction: "next",
      });
      expect(result.search.currentMatchIndex).toBe(1);
    });

    it("moves to previous match", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 2,
        },
      });
      const result = handleNavigateMatch(state, {
        type: "NAVIGATE_MATCH",
        direction: "previous",
      });
      expect(result.search.currentMatchIndex).toBe(1);
    });

    it("wraps to start on next at end", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: matches.length - 1,
        },
      });
      const result = handleNavigateMatch(state, {
        type: "NAVIGATE_MATCH",
        direction: "next",
      });
      expect(result.search.currentMatchIndex).toBe(0);
    });

    it("wraps to end on previous at start", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
        },
      });
      const result = handleNavigateMatch(state, {
        type: "NAVIGATE_MATCH",
        direction: "previous",
      });
      expect(result.search.currentMatchIndex).toBe(matches.length - 1);
    });

    it("does nothing with no matches", () => {
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches: [],
          currentMatchIndex: -1,
        },
      });
      const result = handleNavigateMatch(state, {
        type: "NAVIGATE_MATCH",
        direction: "next",
      });
      expect(result).toBe(state);
    });
  });

  describe("handleReplaceCurrent", () => {
    it("replaces current match", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Public",
        },
      });

      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });

      const newSource = result.sourceHistory.present.get("Module1")?.source;
      expect(newSource).toBeDefined();
      expect(newSource?.startsWith("Public")).toBe(true);
    });

    it("removes replaced match from list", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const originalCount = matches.length;
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Public",
        },
      });

      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });
      expect(result.search.matches.length).toBe(originalCount - 1);
    });

    it("adjusts offsets of subsequent matches", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "X", // Shorter than "Dim"
        },
      });

      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });
      const secondMatch = result.search.matches[0]; // Was index 1, now 0
      // Offset should be reduced by (3 - 1) = 2
      expect(secondMatch.startOffset).toBe(matches[1].startOffset - 2);
    });

    it("sets pending cursor to end of replacement", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Public",
        },
      });

      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });
      expect(result.pendingCursorOffset).toBe(0 + "Public".length);
    });

    it("does nothing without active module", () => {
      const state = createTestState({
        activeModuleName: undefined,
      });
      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });
      expect(result).toBe(state);
    });

    it("does nothing with invalid match index", () => {
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches: [],
          currentMatchIndex: -1,
          replaceText: "test",
        },
      });
      const result = handleReplaceCurrent(state, { type: "REPLACE_CURRENT" });
      expect(result).toBe(state);
    });
  });

  describe("handleReplaceAll", () => {
    it("replaces all matches", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Private",
        },
      });

      const result = handleReplaceAll(state, { type: "REPLACE_ALL" });

      const newSource = result.sourceHistory.present.get("Module1")?.source;
      expect(newSource).toBeDefined();
      expect(newSource).not.toContain("Dim");
      expect((newSource?.match(/Private/g) ?? []).length).toBe(3);
    });

    it("clears all matches after replace", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Private",
        },
      });

      const result = handleReplaceAll(state, { type: "REPLACE_ALL" });
      expect(result.search.matches).toHaveLength(0);
      expect(result.search.currentMatchIndex).toBe(-1);
    });

    it("adds to history for undo", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "Private",
        },
      });

      const result = handleReplaceAll(state, { type: "REPLACE_ALL" });
      expect(result.sourceHistory.past.length).toBe(1);
    });

    it("does nothing with no matches", () => {
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches: [],
          replaceText: "test",
        },
      });
      const result = handleReplaceAll(state, { type: "REPLACE_ALL" });
      expect(result).toBe(state);
    });

    it("handles replace with empty string", () => {
      const source = testProgram.modules[0].sourceCode;
      const matches = createMatches(source, "Dim ");
      const state = createTestState({
        search: {
          ...INITIAL_SEARCH_STATE,
          matches,
          currentMatchIndex: 0,
          replaceText: "",
        },
      });

      const result = handleReplaceAll(state, { type: "REPLACE_ALL" });
      const newSource = result.sourceHistory.present.get("Module1")?.source;
      expect(newSource).not.toContain("Dim ");
    });
  });
});
