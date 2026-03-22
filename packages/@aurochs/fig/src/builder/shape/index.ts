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


// Base types
export type { BaseShapeBuilderMethods } from "./base";

// Builders
export { type EllipseNodeBuilder, ellipseNode } from "./ellipse";
export { type LineNodeBuilder, lineNode } from "./line";
export { type StarNodeBuilder, starNode } from "./star";
export { type PolygonNodeBuilder, polygonNode } from "./polygon";
export { type VectorNodeBuilder, vectorNode } from "./vector";
export { type RectangleNodeBuilder, rectNode } from "./rectangle";
export { type RoundedRectangleNodeBuilder, roundedRectNode } from "./rounded-rectangle";
