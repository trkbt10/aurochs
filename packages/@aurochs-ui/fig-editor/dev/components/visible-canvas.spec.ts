/** @file Tests for debug canvas visibility rules. */

import type { FigNode } from "@aurochs/fig/types";
import { isUserVisibleCanvasNode } from "./visible-canvas";

function canvasNode(fields: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 1, localID: 1 },
    type: { value: 2, name: "CANVAS" },
    name: "Page",
    ...fields,
  };
}

describe("isUserVisibleCanvasNode", () => {
  it("uses Kiwi internalOnly metadata instead of the canvas name", () => {
    expect(isUserVisibleCanvasNode(canvasNode({ name: "Internal Only Canvas" }))).toBe(true);
    expect(isUserVisibleCanvasNode(canvasNode({ name: "Visible name", internalOnly: true }))).toBe(false);
  });

  it("hides canvases marked invisible by Kiwi visibility", () => {
    expect(isUserVisibleCanvasNode(canvasNode({ visible: false }))).toBe(false);
  });
});
