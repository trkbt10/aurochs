/**
 * @file Unit tests for symbol pre-resolver
 */

import { describe, it, expect } from "vitest";
import type { FigNode, FigNodeType, KiwiEnumValue } from "@aurochs/fig/types";
import { buildSymbolDependencyGraph, preResolveSymbols } from "./symbol-pre-resolver";

// =============================================================================
// Test helpers — construct proper FigNode values (no type casts)
// =============================================================================

const PHASE_CREATED: KiwiEnumValue = { value: 0, name: "CREATED" };

/** Node type numeric values matching Figma's schema */
const NODE_TYPE_VALUES: Record<string, number> = {
  SYMBOL: 15,
  INSTANCE: 16,
  RECTANGLE: 10,
  ELLIPSE: 9,
  FRAME: 4,
};

function nodeType(name: FigNodeType): KiwiEnumValue<FigNodeType> {
  const value = NODE_TYPE_VALUES[name] ?? 0;
  return { value, name };
}

function makeNode(
  localID: number,
  type: FigNodeType,
  opts?: { name?: string; children?: FigNode[]; symbolData?: { symbolID: { sessionID: number; localID: number } } },
): FigNode {
  const node: FigNode = {
    guid: { sessionID: 1, localID },
    phase: PHASE_CREATED,
    type: nodeType(type),
    name: opts?.name ?? `${type}-${localID}`,
    children: opts?.children,
  };
  if (opts?.symbolData) {
    // FigNode has [key: string]: unknown index signature
    return { ...node, symbolData: opts.symbolData };
  }
  return node;
}

function makeSymbol(localID: number, children: FigNode[], name?: string): FigNode {
  return makeNode(localID, "SYMBOL", { name: name ?? `Symbol-${localID}`, children });
}

function makeInstance(localID: number, symbolLocalID: number, name?: string): FigNode {
  return makeNode(localID, "INSTANCE", {
    name: name ?? `Instance-${localID}`,
    symbolData: { symbolID: { sessionID: 1, localID: symbolLocalID } },
  });
}

/** Create an INSTANCE node with symbolID at top level (builder-generated format) */
function makeInstanceTopLevel(localID: number, symbolLocalID: number, name?: string): FigNode {
  const node: FigNode = {
    guid: { sessionID: 1, localID },
    phase: PHASE_CREATED,
    type: nodeType("INSTANCE"),
    name: name ?? `Instance-${localID}`,
    symbolID: { sessionID: 1, localID: symbolLocalID },
  };
  return node;
}

/** Create a SYMBOL node with a specific sessionID (for testing sessionID mismatch) */
function makeSymbolWithSession(sessionID: number, localID: number, children: FigNode[], name?: string): FigNode {
  return {
    guid: { sessionID, localID },
    phase: PHASE_CREATED,
    type: nodeType("SYMBOL"),
    name: name ?? `Symbol-${localID}`,
    children,
  };
}

/** Create an INSTANCE that references a symbolID with a different sessionID */
function makeInstanceMismatch(localID: number, refSessionID: number, symbolLocalID: number, name?: string): FigNode {
  return makeNode(localID, "INSTANCE", {
    name: name ?? `Instance-${localID}`,
    symbolData: { symbolID: { sessionID: refSessionID, localID: symbolLocalID } },
  });
}

function makeRect(localID: number, name?: string): FigNode {
  return makeNode(localID, "RECTANGLE", { name });
}

function makeEllipse(localID: number, name?: string): FigNode {
  return makeNode(localID, "ELLIPSE", { name });
}

function guidStr(localID: number): string {
  return `1:${localID}`;
}

// =============================================================================
// Tests
// =============================================================================

describe("buildSymbolDependencyGraph", () => {
  it("returns empty graph for empty map", () => {
    const graph = buildSymbolDependencyGraph(new Map());
    expect(graph.resolveOrder).toEqual([]);
    expect(graph.circularWarnings).toEqual([]);
  });

  it("handles SYMBOL with no nested INSTANCEs", () => {
    const sym = makeSymbol(10, [makeRect(11)]);
    const symbolMap = new Map([[guidStr(10), sym]]);

    const graph = buildSymbolDependencyGraph(symbolMap);
    expect(graph.resolveOrder).toEqual([guidStr(10)]);
    expect(graph.dependencies.get(guidStr(10))?.size ?? 0).toBe(0);
    expect(graph.circularWarnings).toEqual([]);
  });

  it("handles 1-level nesting: A contains INSTANCE of B", () => {
    const symB = makeSymbol(20, [makeRect(21)], "SymbolB");
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    const graph = buildSymbolDependencyGraph(symbolMap);

    // B must come before A
    const orderA = graph.resolveOrder.indexOf(guidStr(10));
    const orderB = graph.resolveOrder.indexOf(guidStr(20));
    expect(orderB).toBeLessThan(orderA);
    expect(graph.circularWarnings).toEqual([]);
  });

  it("handles 2-level nesting: A → B → C", () => {
    const symC = makeSymbol(30, [makeRect(31)], "SymbolC");
    const symB = makeSymbol(20, [makeInstance(21, 30)], "SymbolB");
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
      [guidStr(30), symC],
    ]);

    const graph = buildSymbolDependencyGraph(symbolMap);

    const orderA = graph.resolveOrder.indexOf(guidStr(10));
    const orderB = graph.resolveOrder.indexOf(guidStr(20));
    const orderC = graph.resolveOrder.indexOf(guidStr(30));
    expect(orderC).toBeLessThan(orderB);
    expect(orderB).toBeLessThan(orderA);
    expect(graph.circularWarnings).toEqual([]);
  });

  it("detects circular dependencies", () => {
    // A depends on B, B depends on A
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symB = makeSymbol(20, [makeInstance(21, 10)], "SymbolB");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    const graph = buildSymbolDependencyGraph(symbolMap);
    expect(graph.circularWarnings.length).toBeGreaterThan(0);
    // Both should still be in resolveOrder (appended at the end)
    expect(graph.resolveOrder).toContain(guidStr(10));
    expect(graph.resolveOrder).toContain(guidStr(20));
  });

  it("ignores INSTANCE references to non-SYMBOL nodes", () => {
    // INSTANCE referencing a FRAME (not a SYMBOL) in the map
    const frame = makeNode(20, "FRAME", { name: "SomeFrame" });
    const sym = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), sym],
      [guidStr(20), frame],
    ]);

    const graph = buildSymbolDependencyGraph(symbolMap);
    // The dependency on 20 should be filtered out (not a SYMBOL)
    expect(graph.dependencies.get(guidStr(10))?.size ?? 0).toBe(0);
    expect(graph.resolveOrder).toEqual([guidStr(10)]);
  });

  it("ignores INSTANCE references to missing SYMBOLs", () => {
    // INSTANCE references SYMBOL 99 which doesn't exist
    const sym = makeSymbol(10, [makeInstance(11, 99)], "SymbolA");
    const symbolMap = new Map([[guidStr(10), sym]]);

    const graph = buildSymbolDependencyGraph(symbolMap);
    expect(graph.dependencies.get(guidStr(10))?.size ?? 0).toBe(0);
    expect(graph.resolveOrder).toEqual([guidStr(10)]);
    expect(graph.circularWarnings).toEqual([]);
  });
});

describe("preResolveSymbols", () => {
  it("returns empty cache for empty map", () => {
    const cache = preResolveSymbols(new Map());
    expect(cache.size).toBe(0);
  });

  it("resolves SYMBOL without nesting (passthrough)", () => {
    const rect = makeRect(11, "MyRect");
    const sym = makeSymbol(10, [rect], "SimpleSymbol");
    const symbolMap = new Map([[guidStr(10), sym]]);

    const cache = preResolveSymbols(symbolMap);
    expect(cache.size).toBe(1);

    const resolved = cache.get(guidStr(10))!;
    expect(resolved.children).toHaveLength(1);
    expect(resolved.children![0].name).toBe("MyRect");
    // Must be a clone, not the original
    expect(resolved).not.toBe(sym);
    expect(resolved.children![0]).not.toBe(rect);
  });

  it("resolves 1-level nesting: A → INSTANCE of B → B's children expanded", () => {
    const symB = makeSymbol(20, [makeRect(21, "InnerRect")], "SymbolB");
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    const cache = preResolveSymbols(symbolMap);
    expect(cache.size).toBe(2);

    const resolvedA = cache.get(guidStr(10))!;
    // A's child is the INSTANCE, which should now have B's children expanded
    const instanceInA = resolvedA.children![0];
    expect(instanceInA.children).toBeDefined();
    expect(instanceInA.children!.length).toBe(1);
    expect(instanceInA.children![0].name).toBe("InnerRect");
  });

  it("resolves 2-level nesting: A → B → C", () => {
    const symC = makeSymbol(30, [makeEllipse(31, "DeepEllipse")], "SymbolC");
    const symB = makeSymbol(20, [makeInstance(21, 30)], "SymbolB");
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
      [guidStr(30), symC],
    ]);

    const cache = preResolveSymbols(symbolMap);
    expect(cache.size).toBe(3);

    // A → INSTANCE of B → (B's INSTANCE of C expanded → C's children)
    const resolvedA = cache.get(guidStr(10))!;
    const instanceB = resolvedA.children![0];
    expect(instanceB.children).toBeDefined();
    // instanceB is the expanded B, its child is the INSTANCE of C
    const instanceC = instanceB.children![0];
    expect(instanceC.children).toBeDefined();
    expect(instanceC.children!.length).toBe(1);
    expect(instanceC.children![0].name).toBe("DeepEllipse");
  });

  it("does not mutate original nodes", () => {
    const innerRect = makeRect(21, "InnerRect");
    const symB = makeSymbol(20, [innerRect], "SymbolB");
    const instance = makeInstance(11, 20);
    const symA = makeSymbol(10, [instance], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    preResolveSymbols(symbolMap);

    // Original INSTANCE should still have no children
    expect(instance.children).toBeUndefined();
    // Original SYMBOL B should still have exactly 1 child
    expect(symB.children).toHaveLength(1);
    expect(symB.children![0]).toBe(innerRect);
  });

  it("reports circular dependency warnings", () => {
    const symA = makeSymbol(10, [makeInstance(11, 20)], "SymbolA");
    const symB = makeSymbol(20, [makeInstance(21, 10)], "SymbolB");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    const warnings: string[] = [];
    const cache = preResolveSymbols(symbolMap, { warnings });

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes("Circular dependency"))).toBe(true);
    // Both should still be cached despite circular deps
    expect(cache.has(guidStr(10))).toBe(true);
    expect(cache.has(guidStr(20))).toBe(true);
  });

  it("handles INSTANCE referencing a missing SYMBOL", () => {
    const sym = makeSymbol(10, [makeInstance(11, 99)], "SymbolA");
    const symbolMap = new Map([[guidStr(10), sym]]);

    const warnings: string[] = [];
    const cache = preResolveSymbols(symbolMap, { warnings });

    expect(cache.size).toBe(1);
    // The INSTANCE referencing missing SYMBOL should be cloned without expansion
    const resolved = cache.get(guidStr(10))!;
    const instance = resolved.children![0];
    // No children were expanded (SYMBOL not found)
    expect(instance.children).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("skips non-SYMBOL entries in the map", () => {
    const frame = makeNode(50, "FRAME", { name: "SomeFrame", children: [makeRect(51)] });
    const sym = makeSymbol(10, [makeRect(11)], "RealSymbol");
    const symbolMap = new Map([
      [guidStr(10), sym],
      [guidStr(50), frame],
    ]);

    const cache = preResolveSymbols(symbolMap);
    // Only the SYMBOL should be in the cache
    expect(cache.size).toBe(1);
    expect(cache.has(guidStr(10))).toBe(true);
    expect(cache.has(guidStr(50))).toBe(false);
  });

  it("resolves INSTANCE despite sessionID mismatch (localID fallback)", () => {
    // SYMBOL has sessionID=0, INSTANCE references sessionID=1
    const symB = makeSymbolWithSession(0, 20, [makeRect(21, "InnerRect")], "SymbolB");
    const symA = makeSymbolWithSession(0, 10, [makeInstanceMismatch(11, 1, 20)], "SymbolA");
    const symbolMap = new Map([
      ["0:10", symA],
      ["0:20", symB],
    ]);

    const cache = preResolveSymbols(symbolMap);
    expect(cache.size).toBe(2);

    const resolvedA = cache.get("0:10")!;
    const instanceInA = resolvedA.children![0];
    // The INSTANCE should have resolved B's children despite sessionID mismatch
    expect(instanceInA.children).toBeDefined();
    expect(instanceInA.children!.length).toBe(1);
    expect(instanceInA.children![0].name).toBe("InnerRect");
  });

  it("resolves INSTANCE with top-level symbolID (builder-generated format)", () => {
    const symB = makeSymbol(20, [makeRect(21, "InnerRect")], "SymbolB");
    const symA = makeSymbol(10, [makeInstanceTopLevel(11, 20)], "SymbolA");
    const symbolMap = new Map([
      [guidStr(10), symA],
      [guidStr(20), symB],
    ]);

    const cache = preResolveSymbols(symbolMap);
    expect(cache.size).toBe(2);

    const resolvedA = cache.get(guidStr(10))!;
    const instanceInA = resolvedA.children![0];
    expect(instanceInA.children).toBeDefined();
    expect(instanceInA.children!.length).toBe(1);
    expect(instanceInA.children![0].name).toBe("InnerRect");
  });
});
