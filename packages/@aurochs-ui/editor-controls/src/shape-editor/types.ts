/**
 * @file Generic shape interfaces for shape-based editors
 *
 * These interfaces abstract over format-specific shape types (PPTX Shape, etc.)
 * so that shape manipulation utilities can be shared across editors.
 */

// =============================================================================
// Core Shape Interfaces
// =============================================================================

/**
 * Base shape node - any element in a shape tree.
 * All shapes have a `type` discriminator.
 */
export interface ShapeNode {
  readonly type: string;
}

/**
 * A shape that can be identified by a string ID.
 * Most shapes in valid documents have nonVisual with an id.
 */
export interface IdentifiableShape extends ShapeNode {
  readonly nonVisual: { readonly id: string; readonly name?: string };
}

/**
 * A shape that can contain child shapes (group shape).
 */
export interface GroupShapeNode extends IdentifiableShape {
  readonly children: readonly ShapeNode[];
}

/**
 * Array of shape nodes (top-level or within a group).
 */
export type ShapeArray = readonly ShapeNode[];

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a shape node has an identity (nonVisual.id).
 */
export function isIdentifiable(s: ShapeNode): s is IdentifiableShape {
  return "nonVisual" in s;
}

/**
 * Get the ID of a shape node, if it has one.
 */
export function getShapeId(s: ShapeNode): string | undefined {
  if (isIdentifiable(s)) {
    return s.nonVisual.id;
  }
  return undefined;
}

/**
 * Check if a shape node is a group (has children array).
 */
export function isGroupShape(s: ShapeNode): s is GroupShapeNode {
  return "children" in s && Array.isArray((s as GroupShapeNode).children);
}

/**
 * Get the name of a shape node from nonVisual properties.
 */
export function getShapeName(s: ShapeNode): string {
  if (isIdentifiable(s)) {
    return s.nonVisual.name ?? "";
  }
  return "";
}
