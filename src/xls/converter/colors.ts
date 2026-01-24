/**
 * @file XLS color mapping utilities
 */

import type { XlsxColor } from "../../xlsx/domain/style/font";

export function convertXlsColorIndexToXlsxColor(colorIndex: number): XlsxColor {
  if (!Number.isInteger(colorIndex) || colorIndex < 0) {
    throw new Error(`convertXlsColorIndexToXlsxColor: invalid colorIndex: ${colorIndex}`);
  }
  if (colorIndex === 0x7fff) {
    return { type: "auto" };
  }
  return { type: "indexed", index: colorIndex };
}

