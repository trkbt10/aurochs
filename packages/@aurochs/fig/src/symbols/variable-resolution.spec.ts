/**
 * @file Tests for the RESOLVE_VARIANT evaluator and the
 * `FigVariableAnyValue` projection.
 *
 * The fixtures here are minimal hand-built node maps — they don't
 * exercise the full Kiwi parser pipeline because the evaluator's
 * correctness depends on the *projected* shape, not the
 * presence-by-field details of the raw Kiwi message. The
 * `projectVariableAnyValue` test does cover the projection itself.
 */

import { describe, it, expect } from "vitest";
import {
  projectVariableAnyValue,
  findVariableConsumptionExpression,
  resolveVariantOverride,
} from "./variable-resolution";
import type {
  FigGuid,
  FigKiwiVariableAnyValue,
  FigKiwiVariableData,
  FigKiwiVariableDataMap,
  FigNode,
} from "../types";
import { FIG_NODE_TYPE } from "../types";
import { guidToString } from "../parser";

function guid(sessionID: number, localID: number): FigGuid {
  return { sessionID, localID };
}

function symbolNode(g: FigGuid, name: string, parent?: FigGuid): FigNode {
  return {
    guid: g,
    phase: { value: 0, name: "INITIAL" },
    type: { value: 0, name: FIG_NODE_TYPE.SYMBOL },
    name,
    parentIndex: parent ? { guid: parent, position: "0" } : undefined,
    children: [],
  };
}

function frameNode(g: FigGuid, name: string, children: readonly FigNode[]): FigNode {
  return {
    guid: g,
    phase: { value: 0, name: "INITIAL" },
    type: { value: 0, name: FIG_NODE_TYPE.FRAME },
    name,
    children,
  };
}

function instanceNode(g: FigGuid, symbolID: FigGuid, vcm: FigKiwiVariableDataMap): FigNode {
  return {
    guid: g,
    phase: { value: 0, name: "INITIAL" },
    type: { value: 0, name: FIG_NODE_TYPE.INSTANCE },
    symbolData: { symbolID },
    variableConsumptionMap: vcm,
  };
}

function buildSymbolMap(nodes: readonly FigNode[]): Map<string, FigNode> {
  const map = new Map<string, FigNode>();
  for (const n of nodes) {
    map.set(guidToString(n.guid), n);
  }
  return map;
}

describe("projectVariableAnyValue", () => {
  it("projects bool / text / float values to their kind", () => {
    expect(projectVariableAnyValue({ boolValue: true })).toEqual({ kind: "bool", value: true });
    expect(projectVariableAnyValue({ textValue: "Bright" })).toEqual({ kind: "text", value: "Bright" });
    expect(projectVariableAnyValue({ floatValue: 1.5 })).toEqual({ kind: "float", value: 1.5 });
  });

  it("projects expression values verbatim", () => {
    const raw: FigKiwiVariableAnyValue = {
      expressionValue: {
        expressionFunction: { value: 2, name: "RESOLVE_VARIANT" },
        expressionArguments: [],
      },
    };
    const projected = projectVariableAnyValue(raw);
    expect(projected?.kind).toBe("expression");
    if (projected?.kind === "expression") {
      expect(projected.value.expressionFunction.name).toBe("RESOLVE_VARIANT");
    }
  });

  it("projects map values verbatim", () => {
    const raw: FigKiwiVariableAnyValue = {
      mapValue: { values: [{ key: "BG Context", value: { value: { textValue: "Bright" } } }] },
    };
    const projected = projectVariableAnyValue(raw);
    expect(projected?.kind).toBe("map");
    if (projected?.kind === "map") {
      expect(projected.value.values?.length).toBe(1);
    }
  });

  it("returns undefined for empty input", () => {
    expect(projectVariableAnyValue(undefined)).toBeUndefined();
    expect(projectVariableAnyValue({})).toBeUndefined();
  });
});

describe("findVariableConsumptionExpression", () => {
  it("returns the first expression-kind entry", () => {
    const vcm: FigKiwiVariableDataMap = {
      entries: [
        { variableData: { value: { textValue: "literal" } } },
        {
          variableData: {
            value: {
              expressionValue: {
                expressionFunction: { value: 2, name: "RESOLVE_VARIANT" },
                expressionArguments: [],
              },
            },
          },
        },
      ],
    };
    const found = findVariableConsumptionExpression(vcm);
    expect(found?.expression.expressionFunction.name).toBe("RESOLVE_VARIANT");
  });

  it("returns undefined when no expression entry exists", () => {
    expect(findVariableConsumptionExpression({ entries: [] })).toBeUndefined();
    expect(findVariableConsumptionExpression(undefined)).toBeUndefined();
  });
});

describe("resolveVariantOverride", () => {
  function makeVcmFromTextLiteral(propName: string, value: string): FigKiwiVariableDataMap {
    return {
      entries: [
        {
          variableData: {
            value: {
              expressionValue: {
                expressionFunction: { value: 2, name: "RESOLVE_VARIANT" },
                expressionArguments: [
                  {
                    value: {
                      mapValue: {
                        values: [
                          {
                            key: propName,
                            value: { value: { textValue: value } },
                          },
                        ],
                      },
                    },
                  } as FigKiwiVariableData,
                ],
              },
            },
          },
        },
      ],
    };
  }

  it("selects the variant whose name matches the requested property literal", () => {
    // Two siblings under a FRAME: "Type=Default" and "Type=Compact".
    const defaultSym = symbolNode(guid(1, 100), "Type=Default", guid(1, 1));
    const compactSym = symbolNode(guid(1, 101), "Type=Compact", guid(1, 1));
    const container = frameNode(guid(1, 1), "_Variants", [defaultSym, compactSym]);
    const inst = instanceNode(guid(1, 200), guid(1, 100), makeVcmFromTextLiteral("Type", "Compact"));
    const symbolMap = buildSymbolMap([container, defaultSym, compactSym]);

    const out = resolveVariantOverride(inst, defaultSym, symbolMap);
    expect(out.resolvedSymbolID).toEqual(guid(1, 101));
  });

  it("returns the original (default) variant when the literal matches it", () => {
    const defaultSym = symbolNode(guid(1, 100), "Type=Default", guid(1, 1));
    const compactSym = symbolNode(guid(1, 101), "Type=Compact", guid(1, 1));
    const container = frameNode(guid(1, 1), "_Variants", [defaultSym, compactSym]);
    const inst = instanceNode(guid(1, 200), guid(1, 100), makeVcmFromTextLiteral("Type", "Default"));
    const symbolMap = buildSymbolMap([container, defaultSym, compactSym]);

    const out = resolveVariantOverride(inst, defaultSym, symbolMap);
    expect(out.resolvedSymbolID).toEqual(guid(1, 100));
  });

  it("bails out with `unresolved-aliases` when the property value is a library alias", () => {
    const defaultSym = symbolNode(guid(1, 100), "Type=Default", guid(1, 1));
    const compactSym = symbolNode(guid(1, 101), "Type=Compact", guid(1, 1));
    const container = frameNode(guid(1, 1), "_Variants", [defaultSym, compactSym]);
    const aliasVcm: FigKiwiVariableDataMap = {
      entries: [
        {
          variableData: {
            value: {
              expressionValue: {
                expressionFunction: { value: 2, name: "RESOLVE_VARIANT" },
                expressionArguments: [
                  {
                    value: {
                      mapValue: {
                        values: [
                          {
                            key: "Type",
                            value: {
                              value: { alias: { assetRef: { key: "lib-key", version: "1" } } },
                            },
                          },
                        ],
                      },
                    },
                  } as FigKiwiVariableData,
                ],
              },
            },
          },
        },
      ],
    };
    const inst = instanceNode(guid(1, 200), guid(1, 100), aliasVcm);
    const symbolMap = buildSymbolMap([container, defaultSym, compactSym]);

    const out = resolveVariantOverride(inst, defaultSym, symbolMap);
    expect(out.resolvedSymbolID).toBeUndefined();
    expect(out.bailReason).toBe("unresolved-aliases");
  });

  it("bails out with `no-variant-container` when the SYMBOL has no variant siblings", () => {
    // Standalone SYMBOL — parent is just a generic FRAME with one child.
    const sym = symbolNode(guid(1, 100), "Solo", guid(1, 1));
    const parent = frameNode(guid(1, 1), "Misc", [sym]);
    const inst = instanceNode(guid(1, 200), guid(1, 100), makeVcmFromTextLiteral("Type", "Compact"));
    const symbolMap = buildSymbolMap([parent, sym]);

    const out = resolveVariantOverride(inst, sym, symbolMap);
    expect(out.resolvedSymbolID).toBeUndefined();
    expect(out.bailReason).toBe("no-variant-container");
  });

  it("bails out with `no-vcm-expression` when the INSTANCE has no expression VCM", () => {
    const sym = symbolNode(guid(1, 100), "Type=Default", guid(1, 1));
    const inst: FigNode = {
      guid: guid(1, 200),
      phase: { value: 0, name: "INITIAL" },
      type: { value: 0, name: FIG_NODE_TYPE.INSTANCE },
      symbolData: { symbolID: guid(1, 100) },
    };
    const symbolMap = buildSymbolMap([sym]);

    const out = resolveVariantOverride(inst, sym, symbolMap);
    expect(out.bailReason).toBe("no-vcm-expression");
  });
});
