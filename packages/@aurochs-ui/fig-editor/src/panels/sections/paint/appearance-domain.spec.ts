/** @file Shape appearance mutation domain tests. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { applyAppearanceOperation } from "./appearance-domain";

function makeNode(): FigDesignNode {
  return {
    id: "node:1" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

describe("appearance-domain", () => {
  it("treats fill, stroke, and effect edits as shape appearance operations", () => {
    const filled = applyAppearanceOperation(makeNode(), {
      type: "fill-paints",
      operation: { type: "add", kind: "fill" },
    });
    const stroked = applyAppearanceOperation(filled, {
      type: "stroke-paints",
      operation: { type: "add", kind: "stroke" },
    });
    const effected = applyAppearanceOperation(stroked, {
      type: "effects",
      operation: { type: "add", effectType: "DROP_SHADOW" },
    });

    expect(effected.fills).toHaveLength(1);
    expect(effected.strokes).toHaveLength(1);
    expect(effected.strokeWeight).toBe(1);
    expect(effected.effects).toHaveLength(1);
  });

  it("keeps stroke paint removal and stroke weight semantics in one appearance reducer", () => {
    const stroked = applyAppearanceOperation(makeNode(), {
      type: "stroke-paints",
      operation: { type: "add", kind: "stroke" },
    });
    const removed = applyAppearanceOperation(stroked, {
      type: "stroke-paints",
      operation: { type: "remove", index: 0 },
    });

    expect(removed.strokes).toEqual([]);
    expect(removed.strokeWeight).toBe(0);
  });
});
