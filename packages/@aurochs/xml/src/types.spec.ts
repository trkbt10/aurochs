/**
 * @file Tests for XML types and utilities
 */

import { getXmlText } from "./index";
import type { XmlElement, XmlText } from "./ast";

describe("getXmlText", () => {
  describe("with null and undefined values", () => {
    it("returns undefined for null", () => {
      expect(getXmlText(null)).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
      expect(getXmlText(undefined)).toBeUndefined();
    });
  });

  describe("with string values", () => {
    it("returns the string directly", () => {
      expect(getXmlText("hello")).toBe("hello");
    });

    it("returns empty string for empty string", () => {
      expect(getXmlText("")).toBe("");
    });

    it("preserves whitespace in strings", () => {
      expect(getXmlText("  hello world  ")).toBe("  hello world  ");
    });
  });

  describe("with XmlText nodes", () => {
    it("extracts value from XmlText node", () => {
      const textNode: XmlText = { type: "text", value: "Hello World" };
      expect(getXmlText(textNode)).toBe("Hello World");
    });

    it("returns empty string for XmlText with empty value", () => {
      const textNode: XmlText = { type: "text", value: "" };
      expect(getXmlText(textNode)).toBe("");
    });
  });

  describe("with XmlElement nodes", () => {
    it("extracts concatenated text from element children", () => {
      const element: XmlElement = {
        type: "element",
        name: "div",
        attrs: {},
        children: [
          { type: "text", value: "Hello " },
          { type: "text", value: "World" },
        ],
      };
      expect(getXmlText(element)).toBe("Hello World");
    });

    it("returns undefined for element with no text children", () => {
      const element: XmlElement = {
        type: "element",
        name: "div",
        attrs: {},
        children: [
          { type: "element", name: "span", attrs: {}, children: [] },
        ],
      };
      expect(getXmlText(element)).toBeUndefined();
    });

    it("returns undefined for element with empty children", () => {
      const element: XmlElement = {
        type: "element",
        name: "div",
        attrs: {},
        children: [],
      };
      expect(getXmlText(element)).toBeUndefined();
    });

    it("extracts text only from direct children", () => {
      const element: XmlElement = {
        type: "element",
        name: "div",
        attrs: {},
        children: [
          { type: "text", value: "Hello" },
          {
            type: "element",
            name: "span",
            attrs: {},
            children: [{ type: "text", value: "World" }],
          },
        ],
      };
      expect(getXmlText(element)).toBe("Hello");
    });
  });

});
