/**
 * @file XLS style sources → XLSX StyleSheet mapping
 */

import type { XlsxStyleSheet, XlsxCellXf } from "../../xlsx/domain/style/types";
import { createDefaultStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxBorder } from "../../xlsx/domain/style/border";
import type { XlsxFill } from "../../xlsx/domain/style/fill";
import { borderId, fillId, fontId, numFmtId, styleId } from "../../xlsx/domain/types";
import type { XlsWorkbook, XlsXf } from "../domain/types";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";
import { convertXlsFontsToXlsxFonts } from "./fonts";
import { convertXlsNumberFormatsToXlsxNumberFormats } from "./number-formats";
import { convertXlsXfAlignmentToXlsxAlignment } from "./alignment";
import { convertXlsBorderStylesToXlsxBorder } from "./borders";
import { convertXlsXfToXlsxFill } from "./fills";
import { buildXlsxIndexedColorsFromXlsPalette } from "./indexed-colors";
import { convertXlsStylesToXlsxCellStyles } from "./cell-styles";

export type XlsStyleConversionResult = {
  readonly styles: XlsxStyleSheet;
  readonly xfIndexToStyleId: readonly (ReturnType<typeof styleId> | undefined)[];
};

function isEmptyBorder(border: XlsxBorder): boolean {
  return border.left === undefined && border.right === undefined && border.top === undefined && border.bottom === undefined;
}

function buildBordersFromXlsXfs(
  xfs: readonly XlsXf[],
  ctx: XlsParseContext,
): { readonly borders: readonly XlsxBorder[]; readonly getBorderId: (xf: XlsXf) => number } {
  const defaultBorder: XlsxBorder = {};
  const borders: XlsxBorder[] = [defaultBorder];
  const indexByKey = new Map<string, number>();
  indexByKey.set(JSON.stringify(defaultBorder), 0);

  for (const xf of xfs) {
    const border = convertXlsBorderStylesToXlsxBorder(xf.border, ctx);
    if (isEmptyBorder(border)) {
      continue;
    }

    const key = JSON.stringify(border);
    if (indexByKey.has(key)) {
      continue;
    }
    const newId = borders.length;
    borders.push(border);
    indexByKey.set(key, newId);
  }

  function getBorderId(xf: XlsXf): number {
    const border = convertXlsBorderStylesToXlsxBorder(xf.border, ctx);
    if (isEmptyBorder(border)) {
      return 0;
    }
    const key = JSON.stringify(border);
    const id = indexByKey.get(key);
    if (id === undefined) {
      throw new Error("Border id not found for converted border (internal error)");
    }
    return id;
  }

  return { borders, getBorderId };
}

function buildFillsFromXlsXfs(
  xfs: readonly XlsXf[],
  ctx: XlsParseContext,
): { readonly fills: readonly XlsxFill[]; readonly getFillId: (xf: XlsXf) => number } {
  // Keep required default fills in indices 0..1.
  const base = createDefaultStyleSheet();
  const fills: XlsxFill[] = [...base.fills];
  const indexByKey = new Map<string, number>();
  fills.forEach((f, i) => indexByKey.set(JSON.stringify(f), i));

  for (const xf of xfs) {
    const fill = convertXlsXfToXlsxFill(xf, ctx);
    const key = JSON.stringify(fill);
    const existing = indexByKey.get(key);
    if (existing !== undefined) {
      continue;
    }
    const newId = fills.length;
    fills.push(fill);
    indexByKey.set(key, newId);
  }

  function getFillId(xf: XlsXf): number {
    const fill = convertXlsXfToXlsxFill(xf, ctx);
    const key = JSON.stringify(fill);
    const id = indexByKey.get(key);
    if (id === undefined) {
      throw new Error("Fill id not found for converted fill (internal error)");
    }
    return id;
  }

  return { fills, getFillId };
}

function convertXlsXfProtectionToXlsxProtection(xf: XlsXf): XlsxCellXf["protection"] | undefined {
  if (!xf.attributes.hasProtection) {
    return undefined;
  }
  return {
    locked: xf.isLocked ? true : undefined,
    hidden: xf.isHidden ? true : undefined,
  };
}

function convertXlsXfToXlsxCellXf(args: {
  readonly xf: XlsXf;
  readonly xfIndex: number;
  readonly fonts: XlsxStyleSheet["fonts"];
  readonly getBorderId: (xf: XlsXf) => number;
  readonly getFillId: (xf: XlsXf) => number;
  readonly xfId?: number;
  readonly ctx: XlsParseContext;
}): XlsxCellXf {
  const xf = args.xf;
  const resolvedFontIndex =
    Number.isInteger(xf.fontIndex) && xf.fontIndex >= 0 && xf.fontIndex < args.fonts.length ? xf.fontIndex : 0;
  if (resolvedFontIndex !== xf.fontIndex) {
    try {
      throw new Error(`XF[${args.xfIndex}]: fontIndex out of range: ${xf.fontIndex} (fonts=${args.fonts.length})`);
    } catch (err) {
      warnOrThrow(
        args.ctx,
        {
          code: "FONT_INDEX_OUT_OF_RANGE",
          where: `XF[${args.xfIndex}]`,
          message: `fontIndex out of range; using 0: ${xf.fontIndex}`,
          meta: { fontIndex: xf.fontIndex, fonts: args.fonts.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  const alignment = xf.attributes.hasAlignment ? convertXlsXfAlignmentToXlsxAlignment(xf.alignment) : undefined;
  const protection = convertXlsXfProtectionToXlsxProtection(xf);

  return {
    numFmtId: numFmtId(xf.formatIndex),
    fontId: fontId(resolvedFontIndex),
    fillId: fillId(args.getFillId(xf)),
    borderId: borderId(args.getBorderId(xf)),
    ...(args.xfId !== undefined ? { xfId: args.xfId } : {}),
    ...(alignment ? { alignment } : {}),
    ...(protection ? { protection } : {}),
    ...(xf.attributes.hasNumberFormat ? { applyNumberFormat: true } : {}),
    ...(xf.attributes.hasFont ? { applyFont: true } : {}),
    ...(xf.attributes.hasPattern ? { applyFill: true } : {}),
    ...(xf.attributes.hasBorder ? { applyBorder: true } : {}),
    ...(xf.attributes.hasAlignment ? { applyAlignment: true } : {}),
    ...(xf.attributes.hasProtection ? { applyProtection: true } : {}),
  };
}

/** Convert XLS style sources (fonts/xfs/styles/palette/...) into an XLSX stylesheet. */
export function convertXlsStylesToXlsxStyles(xls: XlsWorkbook, ctx: XlsParseContext = { mode: "strict" }): XlsStyleConversionResult {
  if (!xls) {
    throw new Error("convertXlsStylesToXlsxStyles: xls must be provided");
  }

  const indexedColors = xls.palette ? buildXlsxIndexedColorsFromXlsPalette(xls.palette) : undefined;

  if (xls.xfs.length === 0) {
    const stylesBase = createDefaultStyleSheet();
    if (indexedColors) {
      return { styles: { ...stylesBase, indexedColors }, xfIndexToStyleId: [styleId(0)] };
    }
    return { styles: stylesBase, xfIndexToStyleId: [styleId(0)] };
  }

  const styleXfs: { readonly xf: XlsXf; readonly xfIndex: number }[] = [];
  const cellXfs: { readonly xf: XlsXf; readonly xfIndex: number }[] = [];
  for (let i = 0; i < xls.xfs.length; i++) {
    const xf = xls.xfs[i];
    if (!xf) {
      continue;
    }
    if (xf.isStyle) {
      styleXfs.push({ xf, xfIndex: i });
    } else {
      cellXfs.push({ xf, xfIndex: i });
    }
  }

  const fonts = convertXlsFontsToXlsxFonts(xls.fonts);
  const numberFormats = convertXlsNumberFormatsToXlsxNumberFormats(xls.numberFormats);
  const { borders, getBorderId } = buildBordersFromXlsXfs(xls.xfs, ctx);
  const { fills, getFillId } = buildFillsFromXlsXfs(xls.xfs, ctx);

  const stylesBase = createDefaultStyleSheet();
  const styleXfIndexToCellStyleXfId = new Map<number, number>();
  function buildCellStyleXfs(): readonly XlsxCellXf[] {
    if (styleXfs.length === 0) {
      return stylesBase.cellStyleXfs;
    }
    return styleXfs.map((entry, idx) => {
      styleXfIndexToCellStyleXfId.set(entry.xfIndex, idx);
      return convertXlsXfToXlsxCellXf({ xf: entry.xf, xfIndex: entry.xfIndex, fonts, getBorderId, getFillId, ctx });
    });
  }

  function buildCellXfs(): readonly XlsxCellXf[] {
    if (cellXfs.length === 0) {
      return stylesBase.cellXfs;
    }
    return cellXfs.map((entry) => {
      const parent = entry.xf.parentXfIndex;
      const xfId = parent !== 0x0fff ? styleXfIndexToCellStyleXfId.get(parent) : undefined;
      return convertXlsXfToXlsxCellXf({ xf: entry.xf, xfIndex: entry.xfIndex, fonts, getBorderId, getFillId, xfId, ctx });
    });
  }

  const xlsxCellStyleXfs = buildCellStyleXfs();
  const xlsxCellXfsMutable: XlsxCellXf[] = [...buildCellXfs()];

  const xfIndexToStyleId: (ReturnType<typeof styleId> | undefined)[] = xls.xfs.map(() => undefined);
  for (let i = 0; i < cellXfs.length; i++) {
    const originalXfIndex = cellXfs[i]?.xfIndex;
    if (originalXfIndex === undefined) {
      continue;
    }
    xfIndexToStyleId[originalXfIndex] = styleId(i);
  }

  const usedXfIndices = new Set<number>();
  for (const sheet of xls.sheets) {
    for (const cell of sheet.cells) {
      usedXfIndices.add(cell.xfIndex);
    }
    for (const row of sheet.rows) {
      if (row.xfIndex !== undefined) {
        usedXfIndices.add(row.xfIndex);
      }
    }
    for (const col of sheet.columns) {
      if (col.xfIndex !== undefined) {
        usedXfIndices.add(col.xfIndex);
      }
    }
  }

  for (const xfIndex of usedXfIndices) {
    if (!Number.isInteger(xfIndex) || xfIndex < 0 || xfIndex >= xls.xfs.length) {
      try {
        throw new Error(`XF index out of range: ${xfIndex} (known=${xls.xfs.length})`);
      } catch (err) {
        warnOrThrow(
          ctx,
          {
            code: "XF_INDEX_OUT_OF_RANGE",
            where: "XF",
            message: `Sheet refers to out-of-range XF index; skipping: ${xfIndex}`,
            meta: { xfIndex, known: xls.xfs.length },
          },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      continue;
    }
    if (xfIndexToStyleId[xfIndex] !== undefined) {
      continue;
    }

    const xf = xls.xfs[xfIndex];
    if (!xf) {
      try {
        throw new Error(`XF index out of range: ${xfIndex} (known=${xls.xfs.length})`);
      } catch (err) {
        warnOrThrow(
          ctx,
          { code: "XF_INDEX_OUT_OF_RANGE", where: "XF", message: `XF index missing; skipping: ${xfIndex}` },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      continue;
    }
    if (!xf.isStyle) {
      throw new Error(`XF[${xfIndex}] is a cell XF but has no styleId mapping (internal error)`);
    }

    const xfId = styleXfIndexToCellStyleXfId.get(xfIndex);
    const converted = convertXlsXfToXlsxCellXf({ xf, xfIndex, fonts, getBorderId, getFillId, ...(xfId !== undefined ? { xfId } : {}), ctx });
    const newIndex = xlsxCellXfsMutable.length;
    xlsxCellXfsMutable.push(converted);
    xfIndexToStyleId[xfIndex] = styleId(newIndex);
  }

  const xlsxCellStyles =
    xls.styles.length > 0 ? convertXlsStylesToXlsxCellStyles(xls, styleXfIndexToCellStyleXfId, ctx) : stylesBase.cellStyles;

  const styles: XlsxStyleSheet = {
    ...stylesBase,
    fonts,
    fills,
    borders,
    ...(indexedColors ? { indexedColors } : {}),
    numberFormats,
    cellStyleXfs: xlsxCellStyleXfs,
    cellXfs: xlsxCellXfsMutable,
    cellStyles: xlsxCellStyles,
  };

  return { styles, xfIndexToStyleId };
}
