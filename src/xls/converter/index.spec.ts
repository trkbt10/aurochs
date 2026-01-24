import { convertXlsToXlsx } from "./index";

describe("convertXlsToXlsx", () => {
  it("converts a numeric cell to 1-based addresses", () => {
    const wb = convertXlsToXlsx({
      dateSystem: "1900",
      sharedStrings: [],
      fonts: [],
      numberFormats: [],
      xfs: [],
      styles: [],
      sheets: [
        {
          name: "Sheet1",
          state: "visible",
          dimensions: { firstRow: 0, lastRowExclusive: 1, firstCol: 0, lastColExclusive: 1 },
          rows: [],
          columns: [],
          mergeCells: [],
          cells: [{ row: 0, col: 0, xfIndex: 0, value: { type: "number", value: 123 } }],
        },
      ],
    });

    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0]?.rows[0]?.rowNumber).toBe(1);
    expect(wb.sheets[0]?.rows[0]?.cells[0]?.address).toEqual({ row: 1, col: 1, rowAbsolute: false, colAbsolute: false });
    expect(wb.sheets[0]?.rows[0]?.cells[0]?.value).toEqual({ type: "number", value: 123 });
    expect(wb.sheets[0]?.rows[0]?.cells[0]?.styleId).toBe(0);
    expect(wb.sheets[0]?.dimension).toEqual({
      start: { row: 1, col: 1, rowAbsolute: false, colAbsolute: false },
      end: { row: 1, col: 1, rowAbsolute: false, colAbsolute: false },
    });
  });

  it("preserves multiple sheet names/states and maps merge ranges", () => {
    const wb = convertXlsToXlsx({
      dateSystem: "1900",
      sharedStrings: ["Hello"],
      fonts: [],
      numberFormats: [],
      xfs: [],
      styles: [],
      sheets: [
        {
          name: "Visible",
          state: "visible",
          dimensions: { firstRow: 0, lastRowExclusive: 2, firstCol: 0, lastColExclusive: 2 },
          rows: [],
          columns: [],
          mergeCells: [{ firstRow: 0, lastRow: 1, firstCol: 0, lastCol: 0 }], // A1:A2
          cells: [{ row: 0, col: 0, xfIndex: 0, value: { type: "string", value: "Hello" } }],
        },
        {
          name: "Hidden",
          state: "veryHidden",
          rows: [],
          columns: [],
          mergeCells: [],
          cells: [],
        },
      ],
    });

    expect(wb.sheets.map((s) => ({ name: s.name, state: s.state }))).toEqual([
      { name: "Visible", state: "visible" },
      { name: "Hidden", state: "veryHidden" },
    ]);
    expect(wb.sheets[0]?.mergeCells).toEqual([
      {
        start: { row: 1, col: 1, rowAbsolute: false, colAbsolute: false },
        end: { row: 2, col: 1, rowAbsolute: false, colAbsolute: false },
      },
    ]);
  });

  it("sets a best-effort formula expression when tokens are supported", () => {
    const tokens = new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]); // 5 6 +
    const wb = convertXlsToXlsx({
      dateSystem: "1900",
      sharedStrings: [],
      fonts: [],
      numberFormats: [],
      xfs: [],
      styles: [],
      sheets: [
        {
          name: "Sheet1",
          state: "visible",
          dimensions: { firstRow: 0, lastRowExclusive: 1, firstCol: 0, lastColExclusive: 1 },
          rows: [],
          columns: [],
          mergeCells: [],
          cells: [
            {
              row: 0,
              col: 0,
              xfIndex: 0,
              value: { type: "number", value: 11 },
              formula: { tokens, alwaysCalc: false, calcOnLoad: false, isSharedFormula: false },
            },
          ],
        },
      ],
    });

    const cell = wb.sheets[0]?.rows[0]?.cells[0];
    expect(cell?.value).toEqual({ type: "number", value: 11 });
    expect(cell?.formula).toEqual({ type: "normal", expression: "5+6" });
  });
});
