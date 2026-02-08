/**
 * @file src/pdf/domain/font/cmap-parser.spec.ts
 */

import { parseToUnicodeCMap } from "./cmap-parser";

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
  it("processes a small bfrange fully (size < 256)", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "0003", "0041");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(4);
    expect(mapping.get(0x0000)).toBe("A");
    expect(mapping.get(0x0001)).toBe("B");
    expect(mapping.get(0x0002)).toBe("C");
    expect(mapping.get(0x0003)).toBe("D");
    expect(warnSpy.calls).toHaveLength(0);

    warnSpy.restore();
  });

  it("does not truncate at the boundary (size = 256)", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "00ff", "0020");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(256);
    expect(mapping.get(0x0000)).toBe(" ");
    expect(mapping.get(0x00ff)).toBe(String.fromCodePoint(0x0020 + 0x00ff));
    expect(warnSpy.calls).toHaveLength(0);

    warnSpy.restore();
  });

  it("truncates a large bfrange (size > 256) and warns", () => {
    const warnSpy = createConsoleWarnSpy();
    const cmap = makeSimpleBfRangeCMap("0000", "0100", "0020");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(256);
    expect(mapping.get(0x00ff)).toBe(String.fromCodePoint(0x0020 + 0x00ff));
    expect(mapping.get(0x0100)).toBeUndefined();
    expect(warnSpy.calls).toHaveLength(1);
    expect(String(warnSpy.calls[0]?.[0])).toContain("limiting to 256");

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
});
