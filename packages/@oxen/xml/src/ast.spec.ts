/**
 * @file Tests for XML AST types and utility functions
 */

import {
  type XmlElement,
  type XmlText,
  type XmlDocument,
  isXmlElement,
  isXmlText,
  getChild,
  getChildren,
  getTextContent,
  getAttr,
  hasAttr,
  getByPath,
  getAttrByPath,
  getTextByPath,
  getChildrenByPath,
  mapChildren,
  hasChild,
} from "./ast";

describe("XML AST type guards", () => {
  const textNode: XmlText = { type: "text", value: "hello" };
  const elementNode: XmlElement = {
    type: "element",
    name: "div",
    attrs: {},
    children: [],
  };

  describe("isXmlElement", () => {
    it("returns true for element nodes", () => {
      expect(isXmlElement(elementNode)).toBe(true);
    });

    it("returns false for text nodes", () => {
      expect(isXmlElement(textNode)).toBe(false);
    });
  });

  describe("isXmlText", () => {
    it("returns true for text nodes", () => {
      expect(isXmlText(textNode)).toBe(true);
    });

    it("returns false for element nodes", () => {
      expect(isXmlText(elementNode)).toBe(false);
    });
  });
});

describe("XML AST utilities", () => {
  const sampleElement: XmlElement = {
    type: "element",
    name: "root",
    attrs: { id: "123", class: "container" },
    children: [
      { type: "element", name: "child", attrs: {}, children: [] },
      { type: "text", value: "text content" },
      { type: "element", name: "child", attrs: { index: "1" }, children: [] },
      { type: "element", name: "other", attrs: {}, children: [] },
    ],
  };

  describe("getChild", () => {
    it("returns first matching child element", () => {
      const result = getChild(sampleElement, "child");
      expect(result).toBeDefined();
      expect(result?.name).toBe("child");
      expect(result?.attrs).toEqual({});
    });

    it("returns undefined when no match found", () => {
      const result = getChild(sampleElement, "nonexistent");
      expect(result).toBeUndefined();
    });

    it("skips text nodes", () => {
      const result = getChild(sampleElement, "other");
      expect(result).toBeDefined();
      expect(result?.name).toBe("other");
    });
  });

  describe("getChildren", () => {
    it("returns all matching child elements", () => {
      const result = getChildren(sampleElement, "child");
      expect(result).toHaveLength(2);
      expect(result[0].attrs).toEqual({});
      expect(result[1].attrs).toEqual({ index: "1" });
    });

    it("returns empty array when no match found", () => {
      const result = getChildren(sampleElement, "nonexistent");
      expect(result).toEqual([]);
    });

    it("returns single element in array when one match", () => {
      const result = getChildren(sampleElement, "other");
      expect(result).toHaveLength(1);
    });
  });

  describe("getTextContent", () => {
    it("returns concatenated text from text children", () => {
      const result = getTextContent(sampleElement);
      expect(result).toBe("text content");
    });

    it("returns empty string when no text children", () => {
      const emptyElement: XmlElement = {
        type: "element",
        name: "empty",
        attrs: {},
        children: [],
      };
      expect(getTextContent(emptyElement)).toBe("");
    });

    it("concatenates multiple text nodes", () => {
      const multiText: XmlElement = {
        type: "element",
        name: "multi",
        attrs: {},
        children: [
          { type: "text", value: "Hello " },
          { type: "element", name: "b", attrs: {}, children: [] },
          { type: "text", value: "World" },
        ],
      };
      expect(getTextContent(multiText)).toBe("Hello World");
    });
  });

  describe("getAttr", () => {
    it("returns attribute value when exists", () => {
      expect(getAttr(sampleElement, "id")).toBe("123");
      expect(getAttr(sampleElement, "class")).toBe("container");
    });

    it("returns undefined when attribute does not exist", () => {
      expect(getAttr(sampleElement, "nonexistent")).toBeUndefined();
    });
  });

  describe("hasAttr", () => {
    it("returns true when attribute exists", () => {
      expect(hasAttr(sampleElement, "id")).toBe(true);
    });

    it("returns false when attribute does not exist", () => {
      expect(hasAttr(sampleElement, "nonexistent")).toBe(false);
    });
  });
});

describe("Path-based traversal", () => {
  const doc: XmlDocument = {
    children: [
      {
        type: "element",
        name: "p:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "p:txBody",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:p",
                attrs: { lvl: "0" },
                children: [
                  {
                    type: "element",
                    name: "a:r",
                    attrs: {},
                    children: [
                      {
                        type: "element",
                        name: "a:t",
                        attrs: {},
                        children: [{ type: "text", value: "Hello World" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  describe("getByPath", () => {
    it("traverses document by path", () => {
      const result = getByPath(doc, ["p:sp", "p:txBody", "a:p"]);
      expect(result).toBeDefined();
      expect(result?.name).toBe("a:p");
    });

    it("returns undefined for non-existent path", () => {
      const result = getByPath(doc, ["p:sp", "nonexistent"]);
      expect(result).toBeUndefined();
    });

    it("handles null input", () => {
      expect(getByPath(null, ["p:sp"])).toBeUndefined();
    });
  });

  describe("getAttrByPath", () => {
    it("gets attribute at path", () => {
      const result = getAttrByPath(doc, ["p:sp", "p:txBody", "a:p"], "lvl");
      expect(result).toBe("0");
    });

    it("returns undefined for non-existent attribute", () => {
      const result = getAttrByPath(doc, ["p:sp", "p:txBody", "a:p"], "nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getTextByPath", () => {
    it("gets text content at path", () => {
      const result = getTextByPath(doc, ["p:sp", "p:txBody", "a:p", "a:r", "a:t"]);
      expect(result).toBe("Hello World");
    });

    it("returns undefined for non-existent path", () => {
      const result = getTextByPath(doc, ["nonexistent"]);
      expect(result).toBeUndefined();
    });
  });

  describe("getChildrenByPath", () => {
    it("gets all children at path", () => {
      const multiDoc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "root",
            attrs: {},
            children: [
              { type: "element", name: "item", attrs: { id: "1" }, children: [] },
              { type: "element", name: "item", attrs: { id: "2" }, children: [] },
              { type: "element", name: "item", attrs: { id: "3" }, children: [] },
            ],
          },
        ],
      };
      const result = getChildrenByPath(multiDoc, ["root"], "item");
      expect(result).toHaveLength(3);
      expect(result[0].attrs.id).toBe("1");
    });
  });

  describe("mapChildren", () => {
    it("maps over children", () => {
      const element: XmlElement = {
        type: "element",
        name: "root",
        attrs: {},
        children: [
          { type: "element", name: "item", attrs: { val: "a" }, children: [] },
          { type: "element", name: "item", attrs: { val: "b" }, children: [] },
        ],
      };
      const result = mapChildren(element, "item", (child) => child.attrs.val);
      expect(result).toEqual(["a", "b"]);
    });

    it("handles null element", () => {
      const result = mapChildren(null, "item", (child) => child.name);
      expect(result).toEqual([]);
    });
  });

  describe("hasChild", () => {
    it("returns true when child exists", () => {
      const element: XmlElement = {
        type: "element",
        name: "root",
        attrs: {},
        children: [{ type: "element", name: "child", attrs: {}, children: [] }],
      };
      expect(hasChild(element, "child")).toBe(true);
    });

    it("returns false when child does not exist", () => {
      const element: XmlElement = {
        type: "element",
        name: "root",
        attrs: {},
        children: [],
      };
      expect(hasChild(element, "child")).toBe(false);
    });
  });
});

describe("XML AST structure", () => {
  it("represents nested PPTX-style XML correctly", () => {
    // Simulating: <p:sp><p:txBody><a:p><a:r><a:t>Hello</a:t></a:r></a:p></p:txBody></p:sp>
    const ast: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: {},
      children: [
        {
          type: "element",
          name: "p:txBody",
          attrs: {},
          children: [
            {
              type: "element",
              name: "a:p",
              attrs: {},
              children: [
                {
                  type: "element",
                  name: "a:r",
                  attrs: {},
                  children: [
                    {
                      type: "element",
                      name: "a:t",
                      attrs: {},
                      children: [{ type: "text", value: "Hello" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const txBody = getChild(ast, "p:txBody");
    expect(txBody).toBeDefined();

    const p = getChild(txBody!, "a:p");
    expect(p).toBeDefined();

    const r = getChild(p!, "a:r");
    expect(r).toBeDefined();

    const t = getChild(r!, "a:t");
    expect(t).toBeDefined();
    expect(getTextContent(t!)).toBe("Hello");
  });

  it("preserves element order in children array", () => {
    const ast: XmlElement = {
      type: "element",
      name: "root",
      attrs: {},
      children: [
        { type: "element", name: "first", attrs: {}, children: [] },
        { type: "element", name: "second", attrs: {}, children: [] },
        { type: "element", name: "third", attrs: {}, children: [] },
      ],
    };

    expect(ast.children[0]).toEqual({
      type: "element",
      name: "first",
      attrs: {},
      children: [],
    });
    expect(ast.children[1]).toEqual({
      type: "element",
      name: "second",
      attrs: {},
      children: [],
    });
    expect(ast.children[2]).toEqual({
      type: "element",
      name: "third",
      attrs: {},
      children: [],
    });
  });
});
