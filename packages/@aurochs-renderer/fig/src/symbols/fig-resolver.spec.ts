/**
 * @file Unit tests for FigResolver (createFigResolver)
 */

import type { FigNode } from "@aurochs/fig/types";
import { createFigResolver } from "./fig-resolver";

/** Type guard that treats a partial object as FigNode for test purposes */
function isFigNode(obj: unknown): obj is FigNode {
  return typeof obj === "object" && obj !== null;
}

/** Create a FigNode from partial data for testing */
function createTestNode(data: Record<string, unknown>): FigNode {
  if (isFigNode(data)) {
    return data;
  }
  throw new Error("Invalid test node data");
}

describe("FigResolver", () => {
  function makeSymbol(guid: { sessionID: number; localID: number }, children: Record<string, unknown>[], props?: Record<string, unknown>) {
    return createTestNode({
      guid,
      phase: { value: 0, name: "PAINT" },
      type: { value: 15, name: "SYMBOL" },
      name: "TestSymbol",
      children,
      ...props,
    });
  }

  function makeInstance(guid: { sessionID: number; localID: number }, symbolID: { sessionID: number; localID: number }) {
    return createTestNode({
      guid,
      phase: { value: 0, name: "PAINT" },
      type: { value: 16, name: "INSTANCE" },
      name: "TestInstance",
      symbolData: { symbolID },
    });
  }

  it("resolveInstance inherits strokeJoin from SYMBOL", () => {
    const symGuid = { sessionID: 1, localID: 10 };
    const symbol = makeSymbol(symGuid, [
      { guid: { sessionID: 1, localID: 11 }, type: { value: 10, name: "RECTANGLE" }, name: "Rect" },
    ], { strokeJoin: "ROUND" });
    const instance = makeInstance({ sessionID: 1, localID: 20 }, symGuid);

    const resolver = createFigResolver(new Map([["1:10", symbol]]));
    const result = resolver.resolveInstance(instance);
    expect(result.node.strokeJoin).toBe("ROUND");
  });

  it("resolveInstance inherits blendMode from SYMBOL", () => {
    const symGuid = { sessionID: 1, localID: 10 };
    const symbol = makeSymbol(symGuid, [], { blendMode: "MULTIPLY" });
    const instance = makeInstance({ sessionID: 1, localID: 20 }, symGuid);

    const resolver = createFigResolver(new Map([["1:10", symbol]]));
    const result = resolver.resolveInstance(instance);
    expect(result.node.blendMode).toBe("MULTIPLY");
  });

  it("resolveInstance applies self-referencing fill override", () => {
    const symGuid = { sessionID: 1, localID: 10 };
    const overrideFill = [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }];
    const symbol = makeSymbol(symGuid, [], {
      fillPaints: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    });
    const instance = createTestNode({
      guid: { sessionID: 1, localID: 20 },
      phase: { value: 0, name: "PAINT" },
      type: { value: 16, name: "INSTANCE" },
      name: "TestInstance",
      symbolData: {
        symbolID: symGuid,
        symbolOverrides: [{
          guidPath: { guids: [symGuid] },
          fillPaints: overrideFill,
        }],
      },
    });

    const resolver = createFigResolver(new Map([["1:10", symbol]]));
    const result = resolver.resolveInstance(instance);
    expect(result.node.fillPaints).toBe(overrideFill);
  });

  it("resolveInstance ignores self-override on non-visual properties", () => {
    const symGuid = { sessionID: 1, localID: 10 };
    const symbol = makeSymbol(symGuid, []);
    const instance = createTestNode({
      guid: { sessionID: 1, localID: 20 },
      phase: { value: 0, name: "PAINT" },
      type: { value: 16, name: "INSTANCE" },
      name: "TestInstance",
      symbolData: {
        symbolID: symGuid,
        symbolOverrides: [{
          guidPath: { guids: [symGuid] },
          name: "ShouldNotApply",
        }],
      },
    });

    const resolver = createFigResolver(new Map([["1:10", symbol]]));
    const result = resolver.resolveInstance(instance);
    // name is not in SELF_OVERRIDE_PROPERTIES — self-override does NOT apply it
    // INSTANCE keeps its own name (from the spread in mergeProperties)
    expect(result.node.name).toBe("TestInstance");
  });

  it("resolveInstance returns children from SYMBOL", () => {
    const symGuid = { sessionID: 1, localID: 10 };
    const symbol = makeSymbol(symGuid, [
      { guid: { sessionID: 1, localID: 11 }, type: { value: 10, name: "RECTANGLE" }, name: "InnerRect" },
    ]);
    const instance = makeInstance({ sessionID: 1, localID: 20 }, symGuid);

    const resolver = createFigResolver(new Map([["1:10", symbol]]));
    const result = resolver.resolveInstance(instance);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].name).toBe("InnerRect");
  });
});
