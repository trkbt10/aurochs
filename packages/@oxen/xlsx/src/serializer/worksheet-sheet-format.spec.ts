/**
 * @file Worksheet Serializer (sheetFormatPr) Tests
 */

import { serializeElement } from "@oxen/xml";
import { serializeWorksheet } from "./worksheet";
import { colIdx } from "../domain/types";

function createMockSharedStrings() {
  const strings: string[] = [];
  const indexMap = new Map<string, number>();

  return {
    getIndex(value: string): number | undefined {
      return indexMap.get(value);
    },
    addString(value: string): number {
      const existing = indexMap.get(value);
      if (existing !== undefined) {
        return existing;
      }
      const index = strings.length;
      strings.push(value);
      indexMap.set(value, index);
      return index;
    },
  };
}

describe("serializeWorksheet (sheetFormatPr)", () => {
  it("serializes sheetFormatPr before cols", () => {
    const xml = serializeElement(
      serializeWorksheet(
        {
          dateSystem: "1900",
          name: "Sheet1",
          sheetId: 1,
          state: "visible",
          sheetFormatPr: { defaultRowHeight: 20, defaultColWidth: 10, zeroHeight: false },
          columns: [{ min: colIdx(1), max: colIdx(1), width: 12 }],
          rows: [],
          xmlPath: "xl/worksheets/sheet1.xml",
        },
        createMockSharedStrings(),
      ),
    );

    expect(xml).toContain('<sheetFormatPr defaultRowHeight="20" defaultColWidth="10" zeroHeight="0"/>');
    expect(xml.indexOf("<sheetFormatPr")).toBeLessThan(xml.indexOf("<cols"));
  });
});
