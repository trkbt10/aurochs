/**
 * @file WebGL text rendering
 *
 * Renders text by tessellating glyph outline paths from the scene graph.
 * Glyph outlines come from either:
 * 1. Derived path data (pre-computed in .fig files) - exact match
 * 2. OpenType.js font outlines - high quality
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
 * @returns Tessellated text data
 */
export function tessellateTextNode(
  node: TextNode,
  tolerance: number = 0.25
): TessellatedText {
  if (!node.glyphContours || node.glyphContours.length === 0) {
    throw new Error(`WebGL text tessellation requires glyph contours for text node ${node.id}`);
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
