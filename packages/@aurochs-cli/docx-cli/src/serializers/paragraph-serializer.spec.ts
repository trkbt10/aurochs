/**
 * @file Tests for paragraph serialization
 */
import type { DocxRun, DocxParagraph, DocxParagraphContent } from "@aurochs-office/docx";
import { halfPoints, docxStyleId, docxNumId, docxIlvl } from "@aurochs-office/docx";
import { serializeParagraph } from "./paragraph-serializer";

describe("paragraph-serializer", () => {
  describe("serializeParagraph", () => {
    it("should serialize a paragraph with multiple run properties", () => {
      const run: DocxRun = {
        type: "run",
        properties: {
          b: true,
          i: true,
          u: { val: "single" },
          strike: true,
          sz: halfPoints(24), // 12 points in half-points
          rFonts: { ascii: "Arial" },
          color: { val: "FF0000" },
          highlight: "yellow",
        },
        content: [{ type: "text", value: "Hello" }],
      };

      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [run],
      };

      const result = serializeParagraph(paragraph);

      expect(result.content).toHaveLength(1);
      const serializedRun = result.content[0];

      expect(serializedRun.type).toBe("run");
      if (serializedRun.type === "run") {
        expect(serializedRun.text).toBe("Hello");
        expect(serializedRun.bold).toBe(true);
        expect(serializedRun.italic).toBe(true);
        expect(serializedRun.underline).toBe(true);
        expect(serializedRun.strike).toBe(true);
        expect(serializedRun.fontSize).toBe(12); // 24 / 2
        expect(serializedRun.fontFamily).toBe("Arial");
        expect(serializedRun.color).toBe("FF0000");
        expect(serializedRun.highlight).toBe("yellow");
      }
    });

    it("should serialize a paragraph with multiple paragraph properties", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        properties: {
          pStyle: docxStyleId("Heading1"),
          jc: "center",
          numPr: {
            numId: docxNumId(1),
            ilvl: docxIlvl(0),
          },
        },
        content: [
          {
            type: "run",
            content: [{ type: "text", value: "Test" }],
          },
        ],
      };

      const result = serializeParagraph(paragraph);

      expect(result.style).toBe("Heading1");
      expect(result.alignment).toBe("center");
      expect(result.numbering).toEqual({
        numId: 1,
        level: 0,
      });
    });

    it("should handle runs with mixed content types", () => {
      const run: DocxRun = {
        type: "run",
        content: [
          { type: "text", value: "Hello" },
          { type: "tab" },
          { type: "text", value: "World" },
          { type: "break", breakType: "textWrapping" },
          { type: "text", value: "!" },
        ],
      };

      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [run],
      };

      const result = serializeParagraph(paragraph);

      expect(result.content).toHaveLength(1);
      if (result.content[0].type === "run") {
        expect(result.content[0].text).toBe("Hello\tWorld\n!");
      }
    });

    it("should handle page breaks as double newlines", () => {
      const run: DocxRun = {
        type: "run",
        content: [
          { type: "text", value: "Page 1" },
          { type: "break", breakType: "page" },
          { type: "text", value: "Page 2" },
        ],
      };

      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [run],
      };

      const result = serializeParagraph(paragraph);

      if (result.content[0].type === "run") {
        expect(result.content[0].text).toBe("Page 1\n\nPage 2");
      }
    });

    it("should handle hyperlinks", () => {
      const hyperlink: DocxParagraphContent = {
        type: "hyperlink",
        anchor: "bookmark1",
        tooltip: "Click here",
        content: [
          {
            type: "run",
            content: [{ type: "text", value: "Link text" }],
          },
        ],
      };

      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [hyperlink],
      };

      const result = serializeParagraph(paragraph);

      expect(result.content).toHaveLength(1);
      const link = result.content[0];
      expect(link.type).toBe("hyperlink");
      if (link.type === "hyperlink") {
        expect(link.anchor).toBe("bookmark1");
        expect(link.tooltip).toBe("Click here");
        expect(link.text).toBe("Link text");
      }
    });

    it("should omit undefined properties", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [
          {
            type: "run",
            content: [{ type: "text", value: "Plain text" }],
          },
        ],
      };

      const result = serializeParagraph(paragraph);

      expect(result.style).toBeUndefined();
      expect(result.alignment).toBeUndefined();
      expect(result.numbering).toBeUndefined();

      if (result.content[0].type === "run") {
        expect(result.content[0].bold).toBeUndefined();
        expect(result.content[0].italic).toBeUndefined();
        expect(result.content[0].underline).toBeUndefined();
      }
    });

    it("should filter out non-serializable content types", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [
          { type: "bookmarkStart", id: 1, name: "bookmark" },
          {
            type: "run",
            content: [{ type: "text", value: "Text" }],
          },
          { type: "bookmarkEnd", id: 1 },
        ],
      };

      const result = serializeParagraph(paragraph);

      // Only the run should be serialized
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("run");
    });
  });
});
