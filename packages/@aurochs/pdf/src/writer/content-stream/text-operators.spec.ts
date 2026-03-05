/**
 * @file Text Operators Tests
 */

import { serializeText, serializeTextBatch } from "./text-operators";
import type { PdfText } from "../../domain/text";
import type { PdfGraphicsState } from "../../domain/graphics-state";

// Minimal graphics state for testing
const minimalGraphicsState: PdfGraphicsState = {
  ctm: [1, 0, 0, 1, 0, 0],
  fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  lineWidth: 1,
  lineJoin: 0,
  lineCap: 0,
  miterLimit: 10,
  dashArray: [],
  dashPhase: 0,
  fillAlpha: 1,
  strokeAlpha: 1,
  charSpacing: 0,
  wordSpacing: 0,
  horizontalScaling: 100,
  textLeading: 0,
  textRenderingMode: 0,
  textRise: 0,
};

const createText = (overrides: Partial<PdfText> = {}): PdfText => ({
  type: "text",
  text: "Hello",
  x: 100,
  y: 700,
  width: 50,
  height: 12,
  fontName: "F1",
  fontSize: 12,
  graphicsState: minimalGraphicsState,
  ...overrides,
});

describe("serializeText", () => {
  const ctx = {
    fontNameToResource: new Map([["F1", "F1"]]),
  };

  it("serializes simple text", () => {
    const text = createText();
    const result = serializeText(text, ctx);

    expect(result).toContain("BT");
    expect(result).toContain("/F1 12 Tf");
    expect(result).toContain("(Hello) Tj");
    expect(result).toContain("ET");
  });

  it("uses baseline position when available", () => {
    const text = createText({
      baselineStartX: 100,
      baselineStartY: 710,
    });
    const result = serializeText(text, ctx);

    expect(result).toContain("1 0 0 1 100 710 Tm");
  });

  it("escapes parentheses in text", () => {
    const text = createText({ text: "Hello (world)" });
    const result = serializeText(text, ctx);

    expect(result).toContain("(Hello \\(world\\)) Tj");
  });

  it("escapes backslashes in text", () => {
    const text = createText({ text: "path\\file" });
    const result = serializeText(text, ctx);

    expect(result).toContain("(path\\\\file) Tj");
  });

  it("includes character spacing when non-zero", () => {
    const text = createText({ charSpacing: 2 });
    const result = serializeText(text, ctx);

    expect(result).toContain("2 Tc");
  });

  it("includes word spacing when non-zero", () => {
    const text = createText({ wordSpacing: 5 });
    const result = serializeText(text, ctx);

    expect(result).toContain("5 Tw");
  });

  it("includes horizontal scaling when not 100", () => {
    const text = createText({ horizontalScaling: 150 });
    const result = serializeText(text, ctx);

    expect(result).toContain("150 Tz");
  });

  it("maps font name through context", () => {
    const ctxWithMapping = {
      fontNameToResource: new Map([["Helvetica", "F2"]]),
    };
    const text = createText({ fontName: "Helvetica" });
    const result = serializeText(text, ctxWithMapping);

    expect(result).toContain("/F2 12 Tf");
  });
});

describe("serializeTextBatch", () => {
  const ctx = {
    fontNameToResource: new Map([
      ["F1", "F1"],
      ["F2", "F2"],
    ]),
  };

  it("returns empty string for empty array", () => {
    expect(serializeTextBatch([], ctx)).toBe("");
  });

  it("batches multiple texts in single BT/ET block", () => {
    const texts = [
      createText({ text: "Hello", x: 100, y: 700 }),
      createText({ text: "World", x: 100, y: 680 }),
    ];
    const result = serializeTextBatch(texts, ctx);

    // Should have only one BT and one ET
    expect(result.match(/BT/g)?.length).toBe(1);
    expect(result.match(/ET/g)?.length).toBe(1);

    expect(result).toContain("(Hello) Tj");
    expect(result).toContain("(World) Tj");
  });

  it("only emits Tf when font changes", () => {
    const texts = [
      createText({ text: "A", fontName: "F1", fontSize: 12 }),
      createText({ text: "B", fontName: "F1", fontSize: 12 }),
      createText({ text: "C", fontName: "F2", fontSize: 14 }),
    ];
    const result = serializeTextBatch(texts, ctx);

    // Should have 2 Tf operators (initial F1 and change to F2)
    expect(result.match(/Tf/g)?.length).toBe(2);
    expect(result).toContain("/F1 12 Tf");
    expect(result).toContain("/F2 14 Tf");
  });
});
