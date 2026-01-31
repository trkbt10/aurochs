/** @file Unit tests for paragraph serialization */
import { getChild, getChildren, getTextContent, isXmlElement } from "@oxen/xml";
import { pt } from "@oxen-office/ooxml/domain/units";
import type { Paragraph } from "../../domain/text";
import { serializeParagraph } from "./paragraph";

describe("serializeParagraph", () => {
  it("serializes plain text runs", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [{ type: "text", text: "Hello" }],
    };
    const el = serializeParagraph(paragraph);
    expect(el.name).toBe("a:p");
    const r = getChild(el, "a:r");
    const t = r ? getChild(r, "a:t") : undefined;
    expect(getTextContent(t!)).toBe("Hello");
  });

  it("adds xml:space=\"preserve\" for whitespace-sensitive text", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [{ type: "text", text: "  leading" }],
    };
    const el = serializeParagraph(paragraph);
    const t = getChild(getChild(el, "a:r")!, "a:t")!;
    expect(t.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(t)).toBe("  leading");
  });

  it("serializes bold/italic", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [{ type: "text", text: "Hi", properties: { bold: true, italic: true } }],
    };
    const el = serializeParagraph(paragraph);
    const rPr = getChild(getChild(el, "a:r")!, "a:rPr");
    expect(rPr?.attrs.b).toBe("1");
    expect(rPr?.attrs.i).toBe("1");
  });

  it("serializes underline/strike/font size/color", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [
        {
          type: "text",
          text: "Styled",
          properties: {
            underline: "sng",
            strike: "sngStrike",
            fontSize: pt(24),
            color: { spec: { type: "srgb", value: "FF0000" } },
          },
        },
      ],
    };
    const el = serializeParagraph(paragraph);
    const rPr = getChild(getChild(el, "a:r")!, "a:rPr")!;
    expect(rPr.attrs.u).toBe("sng");
    expect(rPr.attrs.strike).toBe("sngStrike");
    expect(rPr.attrs.sz).toBe("2400");
    const solidFill = getChild(rPr, "a:solidFill");
    const srgbClr = solidFill ? getChild(solidFill, "a:srgbClr") : undefined;
    expect(srgbClr?.attrs.val).toBe("FF0000");
  });

  it("serializes line breaks (a:br)", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [{ type: "break" }],
    };
    const el = serializeParagraph(paragraph);
    expect(getChild(el, "a:br")?.name).toBe("a:br");
  });

  it("serializes fields (a:fld)", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [{ type: "field", fieldType: "datetime", id: "1", text: "2026-01-10" }],
    };
    const el = serializeParagraph(paragraph);
    const fld = getChild(el, "a:fld");
    expect(fld?.attrs.type).toBe("datetime");
    expect(fld?.attrs.id).toBe("1");
    expect(getTextContent(getChild(fld!, "a:t")!)).toBe("2026-01-10");
  });

  it("serializes multiple runs in order", () => {
    const paragraph: Paragraph = {
      properties: {},
      runs: [
        { type: "text", text: "A" },
        { type: "break" },
        { type: "text", text: "B" },
      ],
    };
    const el = serializeParagraph(paragraph);
    const names = el.children.filter(isXmlElement).map((c) => c.name);
    expect(names).toEqual(["a:r", "a:br", "a:r"]);
    const runs = getChildren(el, "a:r");
    expect(getTextContent(getChild(runs[0]!, "a:t")!)).toBe("A");
    expect(getTextContent(getChild(runs[1]!, "a:t")!)).toBe("B");
  });
});
