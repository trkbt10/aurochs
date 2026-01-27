/**
 * @file run-operations.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxRun } from "@oxen/docx/domain/run";
import { splitRunAtOffset, mergeAdjacentRuns } from "./run-operations";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextRun(text: string, properties?: DocxRun["properties"]): DocxRun {
  return {
    type: "run",
    properties,
    content: [{ type: "text", value: text }],
  };
}

function getTextFromRun(run: DocxRun): string {
  return run.content
    .map((c) => (c.type === "text" ? c.value : ""))
    .join("");
}

// =============================================================================
// Tests: splitRunAtOffset
// =============================================================================

describe("splitRunAtOffset", () => {
  it("splits run at middle", () => {
    const run = createTextRun("Hello");
    const [before, after] = splitRunAtOffset(run, 2);

    expect(getTextFromRun(before)).toBe("He");
    expect(getTextFromRun(after)).toBe("llo");
  });

  it("preserves properties in both parts", () => {
    const run = createTextRun("Hello", { b: true, i: true });
    const [before, after] = splitRunAtOffset(run, 2);

    expect(before.properties?.b).toBe(true);
    expect(before.properties?.i).toBe(true);
    expect(after.properties?.b).toBe(true);
    expect(after.properties?.i).toBe(true);
  });

  it("handles split at start (offset 0)", () => {
    const run = createTextRun("Hello");
    const [before, after] = splitRunAtOffset(run, 0);

    expect(before.content).toHaveLength(0);
    expect(getTextFromRun(after)).toBe("Hello");
  });

  it("handles split at end", () => {
    const run = createTextRun("Hello");
    const [before, after] = splitRunAtOffset(run, 5);

    expect(getTextFromRun(before)).toBe("Hello");
    expect(after.content).toHaveLength(0);
  });

  it("handles negative offset (clamps to 0)", () => {
    const run = createTextRun("Hello");
    const [before, after] = splitRunAtOffset(run, -5);

    expect(before.content).toHaveLength(0);
    expect(getTextFromRun(after)).toBe("Hello");
  });

  it("handles offset beyond length (clamps to length)", () => {
    const run = createTextRun("Hello");
    const [before, after] = splitRunAtOffset(run, 100);

    expect(getTextFromRun(before)).toBe("Hello");
    expect(after.content).toHaveLength(0);
  });

  it("handles empty run", () => {
    const run: DocxRun = { type: "run", content: [] };
    const [before, after] = splitRunAtOffset(run, 0);

    expect(before.content).toHaveLength(0);
    expect(after.content).toHaveLength(0);
  });
});

// =============================================================================
// Tests: mergeAdjacentRuns
// =============================================================================

describe("mergeAdjacentRuns", () => {
  it("merges runs with same properties", () => {
    const content: DocxRun[] = [
      createTextRun("Hello", { b: true }),
      createTextRun(" World", { b: true }),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(1);
    const run = result[0];
    if (run.type === "run") {
      expect(run.content).toHaveLength(2);
      expect(run.properties?.b).toBe(true);
    }
  });

  it("does not merge runs with different properties", () => {
    const content: DocxRun[] = [
      createTextRun("Bold", { b: true }),
      createTextRun("Italic", { i: true }),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(2);
  });

  it("merges multiple consecutive runs with same properties", () => {
    const content: DocxRun[] = [
      createTextRun("A", { b: true }),
      createTextRun("B", { b: true }),
      createTextRun("C", { b: true }),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(1);
    const run = result[0];
    if (run.type === "run") {
      expect(run.content).toHaveLength(3);
    }
  });

  it("handles alternating properties", () => {
    const content: DocxRun[] = [
      createTextRun("A", { b: true }),
      createTextRun("B", { i: true }),
      createTextRun("C", { b: true }),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(3);
  });

  it("handles empty content array", () => {
    const result = mergeAdjacentRuns([]);
    expect(result).toHaveLength(0);
  });

  it("preserves non-run content", () => {
    const content = [
      createTextRun("Before"),
      { type: "bookmarkStart" as const, id: 1, name: "test" },
      createTextRun("After"),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(3);
    expect(result[1].type).toBe("bookmarkStart");
  });

  it("does not merge runs across non-run content", () => {
    const content = [
      createTextRun("A"),
      { type: "bookmarkStart" as const, id: 1, name: "test" },
      createTextRun("B"),
    ];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("run");
    expect(result[1].type).toBe("bookmarkStart");
    expect(result[2].type).toBe("run");
  });

  it("merges runs with both undefined properties", () => {
    const content: DocxRun[] = [createTextRun("A"), createTextRun("B")];
    const result = mergeAdjacentRuns(content);

    expect(result).toHaveLength(1);
  });
});
