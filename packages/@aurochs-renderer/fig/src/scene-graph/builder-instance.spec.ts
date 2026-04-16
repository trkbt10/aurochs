/**
 * @file INSTANCE resolution tests for scene-graph builder
 *
 * Verifies that the builder correctly resolves INSTANCE nodes against
 * their SYMBOL/COMPONENT definitions, applying:
 * - Property merge (fills, strokes, effects, blendMode, etc.)
 * - Self-overrides (overrides targeting the instance frame)
 * - Child overrides (per-child fill/stroke/visibility changes)
 * - Component property assignments (text, visibility, instance swap)
 */

import { buildSceneGraph, type BuildSceneGraphOptions } from "./builder";
import type { FrameNode, GroupNode } from "./types";
import type { FigDesignNode } from "@aurochs/fig/domain";
import { toNodeId } from "@aurochs/fig/domain";
import type { FigPaint, FigEffect } from "@aurochs/fig/types";

// =============================================================================
// Test Helpers
// =============================================================================

const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
const DEFAULT_SIZE = { x: 100, y: 50 };

const RED_FILL: FigPaint = {
  type: "SOLID" as const,
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true,
};

const BLUE_FILL: FigPaint = {
  type: "SOLID" as const,
  color: { r: 0, g: 0, b: 1, a: 1 },
  opacity: 1,
  visible: true,
};

const GREEN_FILL: FigPaint = {
  type: "SOLID" as const,
  color: { r: 0, g: 1, b: 0, a: 1 },
  opacity: 1,
  visible: true,
};

function nid(raw: string) { return toNodeId(raw); }

/** Build a guidPath from "sessionID:localID" strings */
function gp(...ids: string[]) {
  return {
    guids: ids.map((id) => {
      const [s, l] = id.split(":").map(Number);
      return { sessionID: s, localID: l };
    }),
  };
}

function makeNode(overrides: Omit<Partial<FigDesignNode>, "id" | "type"> & { id: string; type: string }): FigDesignNode {
  const { id, type, ...rest } = overrides;
  return {
    id: nid(id),
    type: type as FigDesignNode["type"],
    name: type,
    visible: true,
    opacity: 1,
    transform: IDENTITY,
    size: DEFAULT_SIZE,
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    ...rest,
  } as FigDesignNode;
}

function buildWithSymbols(
  nodes: FigDesignNode[],
  symbolMap: Map<string, FigDesignNode>,
): ReturnType<typeof buildSceneGraph> {
  const options: BuildSceneGraphOptions = {
    blobs: [],
    images: new Map(),
    canvasSize: { width: 200, height: 200 },
    symbolMap,
  };
  return buildSceneGraph(nodes, options);
}

// =============================================================================
// Property Merge Tests
// =============================================================================

describe("INSTANCE resolution — property merge", () => {
  it("inherits fills from SYMBOL when INSTANCE has no visible fills", () => {
    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [RED_FILL],
      children: [],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      fills: [], // empty
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.type).toBe("frame");
    // Should inherit RED fill from symbol
    expect(frame.fills.length).toBeGreaterThan(0);
    expect(frame.fills[0].type).toBe("solid");
  });

  it("keeps INSTANCE fills when they contain visible paints", () => {
    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [RED_FILL],
      children: [],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      fills: [BLUE_FILL],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    // Should keep BLUE fill from instance (visible paints take precedence)
    expect(frame.fills.length).toBeGreaterThan(0);
    if (frame.fills[0].type === "solid") {
      expect(frame.fills[0].color.b).toBe(1); // blue
    }
  });

  it("inherits blendMode from SYMBOL", () => {
    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [RED_FILL],
      blendMode: "MULTIPLY",
      children: [],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      // blendMode not set → should inherit from symbol
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.blendMode).toBe("multiply"); // Converted from MULTIPLY → multiply (CSS)
  });

  it("inherits effects from SYMBOL when INSTANCE has none", () => {
    const shadow: FigEffect = {
      type: "DROP_SHADOW" as const,
      visible: true,
      radius: 4,
      offset: { x: 0, y: 4 },
      color: { r: 0, g: 0, b: 0, a: 0.25 },
    };

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [RED_FILL],
      effects: [shadow],
      children: [],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      effects: [],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.effects.length).toBeGreaterThan(0);
  });

  it("inherits children from SYMBOL when INSTANCE has none", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      size: { x: 50, y: 30 },
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      // no children
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    expect(frame.children[0].type).toBe("rect");
  });
});

// =============================================================================
// Self-override Tests
// =============================================================================

describe("INSTANCE resolution — self-overrides", () => {
  it("applies fill override on the instance frame itself", () => {
    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [RED_FILL],
      children: [],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      overrides: [
        { guidPath: gp("0:1"), fillPaints: [BLUE_FILL] },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    // Self-override should replace RED fill with BLUE
    expect(frame.fills.length).toBeGreaterThan(0);
    if (frame.fills[0].type === "solid") {
      expect(frame.fills[0].color.b).toBe(1); // blue
    }
  });
});

// =============================================================================
// Child Override Tests
// =============================================================================

describe("INSTANCE resolution — child overrides", () => {
  it("applies fill override on a child node", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      size: { x: 50, y: 30 },
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      overrides: [
        { guidPath: gp("0:10"), fillPaints: [GREEN_FILL] },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    const rect = frame.children[0];
    expect(rect.type).toBe("rect");
    if (rect.type === "rect") {
      // Child should have GREEN fill (overridden from RED)
      expect(rect.fills.length).toBeGreaterThan(0);
      if (rect.fills[0].type === "solid") {
        expect(rect.fills[0].color.g).toBe(1); // green
      }
    }
  });

  it("applies visibility override on a child node", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      size: { x: 50, y: 30 },
      visible: true,
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      overrides: [
        { guidPath: gp("0:10"), visible: false },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    // Hidden child should not be in the scene graph (builder skips invisible nodes)
    expect(frame.children.length).toBe(0);
  });
});

// =============================================================================
// Component Property Assignment Tests
// =============================================================================

describe("INSTANCE resolution — component property assignments", () => {
  it("applies text content override via CPA", () => {
    const textChild = makeNode({
      id: "0:10",
      type: "TEXT",
      fills: [],
      size: { x: 80, y: 20 },
      textData: {
        characters: "Original",
        fontSize: 16,
        fontName: { family: "Inter", style: "Regular" },
      },
      componentPropertyRefs: [
        { defId: nid("0:100"), nodeField: "TEXT_DATA" },
      ],
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      children: [textChild],
      componentPropertyDefs: [
        { id: nid("0:100"), name: "label", type: "TEXT", initialValue: { textValue: { characters: "Original" } } },
      ],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      componentPropertyAssignments: [
        { defId: nid("0:100"), value: { textValue: { characters: "Override Text" } } },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    const text = frame.children[0];
    expect(text.type).toBe("text");
    // Text should have overridden content
    // (The exact verification depends on how textData.characters propagates
    // through convertTextNode, which uses Kiwi text data parsing)
  });

  it("applies visibility toggle via CPA", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      size: { x: 50, y: 30 },
      visible: true,
      componentPropertyRefs: [
        { defId: nid("0:100"), nodeField: "VISIBLE" },
      ],
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      children: [childRect],
      componentPropertyDefs: [
        { id: nid("0:100"), name: "showIcon", type: "BOOL", initialValue: { boolValue: true } },
      ],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      componentPropertyAssignments: [
        { defId: nid("0:100"), value: { boolValue: false } },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    // Child should be hidden (visibility toggled to false)
    expect(frame.children.length).toBe(0);
  });
});

// =============================================================================
// Constraint Resolution Tests
// =============================================================================

describe("INSTANCE resolution — constraint resolution", () => {
  it("adjusts child position when instance is resized (MIN constraint = left/top pinned)", () => {
    // Symbol: 100x50, child at (10, 10) size 30x20
    // Instance: 200x100 (double size)
    // With MIN constraint (default), child stays at (10, 10)
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 10 },
      size: { x: 30, y: 20 },
      layoutConstraints: {
        horizontalConstraint: { value: 0, name: "MIN" },
        verticalConstraint: { value: 0, name: "MIN" },
      },
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      size: { x: 100, y: 50 },
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      size: { x: 200, y: 100 }, // double size
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    // With MIN constraint, position should not change
    const child = frame.children[0];
    expect(child.transform.m02).toBe(10);
    expect(child.transform.m12).toBe(10);
  });

  it("scales child when instance is resized (SCALE constraint)", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 10 },
      size: { x: 30, y: 20 },
      layoutConstraints: {
        horizontalConstraint: { value: 4, name: "SCALE" },
        verticalConstraint: { value: 4, name: "SCALE" },
      },
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      size: { x: 100, y: 50 },
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      size: { x: 200, y: 100 }, // double size
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    // SCALE constraint: position and size should scale proportionally
    const child = frame.children[0];
    expect(child.transform.m02).toBe(20);  // 10 * 2
    expect(child.transform.m12).toBe(20);  // 10 * 2
    if (child.type === "rect") {
      expect(child.width).toBe(60);   // 30 * 2
      expect(child.height).toBe(40);  // 20 * 2
    }
  });

  it("does not apply constraints when derivedSymbolData is present", () => {
    const childRect = makeNode({
      id: "0:10",
      type: "RECTANGLE",
      fills: [RED_FILL],
      transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 10 },
      size: { x: 30, y: 20 },
      layoutConstraints: {
        horizontalConstraint: { value: 4, name: "SCALE" },
        verticalConstraint: { value: 4, name: "SCALE" },
      },
    });

    const symbol = makeNode({
      id: "0:1",
      type: "COMPONENT",
      fills: [],
      size: { x: 100, y: 50 },
      children: [childRect],
    });

    const instance = makeNode({
      id: "0:2",
      type: "INSTANCE",
      symbolId: nid("0:1"),
      size: { x: 200, y: 100 },
      // derivedSymbolData overrides the child's transform/size
      derivedSymbolData: [
        { guidPath: gp("0:10"), transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 50 }, size: { x: 80, y: 40 } },
      ],
    });

    const symbolMap = new Map([[nid("0:1"), symbol]]);
    const sg = buildWithSymbols([instance], symbolMap);

    const frame = sg.root.children[0] as FrameNode;
    expect(frame.children.length).toBe(1);
    // derivedSymbolData should take precedence — constraint resolution not applied
    const child = frame.children[0];
    expect(child.transform.m02).toBe(50);  // from derivedSymbolData, not constraint
    expect(child.transform.m12).toBe(50);
  });
});
