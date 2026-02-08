/**
 * @file Style Equality Helpers
 *
 * Provides structural equality checks for style-domain objects (font/fill/border/xf).
 * Used by mutation/upsert logic to deduplicate style records when constructing or patching workbooks.
 */

import type { XlsxBorder, XlsxBorderEdge } from "../border";
import type { XlsxFill, XlsxColor as XlsxFillColor } from "../fill";
import type { XlsxFont, XlsxColor as XlsxFontColor } from "../font";
import type { XlsxAlignment, XlsxCellXf } from "../types";

type XlsxColorLike = XlsxFontColor | XlsxFillColor;

const isEqualColor = (left: XlsxColorLike | undefined, right: XlsxColorLike | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  if (left.type !== right.type) {
    return false;
  }
  switch (left.type) {
    case "auto":
      return true;
    case "rgb":
      return right.type === "rgb" && left.value === right.value;
    case "indexed":
      return right.type === "indexed" && left.index === right.index;
    case "theme": {
      return right.type === "theme" && left.theme === right.theme && left.tint === right.tint;
    }
  }
};

export const isEqualFont = (left: XlsxFont, right: XlsxFont): boolean => {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strikethrough === right.strikethrough &&
    isEqualColor(left.color, right.color) &&
    left.family === right.family &&
    left.scheme === right.scheme &&
    left.vertAlign === right.vertAlign &&
    left.outline === right.outline &&
    left.shadow === right.shadow &&
    left.condense === right.condense &&
    left.extend === right.extend
  );
};

export const isEqualFill = (left: XlsxFill, right: XlsxFill): boolean => {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "none") {
    return true;
  }
  if (left.type === "pattern") {
    if (right.type !== "pattern") {
      return false;
    }
    return (
      left.pattern.patternType === right.pattern.patternType &&
      isEqualColor(left.pattern.fgColor, right.pattern.fgColor) &&
      isEqualColor(left.pattern.bgColor, right.pattern.bgColor)
    );
  }
  if (right.type !== "gradient") {
    return false;
  }
  if (left.gradient.gradientType !== right.gradient.gradientType) {
    return false;
  }
  if (left.gradient.degree !== right.gradient.degree) {
    return false;
  }
  if (left.gradient.stops.length !== right.gradient.stops.length) {
    return false;
  }
  for (let i = 0; i < left.gradient.stops.length; i += 1) {
    const lStop = left.gradient.stops[i]!;
    const rStop = right.gradient.stops[i]!;
    if (lStop.position !== rStop.position) {
      return false;
    }
    if (!isEqualColor(lStop.color, rStop.color)) {
      return false;
    }
  }
  return true;
};

const isEqualBorderEdge = (left: XlsxBorderEdge | undefined, right: XlsxBorderEdge | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.style === right.style && isEqualColor(left.color, right.color);
};

export const isEqualBorder = (left: XlsxBorder, right: XlsxBorder): boolean => {
  return (
    isEqualBorderEdge(left.left, right.left) &&
    isEqualBorderEdge(left.right, right.right) &&
    isEqualBorderEdge(left.top, right.top) &&
    isEqualBorderEdge(left.bottom, right.bottom) &&
    isEqualBorderEdge(left.diagonal, right.diagonal) &&
    left.diagonalUp === right.diagonalUp &&
    left.diagonalDown === right.diagonalDown &&
    left.outline === right.outline
  );
};

const isEqualAlignment = (left: XlsxAlignment | undefined, right: XlsxAlignment | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.horizontal === right.horizontal &&
    left.vertical === right.vertical &&
    left.wrapText === right.wrapText &&
    left.shrinkToFit === right.shrinkToFit &&
    left.textRotation === right.textRotation &&
    left.indent === right.indent &&
    left.readingOrder === right.readingOrder
  );
};

export const isEqualCellXf = (left: XlsxCellXf, right: XlsxCellXf): boolean => {
  return (
    left.numFmtId === right.numFmtId &&
    left.fontId === right.fontId &&
    left.fillId === right.fillId &&
    left.borderId === right.borderId &&
    left.xfId === right.xfId &&
    isEqualAlignment(left.alignment, right.alignment) &&
    left.applyNumberFormat === right.applyNumberFormat &&
    left.applyFont === right.applyFont &&
    left.applyFill === right.applyFill &&
    left.applyBorder === right.applyBorder &&
    left.applyAlignment === right.applyAlignment &&
    left.applyProtection === right.applyProtection
  );
};
