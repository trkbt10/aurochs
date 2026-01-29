/**
 * @file SpShape (Basic Shape) Renderer
 *
 * Renders p:sp elements as React SVG components.
 * Supports the hideText prop for text editing mode.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.43 (p:sp)
 */

import type { SpShape as SpShapeType } from "@oxen-office/pptx/domain";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import { GeometryPath, TextRenderer } from "../primitives";
import { buildTransformAttr } from "./transform";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SpShapeRenderer
 */
export type SpShapeRendererProps = {
  /** Shape to render */
  readonly shape: SpShapeType;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Hide text content (for editing mode) */
  readonly hideText?: boolean;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a basic shape (p:sp) as React SVG elements.
 *
 * Structure:
 * - <g> wrapper with transform
 *   - <path> or <rect> for geometry with fill/stroke
 *   - <text> elements for text content (conditional)
 */
export function SpShapeRenderer({
  shape,
  width,
  height,
  hideText = false,
  shapeId,
}: SpShapeRendererProps) {
  const { properties, textBody } = shape;
  const { geometry, fill, line, transform } = properties;

  // Build transform attribute
  const transformValue = buildTransformAttr(transform, width, height);

  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="sp"
    >
      {/* Render geometry (background shape) */}
      <GeometryPath
        geometry={geometry}
        width={width}
        height={height}
        fill={fill}
        line={line}
      />

      {/* Render text content (conditional) */}
      {!hideText && textBody && (
        <TextRenderer
          textBody={textBody}
          width={width}
          height={height}
        />
      )}
    </g>
  );
}
