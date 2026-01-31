/**
 * @file XML builder utility tests
 */

import {
  createElement,
  setChildren,
  addChild,
  addChildren,
  setAttrs,
  removeAttr,
  findChild,
  findChildren,
  updateChild,
  removeChildren,
  conditionalAttrs,
  conditionalChildren,
} from "./xml-builder";
import type { XmlElement, XmlText } from "@oxen/xml";

const text = (value: string): XmlText => ({ type: "text", value });

describe("xml-builder", () => {
  describe("createElement", () => {
    it("creates element with defaults", () => {
      const el = createElement("test");
      expect(el).toEqual({ type: "element", name: "test", attrs: {}, children: [] });
    });

    it("creates element with attrs and children", () => {
      const el = createElement("div", { id: "foo" }, [text("text")]);
      expect(el).toEqual({
        type: "element",
        name: "div",
        attrs: { id: "foo" },
        children: [{ type: "text", value: "text" }],
      });
    });
  });

  describe("setChildren", () => {
    it("replaces children immutably", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: {}, children: [text("old")] };
      const updated = setChildren(original, [text("new")]);
      expect(updated.children).toEqual([text("new")]);
      expect(original.children).toEqual([text("old")]);
    });
  });

  describe("addChild", () => {
    it("adds child immutably", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: {}, children: [text("a")] };
      const updated = addChild(original, text("b"));
      expect(updated.children).toEqual([text("a"), text("b")]);
      expect(original.children).toEqual([text("a")]);
    });
  });

  describe("addChildren", () => {
    it("adds multiple children", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: {}, children: [text("a")] };
      const updated = addChildren(original, [text("b"), text("c")]);
      expect(updated.children).toEqual([text("a"), text("b"), text("c")]);
    });
  });

  describe("setAttrs", () => {
    it("merges attributes", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: { a: "1" }, children: [] };
      const updated = setAttrs(original, { b: "2" });
      expect(updated.attrs).toEqual({ a: "1", b: "2" });
    });

    it("overrides existing attributes", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: { a: "1" }, children: [] };
      const updated = setAttrs(original, { a: "2" });
      expect(updated.attrs).toEqual({ a: "2" });
    });
  });

  describe("removeAttr", () => {
    it("removes attribute", () => {
      const original: XmlElement = { type: "element", name: "div", attrs: { a: "1", b: "2" }, children: [] };
      const updated = removeAttr(original, "a");
      expect(updated.attrs).toEqual({ b: "2" });
    });
  });

  describe("findChild", () => {
    it("finds child by name", () => {
      const child: XmlElement = { type: "element", name: "span", attrs: {}, children: [] };
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [child] };
      expect(findChild(parent, "span")).toBe(child);
    });

    it("returns undefined when not found", () => {
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [] };
      expect(findChild(parent, "span")).toBeUndefined();
    });
  });

  describe("findChildren", () => {
    it("finds all children by name", () => {
      const child1: XmlElement = { type: "element", name: "span", attrs: { id: "1" }, children: [] };
      const child2: XmlElement = { type: "element", name: "span", attrs: { id: "2" }, children: [] };
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [child1, text("text"), child2] };
      expect(findChildren(parent, "span")).toEqual([child1, child2]);
    });
  });

  describe("updateChild", () => {
    it("updates child by name", () => {
      const child: XmlElement = { type: "element", name: "span", attrs: {}, children: [] };
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [child] };
      const updated = updateChild(parent, "span", (c) => setAttrs(c, { updated: "true" }));
      expect((updated.children[0] as XmlElement).attrs).toEqual({ updated: "true" });
    });

    it("returns unchanged if child not found", () => {
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [] };
      const updated = updateChild(parent, "span", (c) => c);
      expect(updated).toEqual(parent);
    });
  });

  describe("removeChildren", () => {
    it("removes children by name", () => {
      const span: XmlElement = { type: "element", name: "span", attrs: {}, children: [] };
      const parent: XmlElement = { type: "element", name: "div", attrs: {}, children: [span, text("text")] };
      const updated = removeChildren(parent, "span");
      expect(updated.children).toEqual([text("text")]);
    });
  });

  describe("conditionalAttrs", () => {
    it("includes only defined values", () => {
      const attrs = conditionalAttrs({
        a: "1",
        b: undefined,
        c: 2,
        d: true,
      });
      expect(attrs).toEqual({ a: "1", c: "2", d: "true" });
    });
  });

  describe("conditionalChildren", () => {
    it("filters out null and undefined", () => {
      const children = conditionalChildren([text("a"), null, text("b"), undefined, text("c")]);
      expect(children).toEqual([text("a"), text("b"), text("c")]);
    });
  });
});
