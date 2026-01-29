/**
 * @file Tests for no-grouping strategy
 */

import type { PdfText } from "@oxen/pdf/domain";
import { createDefaultGraphicsState } from "@oxen/pdf/domain";
import { noGrouping } from "./no-grouping";

describe("noGrouping", () => {
  const createPdfText = (overrides: Partial<PdfText> = {}): PdfText => ({
    type: "text",
    text: "Test",
    x: 0,
    y: 0,
    width: 100,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  it("returns empty array for empty input", () => {
    expect(noGrouping([])).toEqual([]);
  });

  it("creates one GroupedText per PdfText", () => {
    const texts = [
      createPdfText({ text: "A", x: 0 }),
      createPdfText({ text: "B", x: 50 }),
    ];

    const groups = noGrouping(texts);

    expect(groups).toHaveLength(2);
  });

  it("preserves bounds from original PdfText", () => {
    const text = createPdfText({
      x: 10,
      y: 20,
      width: 100,
      height: 12,
    });

    const [group] = noGrouping([text]);

    expect(group.bounds).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 12,
    });
  });

  it("creates single paragraph with single run per group", () => {
    const text = createPdfText({ text: "Hello" });

    const [group] = noGrouping([text]);

    expect(group.paragraphs).toHaveLength(1);
    expect(group.paragraphs[0].runs).toHaveLength(1);
    expect(group.paragraphs[0].runs[0].text).toBe("Hello");
  });

  it("sets baselineY as y + height (approximate)", () => {
    const text = createPdfText({ y: 100, height: 12 });

    const [group] = noGrouping([text]);

    expect(group.paragraphs[0].baselineY).toBe(112);
  });
});
