/**
 * @file WebGL text rendering
 *
 * Renders text by tessellating glyph outline paths from the scene graph.
 * Glyph outlines come from either:
 * 1. Derived path data (pre-computed in .fig files) - exact match
 * 2. OpenType.js font outlines - high quality
 * 3. Canvas 2D fallback (uploaded as texture) - for missing fonts
 */

import type { TextNode, Color, PathContour } from "../scene-graph/types";
import { tessellateContours } from "./tessellation";

/** Tessellate decoration contours or return empty array if none */
function tessellateDecorationsOrEmpty(
  contours: readonly PathContour[] | undefined,
  tolerance: number
): Float32Array {
  if (contours) {
    return tessellateContours(contours, tolerance, true);
  }
  return new Float32Array(0);
}

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
  const decorationVertices = tessellateDecorationsOrEmpty(node.decorationContours, tolerance);

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
  if (maxWidth <= 0) {return [text];}

  const measured = ctx.measureText(text);
  if (measured.width <= maxWidth) {return [text];}

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  const currentLineRef = { value: "" };

  for (const word of words) {
    const testLine = currentLineRef.value + word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLineRef.value.length > 0) {
      lines.push(currentLineRef.value);
      currentLineRef.value = word.trimStart();
    } else {
      currentLineRef.value = testLine;
    }
  }
  if (currentLineRef.value.length > 0) {
    lines.push(currentLineRef.value);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Render fallback text using Canvas 2D
 *
 * Creates a texture from canvas-rendered text for nodes without glyph outlines.
 * The texture can then be drawn as a textured quad in WebGL.
 *
 * @param node - Scene graph text node with textLineLayout
 * @returns Canvas element with rendered text, or null
 */
export function renderFallbackTextToCanvas(
  node: TextNode
): HTMLCanvasElement | null {
  if (!node.textLineLayout) {return null;}

  const fb = node.textLineLayout;
  if (fb.lines.length === 0) {return null;}

  const canvas = document.createElement("canvas");
  const hasSize = node.width > 0 && node.height > 0;

  if (hasSize) {
    canvas.width = Math.ceil(node.width);
    canvas.height = Math.ceil(node.height);
  } else {
    const maxXRef = { value: 0 };
    const maxYRef = { value: 0 };
    for (const line of fb.lines) {
      maxXRef.value = Math.max(maxXRef.value, line.x + fb.fontSize * line.text.length * 0.6);
      maxYRef.value = Math.max(maxYRef.value, line.y + fb.fontSize);
    }
    const padding = fb.fontSize * 0.5;
    canvas.width = Math.ceil(maxXRef.value + padding);
    canvas.height = Math.ceil(maxYRef.value + padding);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {return null;}

  // Set font properties
  const fontStyle = fb.fontStyle ?? "normal";
  const fontWeight = fb.fontWeight ?? 400;
  ctx.font = `${fontStyle} ${fontWeight} ${fb.fontSize}px ${fb.fontFamily}`;

  // Set fill color. Epsilon absorbs float32 precision loss from kiwi-encoded
  // colors so 0.9 rounds to 230, not 229 (see scene-graph/render/color.ts).
  const r = Math.round(node.fill.color.r * 255 + 1e-4);
  const g = Math.round(node.fill.color.g * 255 + 1e-4);
  const b = Math.round(node.fill.color.b * 255 + 1e-4);
  const a = node.fill.opacity;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

  // Set text alignment
  ctx.textBaseline = "alphabetic";
  switch (fb.textAnchor) {
    case "middle":
      ctx.textAlign = "center";
      break;
    case "end":
      ctx.textAlign = "right";
      break;
    default:
      ctx.textAlign = "left";
      break;
  }

  // Apply letter spacing if supported
  if (fb.letterSpacing && "letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${fb.letterSpacing}px`;
  }

  // Render each line, with word wrapping if the node has a fixed width
  const lineHeight = fb.lineHeight;
  const currentYRef = { value: fb.lines[0]?.y ?? fb.fontSize };

  for (const line of fb.lines) {
    if (hasSize && canvas.width > 0) {
      // Word-wrap within the text box width
      const wrappedLines = wrapLine(ctx, line.text, canvas.width - line.x);
      for (const wrappedText of wrappedLines) {
        ctx.fillText(wrappedText, line.x, currentYRef.value);
        currentYRef.value += lineHeight;
      }
    } else {
      ctx.fillText(line.text, line.x, line.y);
      currentYRef.value = line.y + lineHeight;
    }
  }

  return canvas;
}
