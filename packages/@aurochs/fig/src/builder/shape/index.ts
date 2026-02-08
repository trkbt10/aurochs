/**
 * @file Shape builders
 *
 * Provides builders for:
 * - ELLIPSE (type 9) - Circles and ellipses
 * - LINE (type 8) - Line segments
 * - STAR (type 7) - Star shapes
 * - RECTANGLE (type 10) - Basic rectangles
 * - REGULAR_POLYGON (type 11) - Regular polygons
 * - VECTOR (type 6) - Custom vector paths
 * - ROUNDED_RECTANGLE (type 12) - Rounded rectangles
 */

// Types
export type {
  ArcData,
  BaseShapeNodeData,
  EllipseNodeData,
  LineNodeData,
  StarNodeData,
  PolygonNodeData,
  VectorNodeData,
  RectangleNodeData,
  RoundedRectangleNodeData,
} from "./types";

// Re-export Stroke from types for backwards compatibility
export type { Stroke } from "../types";

// Base class (for extension if needed)
export { BaseShapeBuilder } from "./base";

// Builders
export { EllipseNodeBuilder, ellipseNode } from "./ellipse";
export { LineNodeBuilder, lineNode } from "./line";
export { StarNodeBuilder, starNode } from "./star";
export { PolygonNodeBuilder, polygonNode } from "./polygon";
export { VectorNodeBuilder, vectorNode } from "./vector";
export { RectangleNodeBuilder, rectNode } from "./rectangle";
export { RoundedRectangleNodeBuilder, roundedRectNode } from "./rounded-rectangle";
