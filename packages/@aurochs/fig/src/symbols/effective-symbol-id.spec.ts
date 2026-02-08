import { describe, it, expect } from "vitest";
import { extractSymbolIDPair, getEffectiveSymbolID } from "./effective-symbol-id";

describe("extractSymbolIDPair", () => {
  it("extracts from symbolData.symbolID (real Figma format)", () => {
    const node = {
      symbolData: { symbolID: { sessionID: 1, localID: 42 } },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair).toEqual({ symbolID: { sessionID: 1, localID: 42 } });
  });

  it("extracts from top-level symbolID (builder format)", () => {
    const node = {
      symbolID: { sessionID: 1, localID: 99 },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair).toEqual({ symbolID: { sessionID: 1, localID: 99 } });
  });

  it("prefers symbolData.symbolID over top-level", () => {
    const node = {
      symbolData: { symbolID: { sessionID: 1, localID: 10 } },
      symbolID: { sessionID: 2, localID: 20 },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair?.symbolID).toEqual({ sessionID: 1, localID: 10 });
  });

  it("includes overriddenSymbolID from symbolData", () => {
    const node = {
      symbolData: {
        symbolID: { sessionID: 1, localID: 10 },
        overriddenSymbolID: { sessionID: 1, localID: 20 },
      },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair).toEqual({
      symbolID: { sessionID: 1, localID: 10 },
      overriddenSymbolID: { sessionID: 1, localID: 20 },
    });
  });

  it("includes overriddenSymbolID from top-level", () => {
    const node = {
      symbolID: { sessionID: 1, localID: 10 },
      overriddenSymbolID: { sessionID: 1, localID: 30 },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair).toEqual({
      symbolID: { sessionID: 1, localID: 10 },
      overriddenSymbolID: { sessionID: 1, localID: 30 },
    });
  });

  it("returns undefined when no symbolID", () => {
    expect(extractSymbolIDPair({})).toBeUndefined();
    expect(extractSymbolIDPair({ symbolData: {} })).toBeUndefined();
    expect(extractSymbolIDPair({ symbolID: "not a guid" })).toBeUndefined();
  });

  it("omits overriddenSymbolID when not present", () => {
    const node = {
      symbolData: { symbolID: { sessionID: 1, localID: 10 } },
    };
    const pair = extractSymbolIDPair(node);
    expect(pair).toEqual({ symbolID: { sessionID: 1, localID: 10 } });
    expect(pair?.overriddenSymbolID).toBeUndefined();
  });
});

describe("getEffectiveSymbolID", () => {
  it("returns overriddenSymbolID when present", () => {
    const node = {
      symbolData: {
        symbolID: { sessionID: 1, localID: 10 },
        overriddenSymbolID: { sessionID: 1, localID: 20 },
      },
    };
    expect(getEffectiveSymbolID(node)).toEqual({ sessionID: 1, localID: 20 });
  });

  it("falls back to symbolID when no override", () => {
    const node = {
      symbolData: { symbolID: { sessionID: 1, localID: 10 } },
    };
    expect(getEffectiveSymbolID(node)).toEqual({ sessionID: 1, localID: 10 });
  });

  it("returns undefined for non-INSTANCE nodes", () => {
    expect(getEffectiveSymbolID({})).toBeUndefined();
  });

  it("works with top-level format", () => {
    const node = {
      symbolID: { sessionID: 1, localID: 5 },
      overriddenSymbolID: { sessionID: 1, localID: 15 },
    };
    expect(getEffectiveSymbolID(node)).toEqual({ sessionID: 1, localID: 15 });
  });
});
