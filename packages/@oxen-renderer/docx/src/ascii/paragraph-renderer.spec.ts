import { describe, it, expect } from "bun:test";
import { renderParagraphAscii } from "./paragraph-renderer";

describe("paragraph-renderer", () => {
  it("renders a heading with # prefix", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      headingLevel: 0,
      text: "Introduction",
    }, 40);
    expect(lines[0]).toBe("# Introduction");
  });

  it("renders level 1 heading with ##", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      headingLevel: 1,
      text: "Section",
    }, 40);
    expect(lines[0]).toBe("## Section");
  });

  it("renders a plain paragraph with 2-space indent", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      text: "Hello world",
    }, 40);
    expect(lines[0]).toBe("  Hello world");
  });

  it("wraps long text", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      text: "This is a very long paragraph that should be wrapped to fit within the specified width.",
    }, 30);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(30);
    }
  });

  it("renders empty paragraph as empty line", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      text: "",
    }, 40);
    expect(lines).toEqual([""]);
  });

  it("renders numbered list item", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      text: "First item",
      numbering: { numId: 1, level: 0 },
    }, 40);
    expect(lines[0]).toContain("1.");
    expect(lines[0]).toContain("First item");
  });

  it("renders bullet-prefixed text as bullet", () => {
    const lines = renderParagraphAscii({
      type: "paragraph",
      text: "- Item here",
    }, 40);
    expect(lines[0]).toContain("\u2022");
    expect(lines[0]).toContain("Item here");
  });
});
