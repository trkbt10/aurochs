/**
 * @file XLS XF fill → XLSX fill mapping
 */

import type { XlsxFill, XlsxPatternType } from "../../xlsx/domain/style/fill";
import type { XlsxColor } from "../../xlsx/domain/style/font";
import type { XlsXf } from "../domain/types";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";
import { convertXlsColorIndexToXlsxColor } from "./colors";

export type XlsXfFill = {
  readonly fls: number;
  readonly icvFore: number;
  readonly icvBack: number;
};

/** Parse the BIFF8 XF fill dword into `(fls, icvFore, icvBack)`. */
export function parseXlsXfFill(fillPatternAndColors: number): XlsXfFill {
  if (!Number.isInteger(fillPatternAndColors) || fillPatternAndColors < 0) {
    throw new Error(`parseXlsXfFill: invalid fillPatternAndColors: ${fillPatternAndColors}`);
  }

  // BIFF8 XF:
  // - fls: bits 31-26
  // - icvFore: bits 6-0
  // - icvBack: bits 13-7
  const fls = (fillPatternAndColors >>> 26) & 0x3f;
  const icvFore = fillPatternAndColors & 0x7f;
  const icvBack = (fillPatternAndColors >>> 7) & 0x7f;

  return { fls, icvFore, icvBack };
}

function mapFlsToPatternType(fls: number, ctx: XlsParseContext): XlsxPatternType {
  switch (fls) {
    case 0x00:
      return "none";
    case 0x01:
      return "solid";
    case 0x02:
      return "mediumGray";
    case 0x03:
      return "darkGray";
    case 0x04:
      return "lightGray";
    case 0x05:
      return "gray125";
    case 0x06:
      return "gray0625";
    case 0x07:
      return "darkHorizontal";
    case 0x08:
      return "darkVertical";
    case 0x09:
      return "darkDown";
    case 0x0a:
      return "darkUp";
    case 0x0b:
      return "darkGrid";
    case 0x0c:
      return "darkTrellis";
    case 0x0d:
      return "lightHorizontal";
    case 0x0e:
      return "lightVertical";
    case 0x0f:
      return "lightDown";
    case 0x10:
      return "lightUp";
    case 0x11:
      return "lightGrid";
    case 0x12:
      return "lightTrellis";
    default:
      try {
        throw new Error(`Unsupported XLS fill pattern (fls): 0x${fls.toString(16)}`);
      } catch (err) {
        warnOrThrow(
          ctx,
          { code: "FILL_PATTERN_UNSUPPORTED", where: "XF.fill", message: `Unsupported XLS fill pattern; using none: 0x${fls.toString(16)}`, meta: { fls } },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      return "none";
  }
}

function toFillColor(index: number): XlsxColor | undefined {
  // Skip "automatic" (0x7FFF) and common default 0 index by leaving it undefined.
  if (index === 0 || index === 0x7fff) {
    return undefined;
  }
  return convertXlsColorIndexToXlsxColor(index);
}

/** Convert an XLS XF fill into an XLSX fill. */
export function convertXlsXfToXlsxFill(xf: XlsXf, ctx: XlsParseContext = { mode: "strict" }): XlsxFill {
  const { fls, icvFore, icvBack } = parseXlsXfFill(xf.raw.fillPatternAndColors);
  const patternType = mapFlsToPatternType(fls, ctx);
  if (patternType === "none") {
    return { type: "none" };
  }

  const fgColor = toFillColor(icvFore);
  const bgColor = toFillColor(icvBack);

  return {
    type: "pattern",
    pattern: {
      patternType,
      ...(fgColor ? { fgColor } : {}),
      ...(bgColor ? { bgColor } : {}),
    },
  };
}
