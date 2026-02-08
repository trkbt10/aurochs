/**
 * @file WebGL text rendering
 *
 * Renders text by tessellating glyph outline paths from the scene graph.
 * Glyph outlines come from either:
 * 1. Derived path data (pre-computed in .fig files) - exact match
 * 2. OpenType.js font outlines - high quality
 * 3. Canvas 2D fallback (uploaded as texture) - for missing fonts
 */

import type { TextNode, AffineMatrix, Color, PathContour } from "../scene-graph/types";
import { tessellateContours } from "./tessellation";

/**
 * Result of text tessellation
 */
export type TessellatedText = {
  /** Triangle vertices for glyph outlines */
  readonly glyphVertices: Float32Array;
  /** Triangle vertices for decorations (underlines, etc.) */
  readonly decorationVertices: Float32Array;
  /** Fill color */
  readonly color: Color;
  /** Fill opacity */
  readonly opacity: number;
};

/**
 * Tessellate a text node's glyph outlines into triangle vertices
 *
 * @param node - Scene graph text node
 * @param tolerance - Bezier flattening tolerance
 * @returns Tessellated text data, or null if no outlines available
 */
export function tessellateTextNode(
  node: TextNode,
  tolerance: number = 0.25
): TessellatedText | null {
  if (!node.glyphContours || node.glyphContours.length === 0) {
    return null;
  }

  // Figma glyph blobs use PostScript/CFF winding convention (invertWinding=true)
  const glyphVertices = tessellateContours(node.glyphContours, tolerance, true);
  const decorationVertices = node.decorationContours
    ? tessellateContours(node.decorationContours, tolerance, true)
    : new Float32Array(0);

  return {
    glyphVertices,
    decorationVertices,
    color: node.fill.color,
    opacity: node.fill.opacity,
  };
}

/**
 * Word-wrap a single line of text to fit within maxWidth using Canvas2D measureText
 */
function wrapLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (maxWidth <= 0) return [text];

  const measured = ctx.measureText(text);
  if (measured.width <= maxWidth) return [text];

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine + word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word.trimStart();
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Render fallback text using Canvas 2D
 *
 * Creates a texture from canvas-rendered text for nodes without glyph outlines.
 * The texture can then be drawn as a textured quad in WebGL.
 *
 * @param node - Scene graph text node with fallbackText
 * @returns Canvas element with rendered text, or null
 */
export function renderFallbackTextToCanvas(
  node: TextNode
): HTMLCanvasElement | null {
  if (!node.fallbackText) return null;

  const fb = node.fallbackText;
  if (fb.lines.length === 0) return null;

  const canvas = document.createElement("canvas");
  const hasSize = node.width > 0 && node.height > 0;

  if (hasSize) {
    canvas.width = Math.ceil(node.width);
    canvas.height = Math.ceil(node.height);
  } else {
    let maxX = 0;
    let maxY = 0;
    for (const line of fb.lines) {
      maxX = Math.max(maxX, line.x + fb.fontSize * line.text.length * 0.6);
      maxY = Math.max(maxY, line.y + fb.fontSize);
    }
    const padding = fb.fontSize * 0.5;
    canvas.width = Math.ceil(maxX + padding);
    canvas.height = Math.ceil(maxY + padding);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Set font properties
  const fontStyle = fb.fontStyle ?? "normal";
  const fontWeight = fb.fontWeight ?? 400;
  ctx.font = `${fontStyle} ${fontWeight} ${fb.fontSize}px ${fb.fontFamily}`;

  // Set fill color
  const r = Math.round(node.fill.color.r * 255);
  const g = Math.round(node.fill.color.g * 255);
  const b = Math.round(node.fill.color.b * 255);
  const a = node.fill.opacity;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

  // Set text alignment
  ctx.textBaseline = "alphabetic";
  if (fb.textAnchor === "middle") {
    ctx.textAlign = "center";
  } else if (fb.textAnchor === "end") {
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = "left";
  }

  // Apply letter spacing if supported
  if (fb.letterSpacing && "letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${fb.letterSpacing}px`;
  }

  // Render each line, with word wrapping if the node has a fixed width
  const lineHeight = fb.lineHeight;
  let currentY = fb.lines[0]?.y ?? fb.fontSize;

  for (const line of fb.lines) {
    if (hasSize && canvas.width > 0) {
      // Word-wrap within the text box width
      const wrappedLines = wrapLine(ctx, line.text, canvas.width - line.x);
      for (const wrappedText of wrappedLines) {
        ctx.fillText(wrappedText, line.x, currentY);
        currentY += lineHeight;
      }
    } else {
      ctx.fillText(line.text, line.x, line.y);
      currentY = line.y + lineHeight;
    }
  }

  return canvas;
}
