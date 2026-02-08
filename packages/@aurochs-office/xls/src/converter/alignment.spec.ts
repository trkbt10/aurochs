/**
 * @file XLS alignment conversion tests
 */

import { convertXlsXfAlignmentToXlsxAlignment } from "./alignment";

describe("convertXlsXfAlignmentToXlsxAlignment", () => {
  it("maps all horizontal alignment codes", () => {
    const base = { vertical: 2, wrapText: false, rotation: 0, indent: 0, shrinkToFit: false } as const;

    const cases: Array<{ xls: number; xlsx: string }> = [
      { xls: 0, xlsx: "general" },
      { xls: 1, xlsx: "left" },
      { xls: 2, xlsx: "center" },
      { xls: 3, xlsx: "right" },
      { xls: 4, xlsx: "fill" },
      { xls: 5, xlsx: "justify" },
      { xls: 6, xlsx: "centerContinuous" },
      { xls: 7, xlsx: "distributed" },
    ];

    for (const c of cases) {
      const mapped = convertXlsXfAlignmentToXlsxAlignment({ ...base, horizontal: c.xls });
      expect(mapped).toEqual({ horizontal: c.xlsx, vertical: "bottom" });
    }
  });

  it("maps all vertical alignment codes", () => {
    const base = { horizontal: 0, wrapText: false, rotation: 0, indent: 0, shrinkToFit: false } as const;

    const cases: Array<{ xls: number; xlsx: string }> = [
      { xls: 0, xlsx: "top" },
      { xls: 1, xlsx: "center" },
      { xls: 2, xlsx: "bottom" },
      { xls: 3, xlsx: "justify" },
      { xls: 4, xlsx: "distributed" },
    ];

    for (const c of cases) {
      const mapped = convertXlsXfAlignmentToXlsxAlignment({ ...base, vertical: c.xls });
      expect(mapped).toEqual({ horizontal: "general", vertical: c.xlsx });
    }
  });

  it("passes through BIFF8 text rotation codes (0-90, 91-180, 255)", () => {
    const base = { horizontal: 0, vertical: 2, wrapText: false, indent: 0, shrinkToFit: false } as const;

    const cases = [0, 45, 90, 91, 135, 180, 255];
    for (const rotation of cases) {
      const mapped = convertXlsXfAlignmentToXlsxAlignment({ ...base, rotation });
      if (rotation === 0) {
        // 0 is omitted by mapping.
        expect(mapped).toEqual({ horizontal: "general", vertical: "bottom" });
      } else {
        expect(mapped).toEqual({ horizontal: "general", vertical: "bottom", textRotation: rotation });
      }
    }
  });

  it("omits alignment when all fields are defaults / unsupported", () => {
    expect(
      convertXlsXfAlignmentToXlsxAlignment({
        horizontal: 99,
        vertical: 99,
        wrapText: false,
        rotation: 0,
        indent: 0,
        shrinkToFit: false,
      }),
    ).toBeUndefined();
  });
});
