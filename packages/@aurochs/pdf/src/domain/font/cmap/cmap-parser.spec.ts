/**
 * @file src/pdf/domain/font/cmap-parser.spec.ts
 */

import { hexToString, parseToUnicodeCMap } from "./cmap-parser";

function createConsoleWarnSpy(): Readonly<{
  readonly calls: readonly ReadonlyArray<unknown>[];
  readonly restore: () => void;
}> {
  const calls: ReadonlyArray<unknown>[] = [];
  const original = console.warn;

  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };

  const restore = (): void => {
    console.warn = original;
  };

  return { calls, restore };
}

function makeSimpleBfRangeCMap(
  startHex: string,
  endHex: string,
  destStartHex: string
): string {
  return `beginbfrange\n<${startHex}> <${endHex}> <${destStartHex}>\nendbfrange`;
}

describe("parseToUnicodeCMap", () => {
  it("processes a small bfrange fully", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "0003", "0041");

    const { mapping, byteMapping, sourceCodeByteLengths } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(4);
    expect(byteMapping.get("0000")).toBe("A");
    expect(sourceCodeByteLengths).toEqual([2]);
    expect(mapping.get(0x0000)).toBe("A");
    expect(mapping.get(0x0001)).toBe("B");
    expect(mapping.get(0x0002)).toBe("C");
    expect(mapping.get(0x0003)).toBe("D");
    expect(warnSpy.calls).toHaveLength(0);

    warnSpy.restore();
  });

  it("does not truncate by default for ranges larger than 256", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "012b", "0020");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(300);
    expect(mapping.get(0x0000)).toBe(" ");
    expect(mapping.get(0x012b)).toBe(String.fromCodePoint(0x0020 + 0x012b));
    expect(warnSpy.calls).toHaveLength(0);

    warnSpy.restore();
  });

  it("truncates a large bfrange when options.maxRangeEntries is set", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "0100", "0020");

    const { mapping, diagnostics } = parseToUnicodeCMap(cmap, { maxRangeEntries: 100 });

    expect(mapping.size).toBe(100);
    expect(mapping.get(0x0063)).toBe(String.fromCodePoint(0x0020 + 0x0063));
    expect(mapping.get(0x0064)).toBeUndefined();
    expect(mapping.get(0x0100)).toBeUndefined();
    expect(warnSpy.calls).toHaveLength(1);
    expect(String(warnSpy.calls[0]?.[0])).toContain("limiting to 100");
    expect(diagnostics.truncatedRangeCount).toBe(1);

    warnSpy.restore();
  });

  it("allows overriding the limit via options", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "0014", "0041"); // 21 entries

    const { mapping } = parseToUnicodeCMap(cmap, { maxRangeEntries: 10 });

    expect(mapping.size).toBe(10);
    expect(mapping.get(0x0000)).toBe("A");
    expect(mapping.get(0x0009)).toBe("J");
    expect(mapping.get(0x000a)).toBeUndefined();
    expect(warnSpy.calls).toHaveLength(1);
    expect(String(warnSpy.calls[0]?.[0])).toContain("limiting to 10");

    warnSpy.restore();
  });

  it("supports mixed source byte lengths and longest-length metadata", () => {
    const cmap = [
      "1 begincodespacerange",
      "<00> <FF>",
      "endcodespacerange",
      "3 beginbfchar",
      "<20> <0041>",
      "<8140> <3042>",
      "<000102> <3044>",
      "endbfchar",
    ].join("\n");

    const result = parseToUnicodeCMap(cmap);

    expect(result.sourceCodeByteLengths).toEqual([3, 2, 1]);
    expect(result.byteMapping.get("20")).toBe("A");
    expect(result.byteMapping.get("8140")).toBe("あ");
    expect(result.byteMapping.get("000102")).toBe("い");
  });

  it("tracks mappings whose source length is outside declared codespace lengths", () => {
    const cmap = [
      "1 begincodespacerange",
      "<00> <FF>",
      "endcodespacerange",
      "2 beginbfchar",
      "<01> <0041>",
      "<0001> <3042>",
      "endbfchar",
    ].join("\n");

    const result = parseToUnicodeCMap(cmap);

    expect(result.diagnostics.sourceLengthOutsideCodeSpaceCount).toBe(1);
    expect(result.diagnostics.sourceCodeLengthHistogram.get(1)).toBe(1);
    expect(result.diagnostics.sourceCodeLengthHistogram.get(2)).toBe(1);
  });

  it("parses bfchar entries with embedded whitespace and line breaks in hex strings", () => {
    const cmap = [
      "2 beginbfchar",
      "<00",
      "41> <30 42>",
      "<81 40> <D8 3D DE 00>",
      "endbfchar",
    ].join("\n");

    const result = parseToUnicodeCMap(cmap);

    expect(result.byteMapping.get("0041")).toBe("あ");
    expect(result.byteMapping.get("8140")).toBe("😀");
    expect(result.sourceCodeByteLengths).toEqual([2]);
    expect(result.diagnostics.invalidEntryCount).toBe(0);
  });

  it("parses bfrange entries across line boundaries and multiple entries on one line", () => {
    const cmap = [
      "beginbfrange",
      "<00 01> <00 03> <00 41> <00 10> <00 11> [ <30 42>",
      "<30 44> ]",
      "endbfrange",
    ].join("\n");

    const result = parseToUnicodeCMap(cmap);

    expect(result.byteMapping.get("0001")).toBe("A");
    expect(result.byteMapping.get("0002")).toBe("B");
    expect(result.byteMapping.get("0003")).toBe("C");
    expect(result.byteMapping.get("0010")).toBe("あ");
    expect(result.byteMapping.get("0011")).toBe("い");
    expect(result.diagnostics.invalidEntryCount).toBe(0);
  });

  it("expands UTF-16BE bfrange destinations with surrogate pairs", () => {
    const cmap = makeSimpleBfRangeCMap("0001", "0003", "D83DDE00");
    const result = parseToUnicodeCMap(cmap);

    expect(result.byteMapping.get("0001")).toBe("😀");
    expect(result.byteMapping.get("0002")).toBe("😁");
    expect(result.byteMapping.get("0003")).toBe("😂");
  });

  it("collects diagnostics for invalid entries and replacement/private-use maps", () => {
    const cmap = [
      "4 beginbfchar",
      "<01> <FFFD>",
      "<02> <E001>",
      "<03> <3042>",
      "<GG> <3044>",
      "endbfchar",
    ].join("\n");

    const result = parseToUnicodeCMap(cmap);

    expect(result.diagnostics.invalidEntryCount).toBe(1);
    expect(result.diagnostics.sourceLengthOutsideCodeSpaceCount).toBe(0);
    expect(result.diagnostics.replacementCharMapCount).toBe(1);
    expect(result.diagnostics.privateUseCharMapCount).toBe(1);
    expect(result.diagnostics.sourceCodeLengthHistogram.get(1)).toBe(3);
  });
});

describe("hexToString", () => {
  it("decodes surrogate pairs correctly", () => {
    expect(hexToString("D83DDE00")).toBe("😀");
  });

  it("falls back to single-byte decode when UTF-16BE unit width is uneven", () => {
    expect(hexToString("0041AA")).toBe("\u0000A\u00AA");
  });
});
