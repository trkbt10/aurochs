/**
 * @file Cell render style (SpreadsheetML)
 *
 * Resolves effective ECMA-376 (styles.xml) formatting into CSSProperties for rendering.
 */

import type { CSSProperties } from "react";
import type { CellAddress } from "../../xlsx/domain/cell/address";
import type { Cell } from "../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import type { XlsxStyleSheet, XlsxAlignment } from "../../xlsx/domain/style/types";
import type { XlsxDifferentialFormat } from "../../xlsx/domain/style/dxf";
import type { XlsxFill } from "../../xlsx/domain/style/fill";
import { xlsxColorToCss, type XlsxColorLike } from "./xlsx-color";
import { resolveCellXf } from "./cell-xf";

type XlsxCellRenderCssProperties = CSSProperties &
  Partial<Record<"--xlsx-cell-indent-start" | "--xlsx-cell-indent-end", string>>;

function pointsToCssPx(points: number): string {
  return `${(points * 96) / 72}px`;
}

function applyAlignment(style: XlsxCellRenderCssProperties, alignment: XlsxAlignment | undefined, cell: Cell | undefined): void {
  // ECMA-376 defines ST_HorizontalAlignment including `general`, but it is application-defined.
  // The editor adopts the common spreadsheet behavior (Excel): numbers/dates align right, most others align left.
  const horizontal = alignment?.horizontal;
  if (horizontal === "general" || horizontal === undefined) {
    if (cell?.value.type === "number" || cell?.value.type === "date") {
      style.justifyContent = "flex-end";
    }
  } else if (horizontal === "left") {
    // default
  } else if (horizontal === "center" || horizontal === "centerContinuous") {
    style.justifyContent = "center";
  } else if (horizontal === "right") {
    style.justifyContent = "flex-end";
  }

  if (!alignment) {
    return;
  }

  if (alignment.readingOrder === 1) {
    style.direction = "ltr";
  } else if (alignment.readingOrder === 2) {
    style.direction = "rtl";
  }

  const rotation = alignment.textRotation;
  if (typeof rotation === "number") {
    if (rotation === 255) {
      style.writingMode = "vertical-rl";
      style.textOrientation = "upright";
    } else if (rotation >= 0 && rotation <= 90) {
      if (rotation !== 0) {
        style.transform = `rotate(${-rotation}deg)`;
        style.transformOrigin = "center";
      }
    } else if (rotation >= 91 && rotation <= 180) {
      style.transform = `rotate(${rotation - 90}deg)`;
      style.transformOrigin = "center";
    }
  }

  if (alignment.vertical === "top") {
    style.alignItems = "flex-start";
  } else if (alignment.vertical === "bottom") {
    style.alignItems = "flex-end";
  }

  if (alignment.wrapText === true) {
    style.whiteSpace = "normal";
  }

  const indent = alignment.indent;
  if (typeof indent === "number" && indent > 0) {
    const amount = `${indent * 2}ch`;
    const justify = style.justifyContent;
    if (justify === "flex-end") {
      style["--xlsx-cell-indent-end"] = amount;
    } else {
      style["--xlsx-cell-indent-start"] = amount;
    }
  }
}

function resolveFillBackgroundColor(fill: XlsxFill | undefined, styles: XlsxStyleSheet): string | undefined {
  if (!fill || fill.type !== "pattern") {
    return undefined;
  }
  const fg = xlsxColorToCss(fill.pattern.fgColor as XlsxColorLike | undefined, { indexedColors: styles.indexedColors });
  if (fg) {
    return fg;
  }
  return xlsxColorToCss(fill.pattern.bgColor as XlsxColorLike | undefined, { indexedColors: styles.indexedColors });
}

type CssBorderStyle = "solid" | "dashed" | "dotted" | "double";

function borderStyleToCss(edgeStyle: string): { width: number; style: CssBorderStyle } | undefined {
  switch (edgeStyle) {
    case "none":
      return undefined;
    case "thin":
      return { width: 1, style: "solid" };
    case "medium":
      return { width: 2, style: "solid" };
    case "thick":
      return { width: 3, style: "solid" };
    case "dashed":
    case "mediumDashed":
    case "slantDashDot":
    case "dashDot":
    case "mediumDashDot":
    case "dashDotDot":
    case "mediumDashDotDot":
      return { width: 1, style: "dashed" };
    case "dotted":
    case "hair":
      return { width: 1, style: "dotted" };
    case "double":
      return { width: 3, style: "double" };
  }
  return { width: 1, style: "solid" };
}

export type CellBorderEdgeDecoration = {
  readonly width: number;
  readonly style: CssBorderStyle;
  readonly color: string;
};

export type CellBorderDecoration = {
  readonly left?: CellBorderEdgeDecoration;
  readonly right?: CellBorderEdgeDecoration;
  readonly top?: CellBorderEdgeDecoration;
  readonly bottom?: CellBorderEdgeDecoration;
};

/**
 * Resolve a cell's render style (font, fill, alignment) to be applied as CSS.
 *
 * Borders are intentionally handled separately as an SVG overlay.
 */
export function resolveCellRenderStyle(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly conditionalFormat?: XlsxDifferentialFormat;
  readonly tableStyleFormat?: XlsxDifferentialFormat;
}): XlsxCellRenderCssProperties {
  const { styles, sheet, address, cell } = params;
  const { xf: resolvedXf } = resolveCellXf({ styles, sheet, address, cell });
  const css: XlsxCellRenderCssProperties = {};

  const font = styles.fonts[resolvedXf.fontId as number];
  const tableFont = params.tableStyleFormat?.font;
  const dxfFont = params.conditionalFormat?.font;
  const effectiveFontName = dxfFont?.name ?? tableFont?.name ?? font?.name;
  const effectiveFontSize = dxfFont?.size ?? tableFont?.size ?? font?.size;
  const effectiveBold = dxfFont?.bold ?? tableFont?.bold ?? font?.bold;
  const effectiveItalic = dxfFont?.italic ?? tableFont?.italic ?? font?.italic;
  const effectiveUnderline = dxfFont?.underline ?? tableFont?.underline ?? font?.underline;
  const effectiveStrike = dxfFont?.strikethrough ?? tableFont?.strikethrough ?? font?.strikethrough;
  const effectiveColor = dxfFont?.color ?? tableFont?.color ?? font?.color;

  if (effectiveFontName) {
    css.fontFamily = effectiveFontName;
  }
  if (typeof effectiveFontSize === "number") {
    css.fontSize = pointsToCssPx(effectiveFontSize);
  }
  if (effectiveBold === true) {
    css.fontWeight = 700;
  }
  if (effectiveItalic === true) {
    css.fontStyle = "italic";
  }
  if (effectiveColor) {
    const color = xlsxColorToCss(effectiveColor as XlsxColorLike, { indexedColors: styles.indexedColors });
    if (color) {
      css.color = color;
    }
  }

  const decorations: string[] = [];
  if (effectiveUnderline && effectiveUnderline !== "none") {
    decorations.push("underline");
  }
  if (effectiveStrike) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    css.textDecorationLine = decorations.join(" ");
  }

  const fill = styles.fills[resolvedXf.fillId as number];
  if (fill?.type === "pattern" && fill.pattern.patternType === "solid") {
    const bg = resolveFillBackgroundColor(fill, styles);
    if (bg) {
      css.backgroundColor = bg;
    }
  }

  const tableBg = resolveFillBackgroundColor(params.tableStyleFormat?.fill, styles);
  if (tableBg) {
    css.backgroundColor = tableBg;
  }

  const conditionalBg = resolveFillBackgroundColor(params.conditionalFormat?.fill, styles);
  if (conditionalBg) {
    css.backgroundColor = conditionalBg;
  }

  applyAlignment(css, resolvedXf.alignment, cell);

  return css;
}

/**
 * Resolve a cell's border decoration (left/right/top/bottom) from styles.xml.
 *
 * This does not apply any DOM borders. Callers typically render this via an SVG overlay.
 */
export function resolveCellBorderDecoration(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly defaultBorderColor?: string;
}): CellBorderDecoration | undefined {
  const { styles, sheet, address, cell } = params;
  const fallback = params.defaultBorderColor ?? "var(--border-primary)";
  const { xf: resolvedXf } = resolveCellXf({ styles, sheet, address, cell });
  const border = styles.borders[resolvedXf.borderId as number];
  if (!border) {
    return undefined;
  }

  const left = border.left ? borderStyleToCss(border.left.style) : undefined;
  const right = border.right ? borderStyleToCss(border.right.style) : undefined;
  const top = border.top ? borderStyleToCss(border.top.style) : undefined;
  const bottom = border.bottom ? borderStyleToCss(border.bottom.style) : undefined;

  const toEdgeDecoration = (
    side: "left" | "right" | "top" | "bottom",
    edge: Pick<CellBorderEdgeDecoration, "width" | "style"> | undefined,
    color: string | undefined,
  ): CellBorderDecoration => {
    if (!edge) {
      return {};
    }
    const decorated: CellBorderEdgeDecoration = { ...edge, color: color ?? fallback };
    if (side === "left") {
      return { left: decorated };
    }
    if (side === "right") {
      return { right: decorated };
    }
    if (side === "top") {
      return { top: decorated };
    }
    return { bottom: decorated };
  };

  const leftDecoration = toEdgeDecoration(
    "left",
    left,
    xlsxColorToCss(border.left?.color as XlsxColorLike | undefined, { indexedColors: styles.indexedColors }),
  );
  const rightDecoration = toEdgeDecoration(
    "right",
    right,
    xlsxColorToCss(border.right?.color as XlsxColorLike | undefined, { indexedColors: styles.indexedColors }),
  );
  const topDecoration = toEdgeDecoration(
    "top",
    top,
    xlsxColorToCss(border.top?.color as XlsxColorLike | undefined, { indexedColors: styles.indexedColors }),
  );
  const bottomDecoration = toEdgeDecoration(
    "bottom",
    bottom,
    xlsxColorToCss(border.bottom?.color as XlsxColorLike | undefined, { indexedColors: styles.indexedColors }),
  );

  const result: CellBorderDecoration = {
    ...leftDecoration,
    ...rightDecoration,
    ...topDecoration,
    ...bottomDecoration,
  };

  const hasAny = Boolean(result.left || result.right || result.top || result.bottom);
  return hasAny ? result : undefined;
}
