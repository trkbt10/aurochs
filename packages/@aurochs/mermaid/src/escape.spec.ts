import { describe, it, expect } from "vitest";
import { escapeMermaidLabel, sanitizeNodeId } from "./escape";

describe("escapeMermaidLabel", () => {
  it("escapes double quotes", () => {
    expect(escapeMermaidLabel('Say "Hello"')).toBe("Say #quot;Hello#quot;");
  });

  it("replaces newlines with spaces", () => {
    expect(escapeMermaidLabel("line1\nline2\r\nline3")).toBe("line1 line2 line3");
  });

  it("returns empty string for empty input", () => {
    expect(escapeMermaidLabel("")).toBe("");
  });

  it("passes through safe text unchanged", () => {
    expect(escapeMermaidLabel("Hello World")).toBe("Hello World");
  });
});

describe("sanitizeNodeId", () => {
  it("replaces non-alphanumeric characters with underscores", () => {
    expect(sanitizeNodeId("shape-1.2")).toBe("shape_1_2");
  });

  it("prepends n when starting with a digit", () => {
    expect(sanitizeNodeId("123abc")).toBe("n123abc");
  });

  it("returns 'node' for empty string", () => {
    expect(sanitizeNodeId("")).toBe("node");
  });

  it("leaves valid ids unchanged", () => {
    expect(sanitizeNodeId("myNode_1")).toBe("myNode_1");
  });
});
