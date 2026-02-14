/**
 * @file VBA Completion Logic Tests
 */

import { describe, it, expect } from "vitest";
import {
  detectCompletionContext,
  collectCompletions,
  filterAndRankCompletions,
  applyCompletion,
} from "./vba-completion";
import type { CompletionItem } from "./types";

describe("detectCompletionContext", () => {
  it("should return undefined for empty source with typing trigger", () => {
    const result = detectCompletionContext("", 0, "typing");
    expect(result).toBeUndefined();
  });

  it("should detect prefix at cursor position", () => {
    const source = "Dim x As In";
    const result = detectCompletionContext(source, source.length, "typing");
    expect(result).not.toBeUndefined();
    expect(result?.prefix).toBe("In");
    expect(result?.prefixStartOffset).toBe(9);
  });

  it("should detect manual trigger with no prefix", () => {
    const source = "Dim x As ";
    const result = detectCompletionContext(source, source.length, "manual");
    expect(result).not.toBeUndefined();
    expect(result?.prefix).toBe("");
    expect(result?.trigger).toBe("manual");
  });

  it("should detect dot trigger", () => {
    const source = "Debug.";
    const result = detectCompletionContext(source, source.length, "dot");
    expect(result).not.toBeUndefined();
    expect(result?.trigger).toBe("dot");
    expect(result?.objectName).toBe("Debug");
  });

  it("should return undefined inside string literal", () => {
    const source = '"Hello Dim';
    const result = detectCompletionContext(source, source.length, "typing");
    expect(result).toBeUndefined();
  });

  it("should return undefined inside comment", () => {
    const source = "' This is Dim";
    const result = detectCompletionContext(source, source.length, "typing");
    expect(result).toBeUndefined();
  });

  it("should require at least 1 character for typing trigger", () => {
    const source = "Dim x As ";
    const result = detectCompletionContext(source, source.length, "typing");
    expect(result).toBeUndefined();
  });

  it("should return line and column correctly", () => {
    const source = "Sub Test()\n    Dim x As In";
    const result = detectCompletionContext(source, source.length, "typing");
    expect(result).not.toBeUndefined();
    expect(result?.line).toBe(2);
  });
});

describe("collectCompletions", () => {
  it("should return keyword completions for keyword prefix", () => {
    const context = {
      trigger: "typing" as const,
      prefix: "Di",
      prefixStartOffset: 0,
      line: 1,
      column: 3,
    };
    const items = collectCompletions(context, "Di", []);
    const dimItem = items.find((i) => i.label === "Dim");
    expect(dimItem).not.toBeUndefined();
    expect(dimItem?.kind).toBe("keyword");
  });

  it("should return builtin completions for builtin prefix", () => {
    const context = {
      trigger: "typing" as const,
      prefix: "Msg",
      prefixStartOffset: 0,
      line: 1,
      column: 4,
    };
    const items = collectCompletions(context, "Msg", []);
    const msgBoxItem = items.find((i) => i.label === "MsgBox");
    expect(msgBoxItem).not.toBeUndefined();
    expect(msgBoxItem?.kind).toBe("builtin");
  });

  it("should return type completions for type prefix", () => {
    const context = {
      trigger: "typing" as const,
      prefix: "Int",
      prefixStartOffset: 0,
      line: 1,
      column: 4,
    };
    const items = collectCompletions(context, "Int", []);
    const integerItem = items.find((i) => i.label === "Integer");
    expect(integerItem).not.toBeUndefined();
    expect(integerItem?.kind).toBe("type");
  });

  it("should not return keywords after dot trigger", () => {
    const context = {
      trigger: "dot" as const,
      prefix: "",
      prefixStartOffset: 6,
      line: 1,
      column: 7,
      objectName: "Debug",
    };
    const items = collectCompletions(context, "Debug.", []);
    const dimItem = items.find((i) => i.label === "Dim");
    expect(dimItem).toBeUndefined();
  });
});

describe("filterAndRankCompletions", () => {
  const items: CompletionItem[] = [
    { label: "Dim", kind: "keyword" },
    { label: "Do", kind: "keyword" },
    { label: "Double", kind: "type" },
    { label: "DateAdd", kind: "builtin" },
  ];

  it("should filter by prefix", () => {
    const filtered = filterAndRankCompletions(items, "D");
    expect(filtered).toHaveLength(4);
  });

  it("should rank exact matches higher", () => {
    const filtered = filterAndRankCompletions(items, "Do");
    expect(filtered[0]?.label).toBe("Do");
  });

  it("should rank prefix matches higher than contains", () => {
    const filtered = filterAndRankCompletions(items, "Dim");
    expect(filtered[0]?.label).toBe("Dim");
  });

  it("should return all items when no prefix", () => {
    const filtered = filterAndRankCompletions(items, "");
    expect(filtered).toHaveLength(4);
  });
});

describe("applyCompletion", () => {
  it("should replace prefix with completion text", () => {
    const source = "Dim x As In";
    const context = {
      trigger: "typing" as const,
      prefix: "In",
      prefixStartOffset: 9,
      line: 1,
      column: 12,
    };
    const item: CompletionItem = {
      label: "Integer",
      kind: "type",
      insertText: "Integer",
    };

    const result = applyCompletion(source, context, item);
    expect(result.text).toBe("Dim x As Integer");
    expect(result.cursorOffset).toBe(16);
  });

  it("should use label as insertText if not provided", () => {
    const source = "Di";
    const context = {
      trigger: "typing" as const,
      prefix: "Di",
      prefixStartOffset: 0,
      line: 1,
      column: 3,
    };
    const item: CompletionItem = {
      label: "Dim",
      kind: "keyword",
    };

    const result = applyCompletion(source, context, item);
    expect(result.text).toBe("Dim");
    expect(result.cursorOffset).toBe(3);
  });
});
