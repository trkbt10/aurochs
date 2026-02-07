/** @file Converter tests */
import { convertDocToDocx } from "./index";
import type { DocDocument } from "../domain/types";

describe("convertDocToDocx", () => {
  it("converts empty document", () => {
    const doc: DocDocument = { paragraphs: [] };
    const result = convertDocToDocx(doc);

    expect(result.body.content).toEqual([]);
  });

  it("converts plain text paragraphs", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Hello" }] },
        { runs: [{ text: "World" }] },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(2);
    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "run", content: [{ type: "text", value: "Hello" }] }],
    });
  });

  it("maps justify alignment to both", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Justified" }], alignment: "justify" },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: { jc: "both" },
    });
  });

  it("maps center alignment", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Centered" }], alignment: "center" },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: { jc: "center" },
    });
  });

  it("converts run properties (bold, italic, fontSize)", () => {
    const doc: DocDocument = {
      paragraphs: [
        {
          runs: [
            {
              text: "Styled",
              bold: true,
              italic: true,
              fontSize: 14,
              fontName: "Arial",
              color: "FF0000",
            },
          ],
        },
      ],
    };

    const result = convertDocToDocx(doc);
    const run = (result.body.content[0] as { content: unknown[] }).content[0] as {
      properties: { b: boolean; i: boolean; sz: number; rFonts: { ascii: string } };
    };

    expect(run.properties.b).toBe(true);
    expect(run.properties.i).toBe(true);
    // 14pt → 28 half-points
    expect(run.properties.sz).toBe(28);
    expect(run.properties.rFonts.ascii).toBe("Arial");
  });
});
