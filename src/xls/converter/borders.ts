/**
 * @file XLS XF border → XLSX border mapping
 */

import type { XlsxBorder, XlsxBorderStyle } from "../../xlsx/domain/style/border";
import type { XlsXfBorderStyles } from "../domain/types";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";

function mapBorderStyle(v: number, ctx: XlsParseContext): XlsxBorderStyle {
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
      try {
        throw new Error(`Unsupported XLS border style: 0x${v.toString(16)}`);
      } catch (err) {
        warnOrThrow(
          ctx,
          { code: "BORDER_STYLE_UNSUPPORTED", where: "XF.border", message: `Unsupported XLS border style; using none: 0x${v.toString(16)}`, meta: { style: v } },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      return "none";
  }
}

/** Convert an XLS XF border structure into an XLSX border. */
export function convertXlsBorderStylesToXlsxBorder(border: XlsXfBorderStyles, ctx: XlsParseContext = { mode: "strict" }): XlsxBorder {
  const left = mapBorderStyle(border.left, ctx);
  const right = mapBorderStyle(border.right, ctx);
  const top = mapBorderStyle(border.top, ctx);
  const bottom = mapBorderStyle(border.bottom, ctx);

  return {
    ...(left !== "none" ? { left: { style: left } } : {}),
    ...(right !== "none" ? { right: { style: right } } : {}),
    ...(top !== "none" ? { top: { style: top } } : {}),
    ...(bottom !== "none" ? { bottom: { style: bottom } } : {}),
  };
}
