/**
 * @file XML builder utility tests
 */

import {
  createElement,
  conditionalAttrs,
  conditionalChildren,
} from "./xml-builder";
import type { XmlText } from "@aurochs/xml";

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
