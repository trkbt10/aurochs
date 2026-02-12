/**
 * @file Convert Figma TEXT nodes to scene graph TextNode data
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import { extractTextProps } from "../../text/layout/extract-props";
import { getFillColorAndOpacity } from "../../text/layout/fill";
import { computeTextLayout } from "../../text/layout/compute-layout";
import { extractDerivedTextPathData, hasDerivedGlyphs, type DerivedTextData } from "../../text/paths/derived-paths";
import type { PathContour, Color, FallbackTextData } from "../types";

/**
 * Convert text path contours from text/paths format to scene graph format
 */
function convertTextContours(
  textContours: readonly {
    commands: readonly { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[];
  }[],
): PathContour[] {
  return textContours.map((contour) => ({
    commands: contour.commands.map((cmd) => {
      switch (cmd.type) {
        case "M":
          return { type: "M" as const, x: cmd.x!, y: cmd.y! };
        case "L":
          return { type: "L" as const, x: cmd.x!, y: cmd.y! };
        case "C":
          return {
            type: "C" as const,
            x1: cmd.x1!,
            y1: cmd.y1!,
            x2: cmd.x2!,
            y2: cmd.y2!,
            x: cmd.x!,
            y: cmd.y!,
          };
        case "Q":
          return {
            type: "Q" as const,
            x1: cmd.x1!,
            y1: cmd.y1!,
            x: cmd.x!,
            y: cmd.y!,
          };
        case "Z":
        default:
          return { type: "Z" as const };
      }
    }),
    windingRule: "nonzero" as const,
  }));
}

/**
 * Convert decoration rectangles to PathContours
 */
function convertDecorationsToContours(
  decorations: readonly { x: number; y: number; width: number; height: number }[],
): PathContour[] {
  return decorations.map((rect) => ({
    commands: [
      { type: "M" as const, x: rect.x, y: rect.y },
      { type: "L" as const, x: rect.x + rect.width, y: rect.y },
      { type: "L" as const, x: rect.x + rect.width, y: rect.y + rect.height },
      { type: "L" as const, x: rect.x, y: rect.y + rect.height },
      { type: "Z" as const },
    ],
    windingRule: "nonzero" as const,
  }));
}

/**
 * Map text anchor from alignment
 */
function getTextAnchor(align: string): "start" | "middle" | "end" {
  switch (align) {
    case "CENTER":
      return "middle";
    case "RIGHT":
      return "end";
    default:
      return "start";
  }
}

/**
 * Parse fill color string to Color
 */
function parseHexColor(hex: string): Color {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return { r, g, b, a: 1 };
}

/**
 * Result of text conversion for scene graph
 */
export type TextConversionResult = {
  /** Glyph outline contours (if derived data available) */
  readonly glyphContours?: readonly PathContour[];
  /** Decoration contours (underlines, strikethroughs) */
  readonly decorationContours?: readonly PathContour[];
  /** Text fill color */
  readonly fill: { readonly color: Color; readonly opacity: number };
  /** Fallback text data (when outlines not available) */
  readonly fallbackText?: FallbackTextData;
};

/**
 * Convert a TEXT node to scene graph text data
 *
 * @param node - Figma TEXT node
 * @param blobs - Blob array from .fig file (for derived paths)
 * @returns Text conversion result for scene graph TextNode
 */
export function convertTextNode(node: FigNode, blobs: readonly FigBlob[]): TextConversionResult {
  const props = extractTextProps(node);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Parse fill color
  const color = parseHexColor(fillColor);

  // Check for derived path data (0% diff rendering)
  const nodeData = node as Record<string, unknown>;
  const derivedTextData = nodeData.derivedTextData as DerivedTextData | undefined;

  if (hasDerivedGlyphs(derivedTextData)) {
    const pathData = extractDerivedTextPathData(derivedTextData!, blobs);
    const glyphContours = convertTextContours(pathData.glyphContours);
    const decorationContours = convertDecorationsToContours(pathData.decorations);

    // Also generate fallback text layout for Canvas2D rendering
    // (glyph outlines may not render well at low resolution via stencil)
    const layout = computeTextLayout({ props });
    const fallbackText: FallbackTextData = {
      lines: layout.lines.map((line) => ({
        text: line.text,
        x: line.x,
        y: line.y,
      })),
      fontFamily: props.fontFamily,
      fontSize: props.fontSize,
      fontWeight: props.fontWeight,
      fontStyle: props.fontStyle,
      letterSpacing: props.letterSpacing,
      lineHeight: layout.lineHeight,
      textAnchor: getTextAnchor(props.textAlignHorizontal),
      textDecoration:
        props.textDecoration === "UNDERLINE"
          ? "underline"
          : props.textDecoration === "STRIKETHROUGH"
            ? "strikethrough"
            : undefined,
    };

    return {
      glyphContours,
      decorationContours: decorationContours.length > 0 ? decorationContours : undefined,
      fill: { color, opacity: fillOpacity },
      fallbackText,
    };
  }

  // Fallback: provide text layout data for <text> element rendering
  const layout = computeTextLayout({ props });

  const fallbackText: FallbackTextData = {
    lines: layout.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
    })),
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fontWeight: props.fontWeight,
    fontStyle: props.fontStyle,
    letterSpacing: props.letterSpacing,
    lineHeight: layout.lineHeight,
    textAnchor: getTextAnchor(props.textAlignHorizontal),
    textDecoration:
      props.textDecoration === "UNDERLINE"
        ? "underline"
        : props.textDecoration === "STRIKETHROUGH"
          ? "strikethrough"
          : undefined,
  };

  return {
    fill: { color, opacity: fillOpacity },
    fallbackText,
  };
}
