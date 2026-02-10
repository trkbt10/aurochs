/**
 * @file XLSX cell formatting adapter
 *
 * Converts between XLSX XlsxAlignment + XlsxBorder and the generic CellFormatting type.
 */

import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxBorder, XlsxBorderEdge } from "@aurochs-office/xlsx/domain/style/border";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { CellFormatting, VerticalAlignment } from "@aurochs-ui/editor-controls/table";
import type { OutlineFormatting, BorderEdges } from "@aurochs-ui/editor-controls/surface";
import { rgbHexFromXlsxColor, makeXlsxRgbColor } from "../../components/format-panel/color-utils";

/** Source type combining alignment and border. */
export type XlsxCellFormat = {
  readonly alignment?: XlsxAlignment;
  readonly border?: XlsxBorder;
};

/** Map XLSX vertical alignment to generic VerticalAlignment. */
function toGenericVAlign(v: XlsxAlignment["vertical"]): VerticalAlignment | undefined {
  switch (v) {
    case "top":
      return "top";
    case "center":
      return "center";
    case "bottom":
      return "bottom";
    default:
      return undefined; // "justify", "distributed" → unsupported
  }
}

/** Map XLSX border style to generic outline style. */
function toGenericBorderStyle(style: XlsxBorderEdge["style"]): OutlineFormatting["style"] {
  switch (style) {
    case "none":
      return "none";
    case "thin":
    case "medium":
    case "thick":
    case "double":
      return "solid";
    case "dashed":
    case "mediumDashed":
    case "dashDot":
    case "mediumDashDot":
    case "dashDotDot":
    case "mediumDashDotDot":
    case "slantDashDot":
      return "dashed";
    case "dotted":
    case "hair":
      return "dotted";
    default:
      return "solid";
  }
}

/** Map XLSX border style to approximate width in points. */
function toGenericBorderWidth(style: XlsxBorderEdge["style"]): number {
  switch (style) {
    case "none":
      return 0;
    case "hair":
      return 0.5;
    case "thin":
    case "dotted":
    case "dashed":
    case "dashDot":
    case "dashDotDot":
      return 1;
    case "medium":
    case "mediumDashed":
    case "mediumDashDot":
    case "mediumDashDotDot":
    case "slantDashDot":
      return 2;
    case "thick":
    case "double":
      return 3;
    default:
      return 1;
  }
}

/** Convert a single XLSX border edge to generic OutlineFormatting. */
function edgeToGeneric(edge: XlsxBorderEdge | undefined): OutlineFormatting | undefined {
  if (!edge || edge.style === "none") {
    return undefined;
  }
  const hex = rgbHexFromXlsxColor(edge.color);
  return {
    width: toGenericBorderWidth(edge.style),
    color: hex ? `#${hex}` : undefined,
    style: toGenericBorderStyle(edge.style),
  };
}

/** Resolve generic OutlineFormatting to XLSX border style string. */
function resolveBorderStyle(outline: OutlineFormatting): XlsxBorderEdge["style"] {
  if (outline.style === "dashed") {
    return "dashed";
  }
  if (outline.style === "dotted") {
    return "dotted";
  }
  if (outline.width && outline.width >= 2) {
    return "medium";
  }
  return "thin";
}

/** Convert generic OutlineFormatting to XLSX border edge. */
function genericToEdge(outline: OutlineFormatting | undefined): XlsxBorderEdge | undefined {
  if (!outline || outline.style === "none") {
    return { style: "none" };
  }
  const style = resolveBorderStyle(outline);
  const color = outline.color ? makeXlsxRgbColor(outline.color.replace(/^#/, "").toUpperCase()) : undefined;
  return { style, color };
}

/** Convert XLSX border to generic BorderEdges. */
function borderToGenericEdges(border: XlsxBorder | undefined): BorderEdges | undefined {
  if (!border) {
    return undefined;
  }
  return {
    top: edgeToGeneric(border.top),
    bottom: edgeToGeneric(border.bottom),
    left: edgeToGeneric(border.left),
    right: edgeToGeneric(border.right),
  };
}

/**
 * Adapter: XLSX XlsxCellFormat <-> CellFormatting
 */
export const xlsxCellAdapter: FormattingAdapter<XlsxCellFormat, CellFormatting> = {
  toGeneric(value: XlsxCellFormat): CellFormatting {
    const borders = borderToGenericEdges(value.border);

    return {
      verticalAlignment: toGenericVAlign(value.alignment?.vertical),
      wrapText: value.alignment?.wrapText ?? undefined,
      borders,
    };
  },

  applyUpdate(current: XlsxCellFormat, update: Partial<CellFormatting>): XlsxCellFormat {
    const parts: Partial<XlsxCellFormat>[] = [current];

    if ("verticalAlignment" in update) {
      parts.push({
        alignment: {
          ...current.alignment,
          vertical: update.verticalAlignment ?? undefined,
        },
      });
    }
    if ("wrapText" in update) {
      parts.push({
        alignment: {
          ...current.alignment,
          wrapText: update.wrapText ?? undefined,
        },
      });
    }
    if ("borders" in update && update.borders) {
      parts.push({
        border: {
          ...current.border,
          top: genericToEdge(update.borders.top),
          bottom: genericToEdge(update.borders.bottom),
          left: genericToEdge(update.borders.left),
          right: genericToEdge(update.borders.right),
        },
      });
    }

    return Object.assign({}, ...parts) as XlsxCellFormat;
  },
};
