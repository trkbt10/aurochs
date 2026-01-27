/**
 * @file Tests for constraint system
 *
 * @see ECMA-376 Part 1, Section 21.4.3 (Constraints)
 */

import type { DiagramConstraint, DiagramConstraintType } from "../types";
import type { DiagramTreeNode } from "./tree-builder";
import type { LayoutNode, LayoutBounds } from "./types";
import type { ConstraintContext } from "./constraints";
import {
  resolveConstraint,
  applyConstraints,
  applyConstraintsToLayout,
  evaluateConstraintOperator,
  getSpacingConstraint,
  getWidthConstraint,
  getHeightConstraint,
} from "./constraints";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTreeNode(id: string): DiagramTreeNode {
  return {
    id,
    type: "node",
    children: [],
    depth: 0,
    siblingIndex: 0,
    siblingCount: 1,
  };
}

function createLayoutNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): LayoutNode {
  return {
    treeNode: createTreeNode(id),
    x,
    y,
    width,
    height,
    children: [],
  };
}

function createContext(bounds: LayoutBounds): ConstraintContext {
  return {
    bounds,
    siblings: [],
    namedNodes: new Map(),
    resolvedConstraints: new Map(),
  };
}

const defaultBounds: LayoutBounds = {
  x: 0,
  y: 0,
  width: 500,
  height: 400,
};

// =============================================================================
// resolveConstraint Tests
// =============================================================================

describe("resolveConstraint", () => {
  it("returns undefined for constraint without type", () => {
    const constraint: DiagramConstraint = {};
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result).toBeUndefined();
  });

  it("resolves width constraint with explicit value", () => {
    const constraint: DiagramConstraint = {
      type: "w",
      value: "200",
    };
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result).toBeDefined();
    expect(result?.type).toBe("w");
    expect(result?.value).toBe(200);
  });

  it("resolves height constraint with explicit value", () => {
    const constraint: DiagramConstraint = {
      type: "h",
      value: "150",
    };
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result?.value).toBe(150);
  });

  it("applies factor to constraint value", () => {
    const constraint: DiagramConstraint = {
      type: "w",
      value: "100",
      factor: "0.5",
    };
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result?.value).toBe(50);
  });

  it("applies min bound", () => {
    const constraint: DiagramConstraint = {
      type: "w",
      value: "50",
      min: "100",
    };
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result?.value).toBe(100);
  });

  it("applies max bound", () => {
    const constraint: DiagramConstraint = {
      type: "w",
      value: "500",
      max: "200",
    };
    const result = resolveConstraint(constraint, createContext(defaultBounds));

    expect(result?.value).toBe(200);
  });

  it("resolves reference constraint", () => {
    const context = createContext(defaultBounds);
    context.resolvedConstraints.set("w", 150);

    const constraint: DiagramConstraint = {
      type: "h",
      referenceType: "w",
      factor: "1",
    };
    const result = resolveConstraint(constraint, context);

    expect(result?.value).toBe(150);
    expect(result?.isReference).toBe(true);
  });

  it("resolves position constraints from bounds", () => {
    const bounds: LayoutBounds = { x: 50, y: 100, width: 200, height: 150 };
    const context = createContext(bounds);

    const lConstraint: DiagramConstraint = { type: "l" };
    const tConstraint: DiagramConstraint = { type: "t" };
    const rConstraint: DiagramConstraint = { type: "r" };
    const bConstraint: DiagramConstraint = { type: "b" };

    expect(resolveConstraint(lConstraint, context)?.value).toBe(50);
    expect(resolveConstraint(tConstraint, context)?.value).toBe(100);
    expect(resolveConstraint(rConstraint, context)?.value).toBe(250); // x + width
    expect(resolveConstraint(bConstraint, context)?.value).toBe(250); // y + height
  });

  it("resolves center constraints", () => {
    const bounds: LayoutBounds = { x: 0, y: 0, width: 200, height: 100 };
    const context = createContext(bounds);

    const ctrXConstraint: DiagramConstraint = { type: "ctrX" };
    const ctrYConstraint: DiagramConstraint = { type: "ctrY" };

    expect(resolveConstraint(ctrXConstraint, context)?.value).toBe(100);
    expect(resolveConstraint(ctrYConstraint, context)?.value).toBe(50);
  });

  it("resolves spacing constraint with default", () => {
    const context = createContext(defaultBounds);
    const constraint: DiagramConstraint = { type: "sp" };
    const result = resolveConstraint(constraint, context);

    expect(result?.value).toBe(10);
  });

  it("resolves diameter constraint from bounds", () => {
    const bounds: LayoutBounds = { x: 0, y: 0, width: 300, height: 200 };
    const context = createContext(bounds);
    const constraint: DiagramConstraint = { type: "diam" };
    const result = resolveConstraint(constraint, context);

    expect(result?.value).toBe(200); // min(width, height)
  });
});

// =============================================================================
// applyConstraints Tests
// =============================================================================

describe("applyConstraints", () => {
  it("applies width constraint", () => {
    const node = createLayoutNode("a", 0, 0, 100, 60);
    const constraints: DiagramConstraint[] = [{ type: "w", value: "200" }];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.width).toBe(200);
    expect(result.height).toBe(60); // unchanged
  });

  it("applies height constraint", () => {
    const node = createLayoutNode("a", 0, 0, 100, 60);
    const constraints: DiagramConstraint[] = [{ type: "h", value: "80" }];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.height).toBe(80);
    expect(result.width).toBe(100); // unchanged
  });

  it("applies position constraints", () => {
    const node = createLayoutNode("a", 0, 0, 100, 60);
    const constraints: DiagramConstraint[] = [
      { type: "l", value: "50" },
      { type: "t", value: "30" },
    ];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.x).toBe(50);
    expect(result.y).toBe(30);
  });

  it("applies center constraints", () => {
    const node = createLayoutNode("a", 0, 0, 100, 60);
    const constraints: DiagramConstraint[] = [
      { type: "ctrX", value: "250" },
      { type: "ctrY", value: "200" },
    ];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.x).toBe(200); // 250 - 100/2
    expect(result.y).toBe(170); // 200 - 60/2
  });

  it("applies offset constraints", () => {
    const node = createLayoutNode("a", 100, 50, 80, 60);
    const constraints: DiagramConstraint[] = [
      { type: "lOff", value: "10" },
      { type: "tOff", value: "5" },
    ];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.x).toBe(110); // 100 + 10
    expect(result.y).toBe(55); // 50 + 5
  });

  it("applies multiple constraints in order", () => {
    const node = createLayoutNode("a", 0, 0, 100, 60);
    const constraints: DiagramConstraint[] = [
      { type: "l", value: "50" },
      { type: "lOff", value: "10" },
    ];
    const context = createContext(defaultBounds);

    const result = applyConstraints(node, constraints, context);

    expect(result.x).toBe(60); // 50 + 10
  });
});

// =============================================================================
// applyConstraintsToLayout Tests
// =============================================================================

describe("applyConstraintsToLayout", () => {
  it("applies constraints to all nodes", () => {
    const nodes = [
      createLayoutNode("a", 0, 0, 100, 60),
      createLayoutNode("b", 110, 0, 100, 60),
    ];
    const constraints: DiagramConstraint[] = [{ type: "w", value: "80" }];

    const result = applyConstraintsToLayout(nodes, constraints, defaultBounds);

    expect(result).toHaveLength(2);
    expect(result[0].width).toBe(80);
    expect(result[1].width).toBe(80);
  });

  it("preserves other node properties", () => {
    const nodes = [createLayoutNode("a", 0, 0, 100, 60)];
    nodes[0] = { ...nodes[0], rotation: 45 };
    const constraints: DiagramConstraint[] = [{ type: "w", value: "80" }];

    const result = applyConstraintsToLayout(nodes, constraints, defaultBounds);

    expect(result[0].rotation).toBe(45);
    expect(result[0].treeNode.id).toBe("a");
  });
});

// =============================================================================
// evaluateConstraintOperator Tests
// =============================================================================

describe("evaluateConstraintOperator", () => {
  it("evaluates equality operator", () => {
    expect(evaluateConstraintOperator(10, "equ", 10)).toBe(true);
    expect(evaluateConstraintOperator(10, "equ", 5)).toBe(false);
  });

  it("evaluates greater-than-or-equal operator", () => {
    expect(evaluateConstraintOperator(10, "gte", 5)).toBe(true);
    expect(evaluateConstraintOperator(10, "gte", 10)).toBe(true);
    expect(evaluateConstraintOperator(10, "gte", 15)).toBe(false);
  });

  it("evaluates less-than-or-equal operator", () => {
    expect(evaluateConstraintOperator(10, "lte", 15)).toBe(true);
    expect(evaluateConstraintOperator(10, "lte", 10)).toBe(true);
    expect(evaluateConstraintOperator(10, "lte", 5)).toBe(false);
  });

  it("returns true for none operator", () => {
    expect(evaluateConstraintOperator(10, "none", 5)).toBe(true);
    expect(evaluateConstraintOperator(10, undefined, 5)).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("getSpacingConstraint", () => {
  it("returns default value when no spacing constraint", () => {
    const constraints: DiagramConstraint[] = [{ type: "w", value: "100" }];
    const context = createContext(defaultBounds);

    const result = getSpacingConstraint(constraints, context, 15);

    expect(result).toBe(15);
  });

  it("returns constraint value when present", () => {
    const constraints: DiagramConstraint[] = [{ type: "sp", value: "20" }];
    const context = createContext(defaultBounds);

    const result = getSpacingConstraint(constraints, context, 15);

    expect(result).toBe(20);
  });

  it("returns sibSp constraint value", () => {
    const constraints: DiagramConstraint[] = [{ type: "sibSp", value: "25" }];
    const context = createContext(defaultBounds);

    const result = getSpacingConstraint(constraints, context, 15);

    expect(result).toBe(25);
  });
});

describe("getWidthConstraint", () => {
  it("returns default value when no width constraint", () => {
    const constraints: DiagramConstraint[] = [{ type: "h", value: "100" }];
    const context = createContext(defaultBounds);

    const result = getWidthConstraint(constraints, context, 120);

    expect(result).toBe(120);
  });

  it("returns constraint value when present", () => {
    const constraints: DiagramConstraint[] = [{ type: "w", value: "80" }];
    const context = createContext(defaultBounds);

    const result = getWidthConstraint(constraints, context, 120);

    expect(result).toBe(80);
  });
});

describe("getHeightConstraint", () => {
  it("returns default value when no height constraint", () => {
    const constraints: DiagramConstraint[] = [{ type: "w", value: "100" }];
    const context = createContext(defaultBounds);

    const result = getHeightConstraint(constraints, context, 60);

    expect(result).toBe(60);
  });

  it("returns constraint value when present", () => {
    const constraints: DiagramConstraint[] = [{ type: "h", value: "45" }];
    const context = createContext(defaultBounds);

    const result = getHeightConstraint(constraints, context, 60);

    expect(result).toBe(45);
  });
});

// =============================================================================
// Topological Sort Tests
// =============================================================================

import {
  sortConstraintsByDependency,
  resolveAllConstraints,
  applyRules,
} from "./constraints";

describe("sortConstraintsByDependency", () => {
  it("handles constraints with no dependencies", () => {
    const constraints: DiagramConstraint[] = [
      { type: "w", value: "100" },
      { type: "h", value: "60" },
    ];

    const sorted = sortConstraintsByDependency(constraints);

    expect(sorted).toHaveLength(2);
  });

  it("sorts constraints with dependencies", () => {
    const constraints: DiagramConstraint[] = [
      { type: "w", referenceType: "h", factor: "2" }, // depends on h
      { type: "h", value: "60" }, // no dependency
    ];

    const sorted = sortConstraintsByDependency(constraints);

    // h should come before w because w depends on h
    const hIndex = sorted.findIndex((c) => c.type === "h");
    const wIndex = sorted.findIndex((c) => c.type === "w");
    expect(hIndex).toBeLessThan(wIndex);
  });

  it("handles circular dependencies gracefully", () => {
    const constraints: DiagramConstraint[] = [
      { type: "w", referenceType: "h" },
      { type: "h", referenceType: "w" },
    ];

    // Should not throw, returns all constraints
    const sorted = sortConstraintsByDependency(constraints);
    expect(sorted).toHaveLength(2);
  });
});

describe("resolveAllConstraints", () => {
  it("resolves multiple constraints", () => {
    const constraints: DiagramConstraint[] = [
      { type: "w", value: "100" },
      { type: "h", value: "60" },
      { type: "sp", value: "10" },
    ];
    const context = createContext(defaultBounds);

    const resolved = resolveAllConstraints(constraints, context);

    expect(resolved.get("w")).toBe(100);
    expect(resolved.get("h")).toBe(60);
    expect(resolved.get("sp")).toBe(10);
  });

  it("resolves reference constraints after their dependencies", () => {
    const constraints: DiagramConstraint[] = [
      { type: "w", referenceType: "h", factor: "2" },
      { type: "h", value: "50" },
    ];
    const context = createContext(defaultBounds);

    const resolved = resolveAllConstraints(constraints, context);

    expect(resolved.get("h")).toBe(50);
    expect(resolved.get("w")).toBe(100); // 50 * 2
  });
});

describe("applyRules", () => {
  it("applies factor to constraint value", () => {
    const resolved = new Map<DiagramConstraintType, number>([["w", 100]]);
    const rules = [{ type: "w", factor: "0.5" }];

    applyRules(resolved, rules);

    expect(resolved.get("w")).toBe(50);
  });

  it("applies min bound", () => {
    const resolved = new Map<DiagramConstraintType, number>([["w", 50]]);
    const rules = [{ type: "w", min: "100" }];

    applyRules(resolved, rules);

    expect(resolved.get("w")).toBe(100);
  });

  it("applies max bound", () => {
    const resolved = new Map<DiagramConstraintType, number>([["w", 200]]);
    const rules = [{ type: "w", max: "150" }];

    applyRules(resolved, rules);

    expect(resolved.get("w")).toBe(150);
  });

  it("applies explicit value override", () => {
    const resolved = new Map<DiagramConstraintType, number>([["w", 100]]);
    const rules = [{ type: "w", value: "200" }];

    applyRules(resolved, rules);

    expect(resolved.get("w")).toBe(200);
  });

  it("ignores rules for missing constraints", () => {
    const resolved = new Map<DiagramConstraintType, number>([["w", 100]]);
    const rules = [{ type: "h", value: "200" }];

    applyRules(resolved, rules);

    expect(resolved.has("h")).toBe(false);
    expect(resolved.get("w")).toBe(100);
  });
});
