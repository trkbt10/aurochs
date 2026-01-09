/**
 * @file Diagram content renderer for GraphicFrame
 *
 * Renders diagram content within a graphic frame using React components.
 * Each shape is rendered as a separate React component for editing support.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import { memo } from "react";
import type { DiagramReference, Shape } from "../../../../../domain";
import type { ShapeId } from "../../../../../domain/types";
import { ShapeRenderer } from "../../../ShapeRenderer";
import { Placeholder } from "../shared";
import type { ContentProps } from "../types";

/**
 * Props for DiagramContent component
 */
export type DiagramContentProps = ContentProps<DiagramReference> & {
  /** ID of shape currently being edited (its text will be hidden) */
  readonly editingShapeId?: ShapeId;
};

/**
 * Renders diagram content within a GraphicFrame.
 *
 * Uses ShapeRenderer to render each shape as a React component,
 * enabling selection and editing support in pptx-editor.
 */
export const DiagramContent = memo(function DiagramContent({
  data,
  width,
  height,
  editingShapeId,
}: DiagramContentProps) {
  // Get pre-parsed shapes from diagram content
  const shapes = data.parsedContent?.shapes;

  if (shapes === undefined || shapes.length === 0) {
    return <Placeholder width={width} height={height} label="Diagram" />;
  }

  return (
    <g data-diagram-content="true">
      {shapes.map((shape, index) => (
        <ShapeRenderer
          key={getShapeKey(shape, index)}
          shape={shape}
          editingShapeId={editingShapeId}
        />
      ))}
    </g>
  );
});

/**
 * Get a stable key for a shape
 */
function getShapeKey(shape: Shape, index: number): string {
  // Use shape ID if available, otherwise fall back to index
  if ("nonVisual" in shape && shape.nonVisual?.id) {
    return shape.nonVisual.id;
  }
  if ("modelId" in shape && shape.modelId) {
    return `diagram-${shape.modelId}`;
  }
  return `diagram-shape-${index}`;
}
