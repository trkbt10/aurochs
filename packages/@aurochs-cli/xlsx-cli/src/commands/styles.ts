/**
 * @file styles command - display stylesheet definitions
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { XlsxFont, XlsxColor } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import type { XlsxBorder } from "@aurochs-office/xlsx/domain/style/border";
import type { XlsxNumberFormat } from "@aurochs-office/xlsx/domain/style/number-format";
import type { XlsxCellXf, XlsxCellStyle } from "@aurochs-office/xlsx/domain/style/types";

// =============================================================================
// Types
// =============================================================================

export type ColorJson = {
  readonly type: string;
  readonly value?: string;
  readonly theme?: number;
  readonly tint?: number;
  readonly index?: number;
};

export type FontJson = {
  readonly id: number;
  readonly name: string;
  readonly size: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: string;
  readonly strikethrough?: boolean;
  readonly color?: ColorJson;
  readonly scheme?: string;
};

export type FillJson = {
  readonly id: number;
  readonly type: string;
  readonly patternType?: string;
  readonly fgColor?: ColorJson;
  readonly bgColor?: ColorJson;
  readonly gradientType?: string;
  readonly degree?: number;
};

export type BorderSideJson = {
  readonly style?: string;
  readonly color?: ColorJson;
};

export type BorderJson = {
  readonly id: number;
  readonly left?: BorderSideJson;
  readonly right?: BorderSideJson;
  readonly top?: BorderSideJson;
  readonly bottom?: BorderSideJson;
  readonly diagonal?: BorderSideJson;
};

export type NumberFormatJson = {
  readonly id: number;
  readonly formatCode: string;
};

export type CellXfJson = {
  readonly id: number;
  readonly numFmtId: number;
  readonly fontId: number;
  readonly fillId: number;
  readonly borderId: number;
  readonly xfId?: number;
  readonly applyNumberFormat?: boolean;
  readonly applyFont?: boolean;
  readonly applyFill?: boolean;
  readonly applyBorder?: boolean;
  readonly applyAlignment?: boolean;
  readonly applyProtection?: boolean;
  readonly alignment?: {
    readonly horizontal?: string;
    readonly vertical?: string;
    readonly wrapText?: boolean;
    readonly shrinkToFit?: boolean;
    readonly textRotation?: number;
    readonly indent?: number;
  };
  readonly protection?: {
    readonly locked?: boolean;
    readonly hidden?: boolean;
  };
};

export type CellStyleJson = {
  readonly name: string;
  readonly xfId: number;
  readonly builtinId?: number;
};

export type StylesData = {
  readonly fonts: readonly FontJson[];
  readonly fills: readonly FillJson[];
  readonly borders: readonly BorderJson[];
  readonly numberFormats: readonly NumberFormatJson[];
  readonly cellXfs: readonly CellXfJson[];
  readonly cellStyles: readonly CellStyleJson[];
  readonly summary: {
    readonly fontCount: number;
    readonly fillCount: number;
    readonly borderCount: number;
    readonly numberFormatCount: number;
    readonly cellXfCount: number;
    readonly cellStyleCount: number;
    readonly dxfCount: number;
  };
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function serializeColor(color: XlsxColor | undefined): ColorJson | undefined {
  if (!color) {
    return undefined;
  }
  switch (color.type) {
    case "rgb":
      return { type: "rgb", value: color.value };
    case "theme":
      return { type: "theme", theme: color.theme, ...(color.tint !== undefined && { tint: color.tint }) };
    case "indexed":
      return { type: "indexed", index: color.index };
    case "auto":
      return { type: "auto" };
    default:
      return undefined;
  }
}

function serializeFont(font: XlsxFont, id: number): FontJson {
  return {
    id,
    name: font.name,
    size: font.size,
    ...(font.bold && { bold: font.bold }),
    ...(font.italic && { italic: font.italic }),
    ...(font.underline && { underline: font.underline }),
    ...(font.strikethrough && { strikethrough: font.strikethrough }),
    ...(font.color && { color: serializeColor(font.color) }),
    ...(font.scheme && { scheme: font.scheme }),
  };
}

function serializeFill(fill: XlsxFill, id: number): FillJson {
  switch (fill.type) {
    case "none":
      return { id, type: "none" };
    case "pattern":
      return {
        id,
        type: "pattern",
        patternType: fill.pattern.patternType,
        ...(fill.pattern.fgColor && { fgColor: serializeColor(fill.pattern.fgColor) }),
        ...(fill.pattern.bgColor && { bgColor: serializeColor(fill.pattern.bgColor) }),
      };
    case "gradient":
      return {
        id,
        type: "gradient",
        gradientType: fill.gradient.gradientType,
        ...(fill.gradient.degree !== undefined && { degree: fill.gradient.degree }),
      };
    default:
      return { id, type: "unknown" };
  }
}

function serializeBorderSide(side: XlsxBorder[keyof XlsxBorder]): BorderSideJson | undefined {
  if (!side) {
    return undefined;
  }
  return {
    ...(side.style && { style: side.style }),
    ...(side.color && { color: serializeColor(side.color) }),
  };
}

function serializeBorder(border: XlsxBorder, id: number): BorderJson {
  return {
    id,
    ...(border.left && { left: serializeBorderSide(border.left) }),
    ...(border.right && { right: serializeBorderSide(border.right) }),
    ...(border.top && { top: serializeBorderSide(border.top) }),
    ...(border.bottom && { bottom: serializeBorderSide(border.bottom) }),
    ...(border.diagonal && { diagonal: serializeBorderSide(border.diagonal) }),
  };
}

function serializeNumberFormat(fmt: XlsxNumberFormat, id: number): NumberFormatJson {
  return {
    id,
    formatCode: fmt.formatCode,
  };
}

function serializeCellXf(xf: XlsxCellXf, id: number): CellXfJson {
  return {
    id,
    numFmtId: xf.numFmtId,
    fontId: xf.fontId,
    fillId: xf.fillId,
    borderId: xf.borderId,
    ...(xf.xfId !== undefined && { xfId: xf.xfId }),
    ...(xf.applyNumberFormat !== undefined && { applyNumberFormat: xf.applyNumberFormat }),
    ...(xf.applyFont !== undefined && { applyFont: xf.applyFont }),
    ...(xf.applyFill !== undefined && { applyFill: xf.applyFill }),
    ...(xf.applyBorder !== undefined && { applyBorder: xf.applyBorder }),
    ...(xf.applyAlignment !== undefined && { applyAlignment: xf.applyAlignment }),
    ...(xf.applyProtection !== undefined && { applyProtection: xf.applyProtection }),
    ...(xf.alignment && {
      alignment: {
        ...(xf.alignment.horizontal && { horizontal: xf.alignment.horizontal }),
        ...(xf.alignment.vertical && { vertical: xf.alignment.vertical }),
        ...(xf.alignment.wrapText !== undefined && { wrapText: xf.alignment.wrapText }),
        ...(xf.alignment.shrinkToFit !== undefined && { shrinkToFit: xf.alignment.shrinkToFit }),
        ...(xf.alignment.textRotation !== undefined && { textRotation: xf.alignment.textRotation }),
        ...(xf.alignment.indent !== undefined && { indent: xf.alignment.indent }),
      },
    }),
    ...(xf.protection && {
      protection: {
        ...(xf.protection.locked !== undefined && { locked: xf.protection.locked }),
        ...(xf.protection.hidden !== undefined && { hidden: xf.protection.hidden }),
      },
    }),
  };
}

function serializeCellStyle(style: XlsxCellStyle): CellStyleJson {
  return {
    name: style.name,
    xfId: style.xfId,
    ...(style.builtinId !== undefined && { builtinId: style.builtinId }),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display stylesheet definitions from an XLSX file.
 */
export async function runStyles(filePath: string, options: { section?: string } = {}): Promise<Result<StylesData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);
    const styles = workbook.styles;

    const fonts = styles.fonts.map((f, i) => serializeFont(f, i));
    const fills = styles.fills.map((f, i) => serializeFill(f, i));
    const borders = styles.borders.map((b, i) => serializeBorder(b, i));
    const numberFormats = styles.numberFormats.map((f, i) => serializeNumberFormat(f, i));
    const cellXfs = styles.cellXfs.map((x, i) => serializeCellXf(x, i));
    const cellStyles = styles.cellStyles.map(serializeCellStyle);

    // Apply section filter if specified
    const section = options.section?.toLowerCase();
    const filterBySection = <T>(items: readonly T[], sectionName: string): readonly T[] => {
      return section && section !== sectionName ? [] : items;
    };

    return success({
      fonts: filterBySection(fonts, "fonts"),
      fills: filterBySection(fills, "fills"),
      borders: filterBySection(borders, "borders"),
      numberFormats: filterBySection(numberFormats, "numberformats"),
      cellXfs: filterBySection(cellXfs, "cellxfs"),
      cellStyles: filterBySection(cellStyles, "cellstyles"),
      summary: {
        fontCount: styles.fonts.length,
        fillCount: styles.fills.length,
        borderCount: styles.borders.length,
        numberFormatCount: styles.numberFormats.length,
        cellXfCount: styles.cellXfs.length,
        cellStyleCount: styles.cellStyles.length,
        dxfCount: styles.dxfs?.length ?? 0,
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
