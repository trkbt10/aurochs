/**
 * @file XLS STYLE → XLSX cellStyles mapping
 */

import type { XlsxCellStyle } from "../../xlsx/domain/style/types";
import type { XlsWorkbook } from "../domain/types";

function mapBuiltInStyleName(styleId: number, outlineLevel: number | undefined): string {
  switch (styleId) {
    case 0x00:
      return "Normal";
    case 0x01: {
      const n = (outlineLevel ?? 0) + 1;
      return `RowLevel_${n}`;
    }
    case 0x02: {
      const n = (outlineLevel ?? 0) + 1;
      return `ColLevel_${n}`;
    }
    case 0x03:
      return "Comma";
    case 0x04:
      return "Currency";
    case 0x05:
      return "Percent";
    case 0x06:
      return "Comma[0]";
    case 0x07:
      return "Currency[0]";
    default:
      return `BuiltIn_${styleId}`;
  }
}

export function convertXlsStylesToXlsxCellStyles(
  xls: Pick<XlsWorkbook, "styles">,
  styleXfIndexToCellStyleXfId: ReadonlyMap<number, number>,
): readonly XlsxCellStyle[] {
  if (!xls) {
    throw new Error("convertXlsStylesToXlsxCellStyles: xls must be provided");
  }

  const names = new Set<string>();
  const out: XlsxCellStyle[] = [];

  for (const style of xls.styles) {
    const xfId = styleXfIndexToCellStyleXfId.get(style.styleXfIndex);
    if (xfId === undefined) {
      throw new Error(`STYLE: styleXfIndex not found in style XFs: ${style.styleXfIndex}`);
    }

    if (style.kind === "builtIn") {
      const builtInStyleId = style.builtInStyleId ?? 0;
      const name = mapBuiltInStyleName(builtInStyleId, style.outlineLevel);
      if (names.has(name)) {
        throw new Error(`Duplicate cell style name: ${name}`);
      }
      names.add(name);
      out.push({ name, xfId, builtinId: builtInStyleId });
      continue;
    }

    const name = style.name ?? "";
    if (!name) {
      throw new Error("STYLE (userDefined): name must be provided");
    }
    if (names.has(name)) {
      throw new Error(`Duplicate cell style name: ${name}`);
    }
    names.add(name);
    out.push({ name, xfId });
  }

  return out;
}

