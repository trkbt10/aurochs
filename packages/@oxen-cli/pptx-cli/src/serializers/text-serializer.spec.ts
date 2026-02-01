/**
 * @file Tests for text-serializer
 */

import {
  extractTextFromBody,
  extractTextFromParagraph,
  extractTextFromRun,
  extractTextFromShape,
} from "@oxen-office/pptx/domain/text-utils";
import type { TextBody, Paragraph, TextRun } from "@oxen-office/pptx/domain/text";
import type { SpShape } from "@oxen-office/pptx/domain/shape";

describe("text-serializer", () => {
  describe("extractTextFromRun", () => {
    it("extracts text from a regular run", () => {
      const run: TextRun = { type: "text", text: "Hello" };
      expect(extractTextFromRun(run)).toBe("Hello");
    });

    it("extracts newline from a break run", () => {
      const run: TextRun = { type: "break" };
      expect(extractTextFromRun(run)).toBe("\n");
    });

    it("extracts text from a field run", () => {
      const run: TextRun = { type: "field", fieldType: "slidenum", id: "1", text: "5" };
      expect(extractTextFromRun(run)).toBe("5");
    });
  });

  describe("extractTextFromParagraph", () => {
    it("concatenates all runs in a paragraph", () => {
      const paragraph: Paragraph = {
        properties: {},
        runs: [
          { type: "text", text: "Hello " },
          { type: "text", text: "World" },
        ],
      };
      expect(extractTextFromParagraph(paragraph)).toBe("Hello World");
    });

    it("handles breaks correctly", () => {
      const paragraph: Paragraph = {
        properties: {},
        runs: [
          { type: "text", text: "Line 1" },
          { type: "break" },
          { type: "text", text: "Line 2" },
        ],
      };
      expect(extractTextFromParagraph(paragraph)).toBe("Line 1\nLine 2");
    });
  });

  describe("extractTextFromBody", () => {
    it("joins paragraphs with newlines", () => {
      const body: TextBody = {
        bodyProperties: {},
        paragraphs: [
          { properties: {}, runs: [{ type: "text", text: "Paragraph 1" }] },
          { properties: {}, runs: [{ type: "text", text: "Paragraph 2" }] },
        ],
      };
      expect(extractTextFromBody(body)).toBe("Paragraph 1\nParagraph 2");
    });
  });

  describe("extractTextFromShape", () => {
    it("extracts text from an sp shape with textBody", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Title" },
        properties: {},
        textBody: {
          bodyProperties: {},
          paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Hello" }] }],
        },
      };
      expect(extractTextFromShape(shape)).toBe("Hello");
    });

    it("returns empty string for sp shape without textBody", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Shape" },
        properties: {},
      };
      expect(extractTextFromShape(shape)).toBe("");
    });
  });
});
