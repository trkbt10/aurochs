/**
 * @file Style preview component for cell format visualization
 *
 * Renders a small preview box showing the visual appearance of a cell style
 * (font, fill color, borders).
 */

import type { CSSProperties } from "react";
import type { XlsxStyleSheet, XlsxCellXf } from "../../../xlsx/domain/style/types";
import { xlsxColorToCss } from "../../selectors/xlsx-color";
import { radiusTokens } from "../../../office-editor-components/design-tokens";

export type StylePreviewProps = {
  readonly styles: XlsxStyleSheet;
  readonly cellXf: XlsxCellXf;
  readonly size?: "sm" | "md";
};

const sizeMap = { sm: 24, md: 32 };

function resolveFillBackground(
  styles: XlsxStyleSheet,
  cellXf: XlsxCellXf
): string {
  const fill = styles.fills[cellXf.fillId as number];
  if (!fill || fill.type === "none") {
    return "transparent";
  }
  if (fill.type === "pattern" && fill.pattern.patternType === "solid") {
    const fg = xlsxColorToCss(fill.pattern.fgColor, {
      indexedColors: styles.indexedColors,
    });
    const bg = xlsxColorToCss(fill.pattern.bgColor, {
      indexedColors: styles.indexedColors,
    });
    return fg ?? bg ?? "transparent";
  }
  return "transparent";
}

function resolveFontColor(
  styles: XlsxStyleSheet,
  cellXf: XlsxCellXf
): string | undefined {
  const font = styles.fonts[cellXf.fontId as number];
  if (!font?.color) {
    return undefined;
  }
  return xlsxColorToCss(font.color, { indexedColors: styles.indexedColors });
}

function hasBorder(styles: XlsxStyleSheet, cellXf: XlsxCellXf): boolean {
  const border = styles.borders[cellXf.borderId as number];
  if (!border) {
    return false;
  }
  return Boolean(border.left || border.right || border.top || border.bottom);
}

function getBorderStyle(hasBorderFlag: boolean): string {
  return hasBorderFlag ? "1px solid var(--border-primary)" : "1px solid var(--border-subtle)";
}

/**
 * Renders a visual preview of a cell format showing font, fill, and border styling.
 */
export function StylePreview({
  styles,
  cellXf,
  size = "sm",
}: StylePreviewProps) {
  const dimension = sizeMap[size];
  const font = styles.fonts[cellXf.fontId as number];
  const backgroundColor = resolveFillBackground(styles, cellXf);
  const fontColor = resolveFontColor(styles, cellXf);
  const borderExists = hasBorder(styles, cellXf);

  const hasUnderline = font?.underline && font.underline !== "none";

  const boxStyle: CSSProperties = {
    width: dimension,
    height: dimension,
    backgroundColor,
    border: getBorderStyle(borderExists),
    borderRadius: radiusTokens.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size === "sm" ? 10 : 12,
    fontWeight: font?.bold ? 700 : 400,
    fontStyle: font?.italic ? "italic" : "normal",
    color: fontColor ?? "var(--text-primary)",
    textDecoration: hasUnderline ? "underline" : undefined,
    flexShrink: 0,
  };

  return <div style={boxStyle}>Aa</div>;
}
