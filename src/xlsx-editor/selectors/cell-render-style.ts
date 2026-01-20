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
import { xlsxColorToCss, type XlsxColorLike } from "./xlsx-color";
import { resolveCellXf } from "./cell-xf";

function pointsToCssPx(points: number): string {
  return `${(points * 96) / 72}px`;
}

function applyAlignment(style: CSSProperties, alignment: XlsxAlignment | undefined): void {
  if (!alignment) {
    return;
  }

  if (alignment.horizontal === "left") {
    style.justifyContent = "flex-start";
  } else if (alignment.horizontal === "center" || alignment.horizontal === "centerContinuous") {
    style.justifyContent = "center";
  } else if (alignment.horizontal === "right") {
    style.justifyContent = "flex-end";
  }

  if (alignment.vertical === "top") {
    style.alignItems = "flex-start";
  } else if (alignment.vertical === "center") {
    style.alignItems = "center";
  } else if (alignment.vertical === "bottom") {
    style.alignItems = "flex-end";
  }

  if (alignment.wrapText === true) {
    style.whiteSpace = "normal";
  }
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

export function resolveCellRenderStyle(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
}): CSSProperties {
  const { styles, sheet, address, cell } = params;
  const { xf: resolvedXf } = resolveCellXf({ styles, sheet, address, cell });
  const css: CSSProperties = {};

  const font = styles.fonts[resolvedXf.fontId as number];
  if (font) {
    css.fontFamily = font.name;
    css.fontSize = pointsToCssPx(font.size);
    if (font.bold) css.fontWeight = 700;
    if (font.italic) css.fontStyle = "italic";
    if (font.color) {
      const color = xlsxColorToCss(font.color as XlsxColorLike);
      if (color) css.color = color;
    }

    const decorations: string[] = [];
    if (font.underline && font.underline !== "none") {
      decorations.push("underline");
    }
    if (font.strikethrough) {
      decorations.push("line-through");
    }
    if (decorations.length > 0) {
      css.textDecorationLine = decorations.join(" ");
    }
  }

  const fill = styles.fills[resolvedXf.fillId as number];
  if (fill?.type === "pattern" && fill.pattern.patternType === "solid") {
    const fg = xlsxColorToCss(fill.pattern.fgColor as XlsxColorLike | undefined);
    if (fg) {
      css.backgroundColor = fg;
    }
  }

  applyAlignment(css, resolvedXf.alignment);

  return css;
}

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

  let result: CellBorderDecoration = {};
  if (left) {
    result = {
      ...result,
      left: { ...left, color: xlsxColorToCss(border.left?.color as XlsxColorLike | undefined) ?? fallback },
    };
  }
  if (right) {
    result = {
      ...result,
      right: { ...right, color: xlsxColorToCss(border.right?.color as XlsxColorLike | undefined) ?? fallback },
    };
  }
  if (top) {
    result = {
      ...result,
      top: { ...top, color: xlsxColorToCss(border.top?.color as XlsxColorLike | undefined) ?? fallback },
    };
  }
  if (bottom) {
    result = {
      ...result,
      bottom: { ...bottom, color: xlsxColorToCss(border.bottom?.color as XlsxColorLike | undefined) ?? fallback },
    };
  }

  const hasAny = Boolean(result.left || result.right || result.top || result.bottom);
  return hasAny ? result : undefined;
}
