/**
 * @file useCellEditKeyboard tests
 *
 * Tests for the pure keyboard routing function.
 */

import { getCellEditKeyAction } from "./useCellEditKeyboard";

describe("hooks/useCellEditKeyboard", () => {
  describe("during editing (not composing)", () => {
    it("Enter → commit_and_move down", () => {
      const action = getCellEditKeyAction("Enter", false, false);
      expect(action).toEqual({ type: "commit_and_move", direction: "down" });
    });

    it("Shift+Enter → commit_and_move up", () => {
      const action = getCellEditKeyAction("Enter", true, false);
      expect(action).toEqual({ type: "commit_and_move", direction: "up" });
    });

    it("Tab → commit_and_move right", () => {
      const action = getCellEditKeyAction("Tab", false, false);
      expect(action).toEqual({ type: "commit_and_move", direction: "right" });
    });

    it("Shift+Tab → commit_and_move left", () => {
      const action = getCellEditKeyAction("Tab", true, false);
      expect(action).toEqual({ type: "commit_and_move", direction: "left" });
    });

    it("Escape → cancel", () => {
      const action = getCellEditKeyAction("Escape", false, false);
      expect(action).toEqual({ type: "cancel" });
    });

    it("other keys → passthrough", () => {
      expect(getCellEditKeyAction("a", false, false)).toEqual({ type: "passthrough" });
      expect(getCellEditKeyAction("ArrowLeft", false, false)).toEqual({ type: "passthrough" });
      expect(getCellEditKeyAction("Backspace", false, false)).toEqual({ type: "passthrough" });
    });
  });

  describe("during IME composition", () => {
    it("Enter during composition → undefined (no handling)", () => {
      const action = getCellEditKeyAction("Enter", false, true);
      expect(action).toBeUndefined();
    });

    it("Escape during composition → undefined", () => {
      const action = getCellEditKeyAction("Escape", false, true);
      expect(action).toBeUndefined();
    });

    it("Tab during composition → undefined", () => {
      const action = getCellEditKeyAction("Tab", false, true);
      expect(action).toBeUndefined();
    });

    it("any key during composition → undefined", () => {
      const action = getCellEditKeyAction("a", false, true);
      expect(action).toBeUndefined();
    });
  });
});
