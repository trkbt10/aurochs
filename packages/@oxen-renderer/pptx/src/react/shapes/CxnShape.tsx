/**
 * @file CxnShape (Connector) Renderer
 *
 * Renders p:cxnSp elements as React SVG components.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.19 (p:cxnSp)
 */

import type { CxnShape as CxnShapeType } from "@oxen-office/pptx/domain";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import { GeometryPath } from "../primitives/Geometry";
import { buildTransformAttr } from "./transform";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for CxnShapeRenderer
 */
export type CxnShapeRendererProps = {
  /** Shape to render */
  readonly shape: CxnShapeType;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a connector shape (p:cxnSp) as React SVG elements.
 *
 * Connectors are similar to basic shapes but typically have:
 * - Line-like geometry (straight, bent, curved)
 * - Head/tail arrows (markers)
 */
export function CxnShapeRenderer({
  shape,
  width,
  height,
  shapeId,
}: CxnShapeRendererProps) {
  const { properties } = shape;
  const { geometry, fill, line, transform } = properties;

  const transformValue = buildTransformAttr(transform, width, height);

  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="cxnSp"
    >
      <GeometryPath
        geometry={geometry}
        width={width}
        height={height}
        fill={fill}
        line={line}
      />
    </g>
  );
}
