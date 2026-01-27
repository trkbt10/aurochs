/**
 * @file Tests for XML transformation utilities
 */

import { filterNodes, stringify, toContentString } from "./transform";
import type { XmlElement, XmlNode } from "./ast";

describe("filterNodes", () => {
  it("returns empty array for empty input", () => {
    const result = filterNodes([], () => true);
    expect(result).toEqual([]);
  });

  it("filters elements by predicate", () => {
    const nodes: XmlNode[] = [
      { type: "element", name: "div", attrs: { class: "target" }, children: [] },
      { type: "element", name: "span", attrs: {}, children: [] },
      { type: "element", name: "p", attrs: { class: "target" }, children: [] },
    ];

    const result = filterNodes(nodes, (el) => el.attrs.class === "target");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("div");
    expect(result[1].name).toBe("p");
  });

  it("searches recursively through children", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "root",
        attrs: {},
        children: [
          { type: "element", name: "target", attrs: {}, children: [] },
          {
            type: "element",
            name: "nested",
            attrs: {},
            children: [
              { type: "element", name: "target", attrs: {}, children: [] },
            ],
          },
        ],
      },
    ];

    const result = filterNodes(nodes, (el) => el.name === "target");
    expect(result).toHaveLength(2);
  });

  it("skips text nodes", () => {
    const nodes: XmlNode[] = [
      { type: "text", value: "Hello" },
      { type: "element", name: "div", attrs: {}, children: [] },
    ];

    const result = filterNodes(nodes, () => true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("div");
  });

  it("includes parent and matching children", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "parent",
        attrs: { match: "yes" },
        children: [
          { type: "element", name: "child", attrs: { match: "yes" }, children: [] },
        ],
      },
    ];

    const result = filterNodes(nodes, (el) => el.attrs.match === "yes");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("parent");
    expect(result[1].name).toBe("child");
  });
});

describe("stringify", () => {
  it("returns empty string for empty nodes", () => {
    expect(stringify([])).toBe("");
  });

  it("converts simple element to string", () => {
    const nodes: XmlNode[] = [
      { type: "element", name: "div", attrs: {}, children: [] },
    ];
    expect(stringify(nodes)).toBe("<div></div>");
  });

  it("includes attributes", () => {
    const nodes: XmlNode[] = [
      { type: "element", name: "div", attrs: { id: "test", class: "main" }, children: [] },
    ];
    const result = stringify(nodes);
    expect(result).toContain("id='test'");
    expect(result).toContain("class='main'");
  });

  it("includes text content", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "p",
        attrs: {},
        children: [{ type: "text", value: "Hello World" }],
      },
    ];
    expect(stringify(nodes)).toBe("<p>Hello World</p>");
  });

  it("handles nested elements", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "div",
        attrs: {},
        children: [
          { type: "element", name: "span", attrs: {}, children: [] },
        ],
      },
    ];
    expect(stringify(nodes)).toBe("<div><span></span></div>");
  });

  it("escapes special characters in attribute values", () => {
    const nodes: XmlNode[] = [
      { type: "element", name: "div", attrs: { title: "a & b" }, children: [] },
    ];
    const result = stringify(nodes);
    expect(result).toContain("&amp;");
  });

  it("escapes special characters in text content", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "p",
        attrs: {},
        children: [{ type: "text", value: "<tag>" }],
      },
    ];
    expect(stringify(nodes)).toContain("&lt;tag&gt;");
  });

  it("handles multiple sibling elements", () => {
    const nodes: XmlNode[] = [
      { type: "element", name: "a", attrs: {}, children: [] },
      { type: "element", name: "b", attrs: {}, children: [] },
    ];
    expect(stringify(nodes)).toBe("<a></a><b></b>");
  });
});

describe("toContentString", () => {
  it("returns empty string for empty nodes array", () => {
    expect(toContentString([])).toBe("");
  });

  it("extracts text from text node", () => {
    const node: XmlNode = { type: "text", value: "Hello World" };
    expect(toContentString(node)).toBe("Hello World");
  });

  it("extracts text from nodes array", () => {
    const nodes: XmlNode[] = [
      { type: "text", value: "Hello" },
      { type: "text", value: "World" },
    ];
    expect(toContentString(nodes)).toBe("Hello World");
  });

  it("extracts text from nested elements", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "div",
        attrs: {},
        children: [{ type: "text", value: "Hello" }],
      },
    ];
    expect(toContentString(nodes)).toBe("Hello");
  });

  it("extracts text from deeply nested elements", () => {
    const nodes: XmlNode[] = [
      {
        type: "element",
        name: "div",
        attrs: {},
        children: [
          {
            type: "element",
            name: "span",
            attrs: {},
            children: [{ type: "text", value: "Deep" }],
          },
        ],
      },
    ];
    expect(toContentString(nodes)).toBe("Deep");
  });

  it("ignores element tags and extracts only text", () => {
    const nodes: XmlNode[] = [
      { type: "text", value: "before" },
      { type: "element", name: "b", attrs: {}, children: [{ type: "text", value: "bold" }] },
      { type: "text", value: "after" },
    ];
    expect(toContentString(nodes)).toBe("before bold after");
  });

  it("trims whitespace from text nodes", () => {
    const nodes: XmlNode[] = [
      { type: "text", value: "  Hello  " },
      { type: "text", value: "  World  " },
    ];
    expect(toContentString(nodes)).toBe("Hello World");
  });

  it("handles single element node", () => {
    const node: XmlElement = {
      type: "element",
      name: "p",
      attrs: {},
      children: [{ type: "text", value: "content" }],
    };
    expect(toContentString(node)).toBe("content");
  });
});
