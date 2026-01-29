/**
 * @file Shared types for graphic frame content rendering
 */

import type { ShapeId } from "@oxen-office/pptx/domain/types";
import type { GraphicFrame } from "@oxen-office/pptx/domain";

/**
 * Props for GraphicFrameRenderer
 */
export type GraphicFrameRendererProps = {
  /** Shape to render */
  readonly shape: GraphicFrame;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
  /** ID of shape currently being edited (for nested content like diagrams) */
  readonly editingShapeId?: ShapeId;
};

/**
 * Common props for content components
 */
export type ContentProps<T> = {
  readonly data: T;
  readonly width: number;
  readonly height: number;
};

/**
 * Result type for SVG generation hooks
 */
export type SvgResult = {
  readonly svg: string | null;
  readonly hasContent: boolean;
};
