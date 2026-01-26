/**
 * @file XLS styles conversion tests
 */

import { convertXlsStylesToXlsxStyles } from "./styles";

describe("convertXlsStylesToXlsxStyles", () => {
  it("maps fonts, custom number formats, borders, and alignment into an XLSX stylesheet", () => {
    const fillRaw = (0x01 << 26) | (0x09 << 7) | 0x0a; // solid, icvBack=9, icvFore=10
    const { styles } = convertXlsStylesToXlsxStyles({
      dateSystem: "1900",
      sharedStrings: [],
      sheets: [],
      styles: [],
      fonts: [
        {
          heightTwips: 200,
          isItalic: true,
          isStrikeout: false,
          isOutline: false,
          isShadow: false,
          colorIndex: 0x08,
          weight: 700,
          script: 0,
          underline: 1,
          family: 2,
          charset: 0,
          name: "Arial",
        },
      ],
      numberFormats: [{ formatIndex: 164, formatCode: "0.00" }],
      xfs: [
        {
          fontIndex: 0,
          formatIndex: 164,
          isStyle: false,
          isLocked: true,
          isHidden: false,
          parentXfIndex: 0,
          alignment: { horizontal: 2, vertical: 1, wrapText: true, rotation: 0, indent: 1, shrinkToFit: false },
          attributes: {
            hasNumberFormat: true,
            hasFont: true,
            hasAlignment: true,
            hasBorder: true,
            hasPattern: true,
            hasProtection: true,
          },
          border: { left: 1, right: 0, top: 2, bottom: 3 },
          raw: { borderColorsAndDiag: 0, fillPatternAndColors: fillRaw },
        },
      ],
    });

    expect(styles.fonts[0]).toMatchObject({ name: "Arial", size: 10, bold: true, italic: true, underline: "single", family: 2 });
    expect(styles.numberFormats).toEqual([{ numFmtId: 164, formatCode: "0.00" }]);
    expect(styles.borders.length).toBe(2);
    expect(styles.fills.length).toBe(3);
    expect(styles.fills[2]).toEqual({
      type: "pattern",
      pattern: {
        patternType: "solid",
        fgColor: { type: "indexed", index: 10 },
        bgColor: { type: "indexed", index: 9 },
      },
    });
    expect(styles.cellXfs[0]).toMatchObject({
      numFmtId: 164,
      fontId: 0,
      fillId: 2,
      borderId: 1,
      applyNumberFormat: true,
      applyFont: true,
      applyBorder: true,
      applyAlignment: true,
      applyFill: true,
      applyProtection: true,
      alignment: { horizontal: "center", vertical: "center", wrapText: true, indent: 1 },
      protection: { locked: true },
    });
  });

  it("splits style XFs and cell XFs and wires cellXfs.xfId to the parent style XF", () => {
    const { styles } = convertXlsStylesToXlsxStyles({
      dateSystem: "1900",
      sharedStrings: [],
      sheets: [],
      // One built-in Normal style pointing at style XF 0
      styles: [{ kind: "builtIn", styleXfIndex: 0, builtInStyleId: 0, outlineLevel: 0 }],
      fonts: [],
      numberFormats: [],
      xfs: [
        // style XF
        {
          fontIndex: 0,
          formatIndex: 0,
          isStyle: true,
          isLocked: true,
          isHidden: false,
          parentXfIndex: 0x0fff,
          alignment: { horizontal: 0, vertical: 2, wrapText: false, rotation: 0, indent: 0, shrinkToFit: false },
          attributes: {
            hasNumberFormat: false,
            hasFont: false,
            hasAlignment: false,
            hasBorder: false,
            hasPattern: false,
            hasProtection: true,
          },
          border: { left: 0, right: 0, top: 0, bottom: 0 },
          raw: { borderColorsAndDiag: 0, fillPatternAndColors: 0 },
        },
        // cell XF that references style XF 0
        {
          fontIndex: 0,
          formatIndex: 0,
          isStyle: false,
          isLocked: true,
          isHidden: false,
          parentXfIndex: 0,
          alignment: { horizontal: 0, vertical: 2, wrapText: false, rotation: 0, indent: 0, shrinkToFit: false },
          attributes: {
            hasNumberFormat: false,
            hasFont: false,
            hasAlignment: false,
            hasBorder: false,
            hasPattern: false,
            hasProtection: true,
          },
          border: { left: 0, right: 0, top: 0, bottom: 0 },
          raw: { borderColorsAndDiag: 0, fillPatternAndColors: 0 },
        },
      ],
    });

    expect(styles.cellStyleXfs).toHaveLength(1);
    expect(styles.cellXfs).toHaveLength(1);
    expect(styles.cellXfs[0]?.xfId).toBe(0);
    expect(styles.cellStyles).toEqual([{ name: "Normal", xfId: 0, builtinId: 0 }]);
  });
});
