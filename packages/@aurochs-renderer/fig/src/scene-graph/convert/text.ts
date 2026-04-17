/**
 * @file Convert Figma TEXT nodes to scene graph TextNode data
 *
 * Accepts FigDesignNode (domain object) directly.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigBlob } from "@aurochs/fig/parser";
import { resolveTextRendering, type TextRendering } from "../../text/rendering";
import type { PathContour, Color, TextLineLayout } from "../types";

/** Map Figma text decoration value to scene graph text decoration string */
function mapTextDecoration(decoration: string | undefined): "underline" | "strikethrough" | undefined {
  if (decoration === "UNDERLINE") {
    return "underline";
  }
  if (decoration === "STRIKETHROUGH") {
    return "strikethrough";
  }
  return undefined;
}

/**
 * Normalize path contours from the shared text SoT to the scene-graph
 * `PathContour` shape (which requires windingRule).
 *
 * The SoT returns backend-agnostic contours whose commands already have
 * all coordinate fields populated (the SoT itself builds them). This
 * function just stamps in the winding rule and narrows the command union.
 */
function normalizeContours(contours: readonly {
  readonly commands: readonly {
    readonly type: "M" | "L" | "C" | "Q" | "Z";
    readonly x?: number; readonly y?: number;
    readonly x1?: number; readonly y1?: number;
    readonly x2?: number; readonly y2?: number;
  }[];
}[]): PathContour[] {
  return contours.map((c) => ({
    commands: c.commands.map((cmd) => {
      switch (cmd.type) {
        case "M": return { type: "M" as const, x: cmd.x ?? 0, y: cmd.y ?? 0 };
        case "L": return { type: "L" as const, x: cmd.x ?? 0, y: cmd.y ?? 0 };
        case "C": return {
          type: "C" as const,
          x1: cmd.x1 ?? 0, y1: cmd.y1 ?? 0,
          x2: cmd.x2 ?? 0, y2: cmd.y2 ?? 0,
          x: cmd.x ?? 0, y: cmd.y ?? 0,
        };
        case "Q": return {
          type: "Q" as const,
          x1: cmd.x1 ?? 0, y1: cmd.y1 ?? 0,
          x: cmd.x ?? 0, y: cmd.y ?? 0,
        };
        case "Z":
        default: return { type: "Z" as const };
      }
    }),
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
  /** Text line layout data for SVG <text> rendering */
  readonly textLineLayout?: TextLineLayout;
};

/**
 * Convert a TEXT FigDesignNode to scene graph text data
 *
 * @param node - FigDesignNode of type TEXT
 * @param blobs - Blob array from .fig file (for derived paths)
 * @returns Text conversion result for scene graph TextNode
 */
/**
 * Convert font variation axes to CSS font-variation-settings value.
 * Figma stores axis tags as 4-byte integers (e.g. 0x77676874 = "wght").
 */
function buildFontVariationSettings(
  variations: readonly { readonly axisTag: number; readonly axisValue: number }[] | undefined,
): string | undefined {
  if (!variations || variations.length === 0) { return undefined; }

  const parts: string[] = [];
  for (const v of variations) {
    // Convert 4-byte integer to 4-char ASCII tag
    const tag = String.fromCharCode(
      (v.axisTag >> 24) & 0xFF,
      (v.axisTag >> 16) & 0xFF,
      (v.axisTag >> 8) & 0xFF,
      v.axisTag & 0xFF,
    );
    parts.push(`'${tag}' ${v.axisValue}`);
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function convertTextNode(node: FigDesignNode, blobs: readonly FigBlob[]): TextConversionResult {
  // Delegate resolution to the unified text rendering SoT. This is the only
  // place (alongside svg/renderer.ts) that decides glyphs-vs-lines strategy.
  const rendering = resolveTextRendering(node, { blobs });
  const fontVariationSettings = buildFontVariationSettings(node.textData?.fontVariations);

  if (rendering.kind === "empty") {
    // Scene-graph downstream expects a fill + textLineLayout even for empty
    // text. Build a minimal, empty line layout so the renderer emits nothing.
    const empty: TextLineLayout = {
      lines: [],
      fontFamily: "sans-serif",
      fontSize: 16,
      fontWeight: undefined,
      fontStyle: undefined,
      letterSpacing: undefined,
      lineHeight: 16,
      textAnchor: "start",
    };
    return {
      fill: { color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 0 },
      textLineLayout: empty,
    };
  }

  const props = rendering.props;
  const color = parseHexColor(rendering.fillColor);

  const textLineLayout: TextLineLayout = buildTextLineLayout(rendering, props, fontVariationSettings);

  if (rendering.kind === "glyphs") {
    const glyphContours = normalizeContours(rendering.glyphContours);
    const decorationContours = normalizeContours(rendering.decorationContours);
    return {
      glyphContours,
      decorationContours: decorationContours.length > 0 ? decorationContours : undefined,
      fill: { color, opacity: rendering.fillOpacity },
      textLineLayout,
    };
  }

  return {
    fill: { color, opacity: rendering.fillOpacity },
    textLineLayout,
  };
}

/** Build the scene-graph TextLineLayout from a resolved TextRendering. */
function buildTextLineLayout(
  rendering: Exclude<TextRendering, { kind: "empty" }>,
  props: import("../../text/layout/types").ExtractedTextProps,
  fontVariationSettings: string | undefined,
): TextLineLayout {
  return {
    lines: rendering.layout.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
    })),
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fontWeight: props.fontWeight,
    fontStyle: props.fontStyle,
    letterSpacing: props.letterSpacing,
    lineHeight: rendering.layout.lineHeight,
    textAnchor: getTextAnchor(props.textAlignHorizontal),
    textDecoration: mapTextDecoration(props.textDecoration),
    fontVariationSettings,
  };
}
