/**
 * @file Project Search Hook Tests
 */

import { describe, expect, it } from "vitest";
import { getModuleMatches, getAllMatches } from "./use-project-search";
import type { ProjectSearchMatch } from "../context/vba-editor/types";

// =============================================================================
// Test Data
// =============================================================================

const createMatch = (
  moduleName: string,
  line: number,
  text: string,
): ProjectSearchMatch => ({
  moduleName,
  line,
  startColumn: 1,
  endColumn: text.length + 1,
  startOffset: 0,
  endOffset: text.length,
  text,
  lineText: text,
});

const testMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]> = new Map([
  ["Module1", [createMatch("Module1", 1, "Dim x"), createMatch("Module1", 5, "Dim y")]],
  ["Module2", [createMatch("Module2", 3, "Dim z")]],
]);

// =============================================================================
// Tests
// =============================================================================

describe("use-project-search", () => {
  describe("getModuleMatches", () => {
    it("returns matches for existing module", () => {
      const matches = getModuleMatches(testMatches, "Module1");
      expect(matches).toHaveLength(2);
      expect(matches[0].text).toBe("Dim x");
      expect(matches[1].text).toBe("Dim y");
    });

    it("returns empty array for non-existent module", () => {
      const matches = getModuleMatches(testMatches, "NonExistent");
      expect(matches).toHaveLength(0);
    });

    it("returns matches for another module", () => {
      const matches = getModuleMatches(testMatches, "Module2");
      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe("Dim z");
    });
  });

  describe("getAllMatches", () => {
    it("returns all matches from all modules", () => {
      const all = getAllMatches(testMatches);
      expect(all).toHaveLength(3);
    });

    it("returns empty array for empty map", () => {
      const all = getAllMatches(new Map());
      expect(all).toHaveLength(0);
    });

    it("preserves module name in matches", () => {
      const all = getAllMatches(testMatches);
      const moduleNames = all.map((m) => m.moduleName);
      expect(moduleNames).toContain("Module1");
      expect(moduleNames).toContain("Module2");
    });
  });
});
