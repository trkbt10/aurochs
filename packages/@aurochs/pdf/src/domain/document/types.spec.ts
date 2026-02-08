/**
 * @file src/pdf/domain/document/types.spec.ts
 */

import { PDF_UNITS } from "./types";

describe("PDF_UNITS", () => {
  it("exposes PDF point conversions", () => {
    expect(PDF_UNITS.POINTS_PER_INCH).toBe(72);
    expect(PDF_UNITS.POINTS_PER_MM).toBeCloseTo(72 / 25.4, 12);
    expect(PDF_UNITS.inchesToPoints(1)).toBe(72);
    expect(PDF_UNITS.pointsToInches(72)).toBe(1);
  });

  it("converts A4 size accurately (210mm × 297mm)", () => {
    expect(PDF_UNITS.mmToPoints(210)).toBeCloseTo(595.28, 2);
    expect(PDF_UNITS.mmToPoints(297)).toBeCloseTo(841.89, 2);
  });

  it('converts US Letter size accurately (8.5" × 11")', () => {
    expect(PDF_UNITS.inchesToPoints(8.5)).toBe(612);
    expect(PDF_UNITS.inchesToPoints(11)).toBe(792);
  });

  it("round-trips points ↔ mm", () => {
    const mm = 123.4;
    const points = PDF_UNITS.mmToPoints(mm);
    expect(PDF_UNITS.pointsToMm(points)).toBeCloseTo(mm, 10);
  });
});

