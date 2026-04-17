/**
 * @file Tests for raw FigNode to FigDesignNode conversion
 */

import { convertFigNode } from "./tree-to-document";
import type { FigNode, FigPaint } from "@aurochs/fig/types";

const RED_PAINT: FigPaint = {
  type: "SOLID",
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true,
};

const BLUE_PAINT: FigPaint = {
  type: "SOLID",
  color: { r: 0, g: 0, b: 1, a: 1 },
  opacity: 1,
  visible: true,
};

function createFrameNode(fields: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 1, localID: 2 },
    phase: { value: 1, name: "CREATED" },
    type: { value: 3, name: "FRAME" },
    name: "Frame",
    ...fields,
  };
}

describe("convertFigNode", () => {
  it("maps frame backgroundPaints into domain fills", () => {
    const node = createFrameNode({ backgroundPaints: [RED_PAINT] });
    const converted = convertFigNode(node, new Map());

    expect(converted.fills).toEqual([RED_PAINT]);
    expect(converted._raw?.backgroundPaints).toBeUndefined();
  });

  it("keeps fillPaints fallback for builder-generated frames", () => {
    const node = createFrameNode({ fillPaints: [BLUE_PAINT] });
    const converted = convertFigNode(node, new Map());

    expect(converted.fills).toEqual([BLUE_PAINT]);
  });
});
