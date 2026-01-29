/**
 * @file GrpShape (Group) Renderer
 *
 * Renders p:grpSp elements as React SVG components.
 * Groups contain child shapes that are rendered recursively.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.22 (p:grpSp)
 */

import type { GrpShape as GrpShapeType, Shape } from "@oxen-office/pptx/domain";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import { buildGroupTransformAttr } from "./transform";
import { ShapeRenderer } from "../ShapeRenderer";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for GrpShapeRenderer
 */
export type GrpShapeRendererProps = {
  /** Shape to render */
  readonly shape: GrpShapeType;
  /** Editing shape ID (passed to children) */
  readonly editingShapeId?: ShapeId;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a group shape (p:grpSp) as React SVG elements.
 *
 * Groups apply their transform to all children and then render
 * each child shape recursively.
 */
export function GrpShapeRenderer({
  shape,
  editingShapeId,
  shapeId,
}: GrpShapeRendererProps) {
  const { properties, children } = shape;
  const { transform } = properties;

  const transformValue = buildGroupTransformAttr(transform);

  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="grpSp"
    >
      {children.map((child, index) => (
        <ShapeRenderer
          key={getShapeKey(child, index)}
          shape={child}
          editingShapeId={editingShapeId}
        />
      ))}
    </g>
  );
}

/**
 * Get a unique key for a child shape
 */
function getShapeKey(shape: Shape, index: number): string {
  if ("nonVisual" in shape && shape.nonVisual?.id !== undefined) {
    return `shape-${shape.nonVisual.id}`;
  }
  return `shape-${index}`;
}
