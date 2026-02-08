import { describe, it, expect } from "vitest";
import { applyConstraintsToChildren, resolveInstanceLayout } from "./constraints";
import type { FigNode } from "@aurochs/fig/types";
import { CONSTRAINT_TYPE_VALUES } from "@aurochs/fig/constants";

// =============================================================================
// applyConstraintsToChildren
// =============================================================================

describe("applyConstraintsToChildren", () => {
  function makeNode(x: number, y: number, w: number, h: number, hConstraint?: number, vConstraint?: number): FigNode {
    const node: Record<string, unknown> = {
      name: "child",
      transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
      size: { x: w, y: h },
    };
    if (hConstraint !== undefined) {
      node.horizontalConstraint = { value: hConstraint, name: "TEST" };
    }
    if (vConstraint !== undefined) {
      node.verticalConstraint = { value: vConstraint, name: "TEST" };
    }
    return node as FigNode;
  }

  it("returns same nodes when symbol and instance sizes are equal", () => {
    const children = [makeNode(10, 20, 80, 40)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 200, y: 100 });
    expect(result[0]).toBe(children[0]); // same reference
  });

  it("defaults to MIN when constraints are not set", () => {
    const children = [makeNode(10, 20, 80, 40)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 300, y: 150 });
    // MIN: position and size unchanged
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].transform?.m12).toBe(20);
    expect(result[0].size?.x).toBe(80);
    expect(result[0].size?.y).toBe(40);
  });

  it("applies STRETCH on both axes (full-fit, inset:0)", () => {
    // Child fills entire parent: pos=0, size=200x100
    const children = [makeNode(0, 0, 200, 100, CONSTRAINT_TYPE_VALUES.STRETCH, CONSTRAINT_TYPE_VALUES.STRETCH)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 400, y: 200 });
    expect(result[0].transform?.m02).toBe(0);
    expect(result[0].transform?.m12).toBe(0);
    expect(result[0].size?.x).toBe(400);
    expect(result[0].size?.y).toBe(200);
  });

  it("applies STRETCH with margins", () => {
    // Child: pos=(10, 10), size=(180, 80) in parent=(200, 100)
    // H margins: left=10, right=10 -> newW = 400 - 10 - 10 = 380
    const children = [makeNode(10, 10, 180, 80, CONSTRAINT_TYPE_VALUES.STRETCH, CONSTRAINT_TYPE_VALUES.STRETCH)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 400, y: 200 });
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].transform?.m12).toBe(10);
    expect(result[0].size?.x).toBe(380);
    expect(result[0].size?.y).toBe(180);
  });

  it("applies mixed constraints (H:STRETCH, V:CENTER)", () => {
    const children = [makeNode(10, 30, 180, 40, CONSTRAINT_TYPE_VALUES.STRETCH, CONSTRAINT_TYPE_VALUES.CENTER)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 400, y: 200 });
    // H: STRETCH margins 10,10 -> newW = 400 - 10 - 10 = 380
    expect(result[0].transform?.m02).toBe(10);
    expect(result[0].size?.x).toBe(380);
    // V: CENTER delta=100, shift=50
    expect(result[0].transform?.m12).toBe(80); // 30 + 50
    expect(result[0].size?.y).toBe(40);
  });

  it("applies MAX constraint", () => {
    const children = [makeNode(150, 60, 40, 30, CONSTRAINT_TYPE_VALUES.MAX, CONSTRAINT_TYPE_VALUES.MAX)];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 300, y: 150 });
    // delta H=100, V=50
    expect(result[0].transform?.m02).toBe(250); // 150 + 100
    expect(result[0].transform?.m12).toBe(110); // 60 + 50
    expect(result[0].size?.x).toBe(40);
    expect(result[0].size?.y).toBe(30);
  });

  it("applies SCALE constraint", () => {
    const children = [makeNode(20, 10, 60, 30, CONSTRAINT_TYPE_VALUES.SCALE, CONSTRAINT_TYPE_VALUES.SCALE)];
    // ratio H = 400/200 = 2, V = 300/100 = 3
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 400, y: 300 });
    expect(result[0].transform?.m02).toBe(40); // 20 * 2
    expect(result[0].transform?.m12).toBe(30); // 10 * 3
    expect(result[0].size?.x).toBe(120); // 60 * 2
    expect(result[0].size?.y).toBe(90); // 30 * 3
  });

  it("handles multiple children independently", () => {
    const children = [
      makeNode(0, 0, 100, 50, CONSTRAINT_TYPE_VALUES.STRETCH, CONSTRAINT_TYPE_VALUES.MIN),
      makeNode(120, 60, 60, 30, CONSTRAINT_TYPE_VALUES.MAX, CONSTRAINT_TYPE_VALUES.MAX),
    ];
    const result = applyConstraintsToChildren(children, { x: 200, y: 100 }, { x: 300, y: 150 });
    // Child 0: H:STRETCH(0,100,200->300) -> pos=0, dim=200; V:MIN -> 0,50
    expect(result[0].size?.x).toBe(200); // 300 - 0 - (200-100) = 200
    expect(result[0].size?.y).toBe(50);
    // Child 1: H:MAX delta=100 -> 220; V:MAX delta=50 -> 110
    expect(result[1].transform?.m02).toBe(220);
    expect(result[1].transform?.m12).toBe(110);
  });

  it("skips children without transform or size", () => {
    const noTransform = { name: "no-transform", size: { x: 10, y: 10 } } as FigNode;
    const noSize = { name: "no-size", transform: { m02: 0, m12: 0 } } as FigNode;
    const result = applyConstraintsToChildren([noTransform, noSize], { x: 200, y: 100 }, { x: 300, y: 150 });
    expect(result[0]).toBe(noTransform);
    expect(result[1]).toBe(noSize);
  });
});

// =============================================================================
// resolveInstanceLayout
// =============================================================================

describe("resolveInstanceLayout", () => {
  function makeChild(
    guid: { sessionID: number; localID: number },
    x: number,
    y: number,
    w: number,
    h: number,
    hConstraint?: number,
    vConstraint?: number,
  ): FigNode {
    const node: Record<string, unknown> = {
      name: "child",
      guid,
      transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
      size: { x: w, y: h },
    };
    if (hConstraint !== undefined) {
      node.horizontalConstraint = { value: hConstraint };
    }
    if (vConstraint !== undefined) {
      node.verticalConstraint = { value: vConstraint };
    }
    return node as FigNode;
  }

  it("uses derivedSymbolData when GUIDs match", () => {
    const children = [makeChild({ sessionID: 1, localID: 10 }, 0, 0, 100, 50)];
    const derived = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 10 }] },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0 },
        size: { x: 200, y: 100 },
      },
    ];
    const result = resolveInstanceLayout(children, { x: 100, y: 50 }, { x: 200, y: 100 }, derived);
    expect(result.sizeApplied).toBe(true);
    // Child is covered by dsd, kept as-is (same reference inside array)
    expect(result.children[0]).toBe(children[0]);
  });

  it("falls back to constraints when derivedSymbolData GUIDs do not match", () => {
    const children = [
      makeChild(
        { sessionID: 1, localID: 10 },
        0,
        0,
        100,
        50,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.STRETCH,
      ),
    ];
    // Derived data references a GUID not in children
    const derived = [
      {
        guidPath: { guids: [{ sessionID: 999, localID: 999 }] },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0 },
        size: { x: 200, y: 100 },
      },
    ];
    const result = resolveInstanceLayout(children, { x: 100, y: 50 }, { x: 200, y: 100 }, derived);
    expect(result.sizeApplied).toBe(true);
    // Constraint-based: STRETCH full-fit
    expect(result.children[0].size?.x).toBe(200);
    expect(result.children[0].size?.y).toBe(100);
  });

  it("falls back to constraints when no derivedSymbolData", () => {
    const children = [
      makeChild(
        { sessionID: 1, localID: 10 },
        10,
        10,
        80,
        30,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.STRETCH,
      ),
    ];
    const result = resolveInstanceLayout(children, { x: 100, y: 50 }, { x: 200, y: 100 }, undefined);
    expect(result.sizeApplied).toBe(true);
    expect(result.children[0].size?.x).toBe(180); // 200 - 10 - 10
    expect(result.children[0].size?.y).toBe(80); // 100 - 10 - 10
  });

  it("returns sizeApplied=false when no constraints and no derived data", () => {
    const children = [makeChild({ sessionID: 1, localID: 10 }, 10, 10, 80, 30)];
    const result = resolveInstanceLayout(children, { x: 100, y: 50 }, { x: 200, y: 100 }, undefined);
    expect(result.sizeApplied).toBe(false);
    expect(result.children).toBe(children); // unchanged
  });

  it("supplements constraints for children NOT covered by partial dsd", () => {
    // Scenario: dsd covers child A but not child B.
    // Child B has STRETCH constraints and should be resized.
    const childA = makeChild({ sessionID: 1, localID: 10 }, 0, 0, 48, 48);
    const childB = makeChild(
      { sessionID: 1, localID: 20 },
      0,
      0,
      48,
      48,
      CONSTRAINT_TYPE_VALUES.STRETCH,
      CONSTRAINT_TYPE_VALUES.STRETCH,
    );
    // Give childB fillGeometry to verify it gets cleared
    (childB as Record<string, unknown>).fillGeometry = [{ commandsBlob: 0 }];

    // dsd only covers childA (GUID 1:10), not childB (1:20)
    const derived = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 10 }] },
        size: { x: 44, y: 22 },
      },
    ];

    const result = resolveInstanceLayout(
      [childA, childB],
      { x: 48, y: 48 }, // SYMBOL size
      { x: 44, y: 22 }, // INSTANCE size
      derived,
    );

    expect(result.sizeApplied).toBe(true);

    // childA: covered by dsd, fillGeometry cleared, size unchanged by supplementConstraints
    expect(result.children[0]).toBe(childA);

    // childB: NOT covered by dsd, has STRETCH constraints
    // -> supplementConstraints applies constraint resolution
    // STRETCH full-fit: 48->44 (H), 48->22 (V)
    expect(result.children[1].size?.x).toBe(44);
    expect(result.children[1].size?.y).toBe(22);
    // fillGeometry should be cleared
    expect((result.children[1] as Record<string, unknown>).fillGeometry).toBeUndefined();
  });

  it("does not touch dsd-covered children during constraint supplementation", () => {
    // Both children covered by dsd — no constraint supplementation needed
    const childA = makeChild(
      { sessionID: 1, localID: 10 },
      0,
      0,
      100,
      50,
      CONSTRAINT_TYPE_VALUES.STRETCH,
      CONSTRAINT_TYPE_VALUES.STRETCH,
    );
    const childB = makeChild(
      { sessionID: 1, localID: 20 },
      0,
      0,
      100,
      50,
      CONSTRAINT_TYPE_VALUES.STRETCH,
      CONSTRAINT_TYPE_VALUES.STRETCH,
    );

    const derived = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 10 }] },
        size: { x: 200, y: 100 },
      },
      {
        guidPath: { guids: [{ sessionID: 1, localID: 20 }] },
        size: { x: 200, y: 100 },
      },
    ];

    const result = resolveInstanceLayout([childA, childB], { x: 100, y: 50 }, { x: 200, y: 100 }, derived);

    expect(result.sizeApplied).toBe(true);
    // Both covered by dsd — kept as-is (same references)
    expect(result.children[0]).toBe(childA);
    expect(result.children[1]).toBe(childB);
  });
});
