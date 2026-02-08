/**
 * @file XLS color index conversion tests
 */

import { convertXlsColorIndexToXlsxColor } from "./colors";

describe("convertXlsColorIndexToXlsxColor", () => {
  it("maps 0x7FFF to auto", () => {
    expect(convertXlsColorIndexToXlsxColor(0x7fff)).toEqual({ type: "auto" });
  });

  it("maps other indices to indexed", () => {
    expect(convertXlsColorIndexToXlsxColor(0x08)).toEqual({ type: "indexed", index: 8 });
  });
});
