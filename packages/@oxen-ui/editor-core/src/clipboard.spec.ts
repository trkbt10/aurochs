/**
 * @file Clipboard tests
 */

import {
  createClipboardContent,
  incrementPasteCount,
  markAsCopy,
  markAsCut,
} from "./clipboard";

describe("clipboard", () => {
  it("creates content with pasteCount=0", () => {
    const c = createClipboardContent({ payload: ["a", "b"] as const });
    expect(c.payload).toEqual(["a", "b"]);
    expect(c.pasteCount).toBe(0);
    expect(c.isCut).toBe(false);
  });

  it("increments pasteCount", () => {
    const c0 = createClipboardContent({ payload: 123 });
    const c1 = incrementPasteCount(c0);
    expect(c1.pasteCount).toBe(1);
    expect(c0.pasteCount).toBe(0);
  });

  it("marks cut/copy", () => {
    const c0 = createClipboardContent({ payload: "x" });
    const c1 = markAsCut(c0);
    const c2 = markAsCopy(c1);
    expect(c1.isCut).toBe(true);
    expect(c2.isCut).toBe(false);
  });
});

