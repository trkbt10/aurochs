/**
 * @file Pointer utilities tests
 */

import {
  applySelectionRange,
  getSelectionAnchor,
  isPrimaryMouseAction,
  isPrimaryPointerAction,
} from "./pointer-utils";

describe("pointer-utils", () => {
  it("detects primary pointer action for mouse", () => {
    expect(isPrimaryPointerAction({ pointerType: "mouse", button: 0, buttons: 1 })).toBe(true);
    expect(isPrimaryPointerAction({ pointerType: "mouse", button: 1, buttons: 2 })).toBe(false);
  });

  it("detects primary pointer action for non-mouse pointers via buttons bitmask", () => {
    expect(isPrimaryPointerAction({ pointerType: "touch", button: 0, buttons: 1 })).toBe(true);
    expect(isPrimaryPointerAction({ pointerType: "touch", button: 0, buttons: 0 })).toBe(true);
  });

  it("detects primary mouse action", () => {
    expect(isPrimaryMouseAction({ button: 0 })).toBe(true);
    expect(isPrimaryMouseAction({ button: 1 })).toBe(false);
  });

  it("gets selection anchor and applies selection range", () => {
    const textarea = createFakeTextarea();
    textarea.setSelectionRange(1, 4, "backward");

    expect(getSelectionAnchor(textarea)).toBe(4);

    applySelectionRange({ textarea, anchorOffset: 2, focusOffset: 5 });
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(5);
  });
});

function createFakeTextarea() {
  const state = {
    selectionDirection: "none" as "forward" | "backward" | "none",
    selectionStart: 0,
    selectionEnd: 0,
  };

  return {
    get selectionDirection() {
      return state.selectionDirection;
    },
    get selectionStart() {
      return state.selectionStart;
    },
    get selectionEnd() {
      return state.selectionEnd;
    },
    setSelectionRange(
      start: number,
      end: number,
      direction: "forward" | "backward" | "none" = "none",
    ) {
      state.selectionStart = start;
      state.selectionEnd = end;
      state.selectionDirection = direction;
    },
  };
}
