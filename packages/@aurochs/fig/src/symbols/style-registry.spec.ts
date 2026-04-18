/**
 * @file style-registry unit tests
 *
 * Pins the two lookup strategies the registry supports:
 *
 * 1. Local guid references: a `styleIdForFill.guid` pointing to another
 *    node in the same file resolves to that node's own `fillPaints`.
 * 2. Team-library asset references: a `styleIdForFill.assetRef.key`
 *    pointing to an imported style resolves through a local proxy
 *    node that has `styleType.name === "FILL"` and whose own `key`
 *    matches the assetRef key.
 *
 * Regression guard for: Device 2×4 Apple logo. Before assetRef support
 * existed, the Logo VECTOR's raw `fillPaints` (white, a stale cache) was
 * used instead of the resolved shared-style paint (black), producing a
 * white-outlined rendering where Figma exports a filled black logo.
 */

import { describe, it, expect } from "vitest";
import {
  buildFigStyleRegistry,
  resolveNodeStyleIds,
  styleRefKey,
  styleRefKeys,
} from "./style-registry";
import type { FigNode } from "../types";

function solidPaint(r: number, g: number, b: number) {
  return {
    type: { value: 0, name: "SOLID" as const },
    color: { r, g, b, a: 1 },
    opacity: 1,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" as const },
  };
}

function node(overrides: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 0, localID: 0 },
    phase: { value: 0, name: "CREATED" },
    type: { value: 3, name: "RECTANGLE" },
    ...overrides,
  } as FigNode;
}

describe("styleRefKey / styleRefKeys", () => {
  it("returns the guid string when the reference carries a guid", () => {
    expect(styleRefKey({ guid: { sessionID: 15, localID: 133 } })).toBe("15:133");
  });

  it("returns the assetRef.key when only assetRef is present", () => {
    expect(styleRefKey({ assetRef: { key: "abc123" } })).toBe("abc123");
  });

  it("prefers guid over assetRef when both are present", () => {
    expect(styleRefKey({
      guid: { sessionID: 15, localID: 133 },
      assetRef: { key: "abc123" },
    })).toBe("15:133");
  });

  it("returns both keys from styleRefKeys in preference order", () => {
    expect(styleRefKeys({
      guid: { sessionID: 15, localID: 133 },
      assetRef: { key: "abc123" },
    })).toEqual(["15:133", "abc123"]);
  });

  it("returns empty array for an undefined reference", () => {
    expect(styleRefKeys(undefined)).toEqual([]);
  });
});

describe("buildFigStyleRegistry: guid path", () => {
  it("indexes guid-referenced styles by the definition node's guid", () => {
    // Consumer references a style by guid; definition node's own
    // fillPaints is the authoritative paint value.
    const defNode = node({
      guid: { sessionID: 1, localID: 100 },
      fillPaints: [solidPaint(0, 0, 0)],
    });
    const consumer = node({
      guid: { sessionID: 1, localID: 200 },
      styleIdForFill: { guid: { sessionID: 1, localID: 100 } },
      fillPaints: [solidPaint(1, 1, 1)], // stale
    });
    const map = new Map([
      ["1:100", defNode],
      ["1:200", consumer],
    ]);
    const registry = buildFigStyleRegistry(map);
    expect(registry.fills.get("1:100")).toEqual([solidPaint(0, 0, 0)]);
  });
});

describe("buildFigStyleRegistry: assetRef path", () => {
  it("indexes assetRef-referenced styles via a local proxy whose key matches", () => {
    // Proxy node has styleType.name === "FILL" and a `key` matching
    // the consumer's assetRef.key. Its own fillPaints is authoritative.
    const proxy = node({
      guid: { sessionID: 15, localID: 133 },
      name: "Black",
      styleType: { value: 1, name: "FILL" },
      key: "c3ebcfd9acc3408d6578662e147b484f2e0b567d",
      fillPaints: [solidPaint(0, 0, 0)],
    });
    const consumer = node({
      guid: { sessionID: 15, localID: 500 },
      styleIdForFill: {
        assetRef: {
          key: "c3ebcfd9acc3408d6578662e147b484f2e0b567d",
          version: "3:2",
        },
      },
      fillPaints: [solidPaint(1, 1, 1)], // stale
    });
    const map = new Map([
      ["15:133", proxy],
      ["15:500", consumer],
    ]);
    const registry = buildFigStyleRegistry(map);
    expect(registry.fills.get("c3ebcfd9acc3408d6578662e147b484f2e0b567d"))
      .toEqual([solidPaint(0, 0, 0)]);
  });

  it("ignores nodes whose styleType is not FILL for the fills map", () => {
    // Only FILL-typed proxies should populate the fills map.
    const strokeProxy = node({
      guid: { sessionID: 15, localID: 140 },
      styleType: { value: 2, name: "STROKE" },
      key: "strokekey",
      strokePaints: [solidPaint(0.5, 0.5, 0.5)],
    });
    const registry = buildFigStyleRegistry(new Map([["15:140", strokeProxy]]));
    expect(registry.fills.get("strokekey")).toBeUndefined();
    expect(registry.strokes.get("strokekey")).toEqual([solidPaint(0.5, 0.5, 0.5)]);
  });

  it("skips nodes that have styleType but no key (dangling style defs)", () => {
    const danglingProxy = node({
      guid: { sessionID: 15, localID: 141 },
      styleType: { value: 1, name: "FILL" },
      // no `key`
      fillPaints: [solidPaint(0, 0, 0)],
    });
    const registry = buildFigStyleRegistry(new Map([["15:141", danglingProxy]]));
    expect(registry.fills.size).toBe(0);
  });
});

describe("resolveNodeStyleIds", () => {
  it("replaces a consumer node's fillPaints using an assetRef.key lookup", () => {
    const proxy = node({
      guid: { sessionID: 15, localID: 133 },
      styleType: { value: 1, name: "FILL" },
      key: "blackkey",
      fillPaints: [solidPaint(0, 0, 0)],
    });
    const consumer = node({
      guid: { sessionID: 15, localID: 500 },
      styleIdForFill: { assetRef: { key: "blackkey" } },
      fillPaints: [solidPaint(1, 1, 1)],
    });
    const registry = buildFigStyleRegistry(new Map([
      ["15:133", proxy],
      ["15:500", consumer],
    ]));

    const resolved = resolveNodeStyleIds(consumer, registry);
    expect(resolved.fillPaints?.[0]).toMatchObject({
      color: { r: 0, g: 0, b: 0, a: 1 },
    });
  });

  it("returns the node unchanged when neither guid nor assetRef resolves", () => {
    const consumer = node({
      styleIdForFill: { assetRef: { key: "no-such-key" } },
      fillPaints: [solidPaint(1, 1, 1)],
    });
    const registry = buildFigStyleRegistry(new Map());
    // Same fillPaints (reference-equal) ⇒ resolver returns the original node.
    expect(resolveNodeStyleIds(consumer, registry)).toBe(consumer);
  });
});
