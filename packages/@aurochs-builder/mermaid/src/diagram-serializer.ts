/**
 * @file Serialize diagram shapes to Mermaid flowchart syntax
 */

import { escapeMermaidLabel, sanitizeNodeId } from "@aurochs/mermaid";
import type { DiagramMermaidInput, DiagramShapeInput } from "./types";

/**
 * Infer flow direction from shape spatial layout.
 * If shapes are arranged more vertically than horizontally → TD (top-down).
 * Otherwise → LR (left-right).
 */
function inferDirection(shapes: readonly DiagramShapeInput[]): "TD" | "LR" {
  if (shapes.length < 2) {
    return "TD";
  }

  const withBounds = shapes.filter((s) => s.bounds);
  if (withBounds.length < 2) {
    return "TD";
  }

  // Compute bounding box of all shapes
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  for (const s of withBounds) {
    const b = s.bounds!;
    bounds.minX = Math.min(bounds.minX, b.x);
    bounds.maxX = Math.max(bounds.maxX, b.x + b.width);
    bounds.minY = Math.min(bounds.minY, b.y);
    bounds.maxY = Math.max(bounds.maxY, b.y + b.height);
  }

  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;

  return spanY >= spanX ? "TD" : "LR";
}

/**
 * Serialize diagram shapes to Mermaid flowchart syntax (without fence).
 * Shapes are rendered as nodes connected sequentially.
 */
export function serializeDiagramToMermaid(input: DiagramMermaidInput): string {
  const { shapes } = input;

  if (shapes.length === 0) {
    return "";
  }

  const direction = inferDirection(shapes);
  const lines: string[] = [`flowchart ${direction}`];

  // Emit node definitions
  for (const shape of shapes) {
    const id = sanitizeNodeId(shape.id);
    const label = shape.text ? escapeMermaidLabel(shape.text) : id;
    lines.push(`  ${id}["${label}"]`);
  }

  // Connect shapes sequentially
  if (shapes.length > 1) {
    for (let i = 0; i < shapes.length - 1; i++) {
      const fromId = sanitizeNodeId(shapes[i]!.id);
      const toId = sanitizeNodeId(shapes[i + 1]!.id);
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}
