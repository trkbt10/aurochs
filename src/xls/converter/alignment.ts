/**
 * @file XLS XF alignment → XLSX alignment mapping
 */

import type { XlsxAlignment } from "../../xlsx/domain/style/types";
import type { XlsXfAlignment } from "../domain/types";

function mapHorizontal(v: number): XlsxAlignment["horizontal"] | undefined {
  switch (v) {
    case 0:
      return "general";
    case 1:
      return "left";
    case 2:
      return "center";
    case 3:
      return "right";
    case 4:
      return "fill";
    case 5:
      return "justify";
    case 6:
      return "centerContinuous";
    case 7:
      return "distributed";
    default:
      return undefined;
  }
}

function mapVertical(v: number): XlsxAlignment["vertical"] | undefined {
  switch (v) {
    case 0:
      return "top";
    case 1:
      return "center";
    case 2:
      return "bottom";
    case 3:
      return "justify";
    case 4:
      return "distributed";
    default:
      return undefined;
  }
}

/** Convert an XLS XF alignment structure into an XLSX alignment object. */
export function convertXlsXfAlignmentToXlsxAlignment(alignment: XlsXfAlignment): XlsxAlignment | undefined {
  const horizontal = mapHorizontal(alignment.horizontal);
  const vertical = mapVertical(alignment.vertical);
  const wrapText = alignment.wrapText ? true : undefined;
  const shrinkToFit = alignment.shrinkToFit ? true : undefined;
  const textRotation = alignment.rotation !== 0 ? alignment.rotation : undefined;
  const indent = alignment.indent !== 0 ? alignment.indent : undefined;

  if (
    horizontal === undefined &&
    vertical === undefined &&
    wrapText === undefined &&
    shrinkToFit === undefined &&
    textRotation === undefined &&
    indent === undefined
  ) {
    return undefined;
  }

  return {
    ...(horizontal ? { horizontal } : {}),
    ...(vertical ? { vertical } : {}),
    ...(wrapText ? { wrapText } : {}),
    ...(shrinkToFit ? { shrinkToFit } : {}),
    ...(textRotation !== undefined ? { textRotation } : {}),
    ...(indent !== undefined ? { indent } : {}),
  };
}
