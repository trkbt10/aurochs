/**
 * @file Tests for measurer.ts
 */

import { px, pt } from "@aurochs-office/drawing-ml/domain/units";
import { calculateCharWidth, measureTextDetailed, measureTextWidth } from "./measurer";

describe("text-layout measurer", () => {
  it("calculateCharWidth returns finite pixel values", () => {
    const r = calculateCharWidth("A", undefined, pt(12), "Arial", 400);
    expect(Number.isFinite(r.width as number)).toBe(true);
    expect(Number.isFinite(r.kerningAdjust as number)).toBe(true);
    expect(Number.isFinite(r.totalWidth as number)).toBe(true);
    expect(r.totalWidth as number).toBe((r.width as number) + (r.kerningAdjust as number));
  });

  it("measureTextWidth returns a finite pixel width", () => {
    const w = measureTextWidth("Hello", pt(12), px(0), "Arial", 400);
    expect(Number.isFinite(w as number)).toBe(true);
    expect(w as number).toBeGreaterThanOrEqual(0);
  });

  it("measureTextDetailed totalWidth is consistent with measureTextWidth", () => {
    const text = "AV";
    const fontSize = pt(12);
    const letterSpacing = px(1);
    const fontFamily = "Arial";

    const detailed = measureTextDetailed(text, fontSize, letterSpacing, fontFamily, 400);
    const width = measureTextWidth(text, fontSize, letterSpacing, fontFamily, 400);

    expect(detailed.totalWidth as number).toBe(width as number);
    expect(detailed.positions).toHaveLength(Array.from(text).length);
    expect(detailed.charWidths).toHaveLength(Array.from(text).length);
    expect(detailed.positions[0] as number).toBe(0);
  });
});
