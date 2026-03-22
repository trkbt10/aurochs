/**
 * @file Paint builders
 *
 * Provides builders for:
 * - Solid color fills
 * - Linear gradients
 * - Radial gradients
 * - Angular gradients
 * - Diamond gradients
 * - Image fills
 * - Strokes with various styles
 */

// Types
export type {
  GradientStop,
  GradientHandles,
  GradientPaint,
  ImagePaint,
  StrokeData,
} from "./types";

// Builders
export { type SolidPaintBuilder, solidPaint, solidPaintHex } from "./solid";
export { type LinearGradientBuilder, linearGradient } from "./linear-gradient";
export { type RadialGradientBuilder, radialGradient } from "./radial-gradient";
export { type AngularGradientBuilder, angularGradient } from "./angular-gradient";
export { type DiamondGradientBuilder, diamondGradient } from "./diamond-gradient";
export { type ImagePaintBuilder, imagePaint } from "./image";
export { type StrokeBuilder, stroke } from "./stroke";
