/**
 * @file XLS fill conversion tests
 */

import { convertXlsXfToXlsxFill, parseXlsXfFill } from "./fills";

describe("parseXlsXfFill", () => {
  it("extracts fls/icvFore/icvBack from a BIFF8 XF fill dword", () => {
    const raw = (0x01 << 26) | (0x09 << 7) | 0x0a;
    expect(parseXlsXfFill(raw)).toEqual({ fls: 1, icvFore: 10, icvBack: 9 });
  });
});

describe("convertXlsXfToXlsxFill", () => {
  it("maps fls=0 to none", () => {
    expect(
      convertXlsXfToXlsxFill({
        fontIndex: 0,
        formatIndex: 0,
        isStyle: false,
        isLocked: false,
        isHidden: false,
        parentXfIndex: 0,
        alignment: { horizontal: 0, vertical: 0, wrapText: false, rotation: 0, indent: 0, shrinkToFit: false },
        attributes: { hasNumberFormat: false, hasFont: false, hasAlignment: false, hasBorder: false, hasPattern: false, hasProtection: false },
        border: { left: 0, right: 0, top: 0, bottom: 0 },
        raw: { borderColorsAndDiag: 0, fillPatternAndColors: 0 },
      }),
    ).toEqual({ type: "none" });
  });
});
