import { describe, it, expect } from "vitest";
import { wrapInMermaidFence } from "./fence";

describe("wrapInMermaidFence", () => {
  it("wraps content in mermaid fenced code block", () => {
    const result = wrapInMermaidFence("pie\n  title Pets");
    expect(result).toBe('```mermaid\npie\n  title Pets\n```');
  });

  it("handles single-line content", () => {
    const result = wrapInMermaidFence("flowchart TD");
    expect(result).toBe("```mermaid\nflowchart TD\n```");
  });
});
