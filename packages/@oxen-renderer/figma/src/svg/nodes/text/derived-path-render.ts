/**
 * @file Derived path-based text rendering
 *
 * Renders text using pre-computed glyph paths from derivedTextData.
 * This achieves exact visual match (0% diff) with Figma's export because
 * we use the same path data that Figma stores internally.
 */

import type { FigNode } from "@oxen/fig/types";
import { decodeBlobToSvgPath, decodePathCommands, type FigBlob, type PathCommand } from "@oxen/fig/parser";
import type { FigSvgRenderContext } from "../../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../../primitives";
import { buildTransformAttr } from "../../transform";
import { extractTextProps } from "./props";
import { getFillColorAndOpacity } from "./fill";

/**
 * Baseline data from derivedTextData
 */
type DerivedBaseline = {
  readonly position: { x: number; y: number };
  readonly width: number;
  readonly lineY: number;
  readonly lineHeight: number;
  readonly lineAscent: number;
  readonly firstCharacter: number;
  readonly endCharacter: number;
};

/**
 * Decoration rectangle (for underlines, strikethroughs)
 */
type DecorationRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

/**
 * Decoration data (underline, strikethrough, etc.)
 */
type DerivedDecoration = {
  readonly rects: readonly DecorationRect[];
  readonly styleID?: number;
};

/**
 * Derived text data structure from .fig files
 */
type DerivedTextData = {
  readonly layoutSize?: { x: number; y: number };
  readonly baselines?: readonly DerivedBaseline[];
  readonly glyphs?: readonly DerivedGlyph[];
  readonly decorations?: readonly DerivedDecoration[];
  readonly fontMetaData?: readonly unknown[];
  readonly derivedLines?: readonly unknown[];
};

/**
 * Glyph data from derivedTextData
 */
type DerivedGlyph = {
  /** Index into blobs array for path commands */
  readonly commandsBlob: number;
  /** Position of glyph (x, y where y is baseline) */
  readonly position: { x: number; y: number };
  /** Font size for this glyph */
  readonly fontSize: number;
  /** Character index in text */
  readonly firstCharacter: number;
  /** Advance width (normalized 0-1) */
  readonly advance: number;
  /** Rotation in radians */
  readonly rotation?: number;
  /** Style override index */
  readonly styleOverrideTable?: number;
};

/**
 * Render context with blobs for path decoding
 */
export type DerivedPathRenderContext = FigSvgRenderContext & {
  blobs: readonly FigBlob[];
};

/**
 * Transform normalized path commands to screen coordinates
 *
 * The blob paths are stored in normalized coordinates (0-1 range).
 * We need to scale by fontSize and translate to position.
 *
 * Coordinate transformation:
 * - x_screen = position.x + (normalized_x * fontSize)
 * - y_screen = baseline - (normalized_y * fontSize)
 *
 * The y-axis is flipped because in the normalized space, y increases upward
 * (from baseline), but in screen space, y increases downward.
 *
 * The baseline is computed as round(position.y) because Figma's SVG export
 * uses rounded baseline values for better pixel alignment.
 */
function transformPathCommands(
  commands: readonly PathCommand[],
  position: { x: number; y: number },
  fontSize: number,
  precision: number = 5
): string {
  const parts: string[] = [];

  const roundPrecision = (n: number) => {
    const factor = Math.pow(10, precision);
    return Math.round(n * factor) / factor;
  };

  // Use rounded position.y as baseline for pixel-perfect alignment
  const baselineY = Math.round(position.y);
  const transformX = (x: number) => roundPrecision(position.x + x * fontSize);
  const transformY = (y: number) => roundPrecision(baselineY - y * fontSize);

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M${transformX(cmd.x)} ${transformY(cmd.y)}`);
        break;
      case "L":
        parts.push(`L${transformX(cmd.x)} ${transformY(cmd.y)}`);
        break;
      case "C":
        parts.push(
          `C${transformX(cmd.cp1x)} ${transformY(cmd.cp1y)} ${transformX(cmd.cp2x)} ${transformY(cmd.cp2y)} ${transformX(cmd.x)} ${transformY(cmd.y)}`
        );
        break;
      case "Q":
        parts.push(
          `Q${transformX(cmd.cpx)} ${transformY(cmd.cpy)} ${transformX(cmd.x)} ${transformY(cmd.y)}`
        );
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join("");
}

/**
 * Render decoration rectangles as SVG path
 *
 * Decorations include underlines and strikethroughs.
 * They are stored as simple rectangles in derivedTextData.decorations.
 */
function renderDecorationPaths(
  decorations: readonly DerivedDecoration[] | undefined,
  precision: number = 5
): string {
  if (!decorations || decorations.length === 0) {
    return "";
  }

  const round = (n: number) => {
    const factor = Math.pow(10, precision);
    return Math.round(n * factor) / factor;
  };

  const paths: string[] = [];

  for (const decoration of decorations) {
    for (const rect of decoration.rects) {
      // Convert rectangle to path: M x y H (x+w) V (y+h) H x Z
      const x = round(rect.x);
      const y = round(rect.y);
      const x2 = round(rect.x + rect.w);
      const y2 = round(rect.y + rect.h);
      paths.push(`M${x} ${y}H${x2}V${y2}H${x}Z`);
    }
  }

  return paths.join("");
}

/**
 * Render a single glyph as SVG path
 */
function renderGlyphPath(
  glyph: DerivedGlyph,
  blobs: readonly FigBlob[],
  precision: number = 5
): string | null {
  if (glyph.commandsBlob === undefined || glyph.commandsBlob >= blobs.length) {
    return null;
  }

  const blob = blobs[glyph.commandsBlob];
  if (!blob) {
    return null;
  }

  // Decode path commands
  const commands = decodePathCommands(blob);
  if (commands.length === 0) {
    return null;
  }

  // Transform to screen coordinates
  return transformPathCommands(commands, glyph.position, glyph.fontSize, precision);
}

/**
 * Render text node using derived path data
 *
 * This function uses the pre-computed glyph paths from derivedTextData
 * to achieve exact visual match with Figma's export.
 *
 * @param node - Figma TEXT node
 * @param ctx - Render context with blobs
 * @returns SVG string
 */
export function renderTextNodeFromDerivedData(
  node: FigNode,
  ctx: DerivedPathRenderContext
): SvgString {
  const props = extractTextProps(node);
  const nodeData = node as Record<string, unknown>;
  const derivedTextData = nodeData.derivedTextData as DerivedTextData | undefined;

  // No derived data - fallback to empty
  if (!derivedTextData?.glyphs || derivedTextData.glyphs.length === 0) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(props.transform);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Render all glyphs as a single combined path
  // The baseline is computed as round(position.y) for pixel-perfect alignment
  const glyphPaths: string[] = [];

  for (const glyph of derivedTextData.glyphs) {
    const glyphPath = renderGlyphPath(glyph, ctx.blobs);
    if (glyphPath) {
      glyphPaths.push(glyphPath);
    }
  }

  // Render decoration paths (underlines, strikethroughs)
  const decorationPath = renderDecorationPaths(derivedTextData.decorations);

  if (glyphPaths.length === 0 && !decorationPath) {
    return EMPTY_SVG;
  }

  // Combine all glyph paths and decoration paths into a single path element
  const combinedPath = glyphPaths.join("") + decorationPath;

  const pathElement = path({
    d: combinedPath,
    fill: fillColor,
    "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
  });

  // Wrap in group if transform or opacity needed
  if (transformStr || props.opacity < 1) {
    return g(
      {
        transform: transformStr || undefined,
        opacity: props.opacity < 1 ? props.opacity : undefined,
      },
      pathElement
    );
  }

  return pathElement;
}

/**
 * Check if a text node has derived path data available
 */
export function hasDerivedPathData(node: FigNode): boolean {
  const nodeData = node as Record<string, unknown>;
  const derivedTextData = nodeData.derivedTextData as DerivedTextData | undefined;
  return !!(derivedTextData?.glyphs && derivedTextData.glyphs.length > 0);
}

/**
 * Render text node with automatic fallback
 *
 * Uses derived path data if available, otherwise falls back to the provided
 * fallback renderer (e.g., opentype.js based rendering).
 */
export async function renderTextNodeWithDerivedFallback(
  node: FigNode,
  ctx: DerivedPathRenderContext,
  fallbackRenderer: (node: FigNode, ctx: FigSvgRenderContext) => Promise<SvgString>
): Promise<SvgString> {
  if (hasDerivedPathData(node)) {
    return renderTextNodeFromDerivedData(node, ctx);
  }

  return fallbackRenderer(node, ctx);
}
