/**
 * @file Tests for measurer.ts
 *
 * Focuses on invariant checks that are stable across environments.
 */

import { calculateCharWidth, estimateTextWidthFallback, measureTextDetailed, measureTextWidth } from "./measurer";

describe("measurer", () => {
  it("calculateCharWidth returns finite widths", () => {
    const result = calculateCharWidth({ char: "A", prevChar: undefined, fontSizePt: 12, fontFamily: "Arial", fontWeight: 400 });
    expect(Number.isFinite(result.width)).toBe(true);
    expect(Number.isFinite(result.kerningAdjust)).toBe(true);
    expect(Number.isFinite(result.totalWidth)).toBe(true);
    expect(result.totalWidth).toBe(result.width + result.kerningAdjust);
  });

  it("measureTextDetailed is consistent with estimateTextWidthFallback", () => {
    const text = "AV";
    const fontSizePt = 12;
    const letterSpacingPx = 1.5;
    const fontFamily = "Arial";
    const fontWeight = 400;

    const detailed = measureTextDetailed({ text, fontSizePt, letterSpacingPx, fontFamily, fontWeight });
    const estimated = estimateTextWidthFallback({ text, fontSizePt, letterSpacingPx, fontFamily, fontWeight });

    expect(detailed.totalWidth).toBe(estimated);
    expect(detailed.positions).toHaveLength(Array.from(text).length);
    expect(detailed.charWidths).toHaveLength(Array.from(text).length);
    expect(detailed.positions[0]).toBe(0);
  });

  it("measureTextDetailed positions match totalWidth accumulation", () => {
    const text = "AB";
    const fontSizePt = 10;
    const letterSpacingPx = 2;
    const fontFamily = "Arial";

    const detailed = measureTextDetailed({ text, fontSizePt, letterSpacingPx, fontFamily });

    expect(detailed.positions).toEqual([0, detailed.charWidths[0].totalWidth]);

    const expectedTotalWidth =
      detailed.positions[1] + detailed.charWidths[1].totalWidth + letterSpacingPx;
    expect(detailed.totalWidth).toBe(expectedTotalWidth);
  });

  it("measureTextWidth returns a finite number", () => {
    const width = measureTextWidth({ text: "Hello", fontSizePt: 12, letterSpacingPx: 0, fontFamily: "Arial", fontWeight: 400 });
    expect(Number.isFinite(width)).toBe(true);
  });
});
