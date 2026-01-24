/**
 * @file XLS XF border → XLSX border mapping
 */

import type { XlsxBorder, XlsxBorderStyle } from "../../xlsx/domain/style/border";
import type { XlsXfBorderStyles } from "../domain/types";

function mapBorderStyle(v: number): XlsxBorderStyle {
  switch (v) {
    case 0x00:
      return "none";
    case 0x01:
      return "thin";
    case 0x02:
      return "medium";
    case 0x03:
      return "dashed";
    case 0x04:
      return "dotted";
    case 0x05:
      return "thick";
    case 0x06:
      return "double";
    case 0x07:
      return "hair";
    case 0x08:
      return "mediumDashed";
    case 0x09:
      return "dashDot";
    case 0x0a:
      return "mediumDashDot";
    case 0x0b:
      return "dashDotDot";
    case 0x0c:
      return "mediumDashDotDot";
    case 0x0d:
      return "slantDashDot";
    default:
      throw new Error(`Unsupported XLS border style: 0x${v.toString(16)}`);
  }
}

export function convertXlsBorderStylesToXlsxBorder(border: XlsXfBorderStyles): XlsxBorder {
  const left = mapBorderStyle(border.left);
  const right = mapBorderStyle(border.right);
  const top = mapBorderStyle(border.top);
  const bottom = mapBorderStyle(border.bottom);

  return {
    ...(left !== "none" ? { left: { style: left } } : {}),
    ...(right !== "none" ? { right: { style: right } } : {}),
    ...(top !== "none" ? { top: { style: top } } : {}),
    ...(bottom !== "none" ? { bottom: { style: bottom } } : {}),
  };
}

