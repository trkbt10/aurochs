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
export { SolidPaintBuilder, solidPaint, solidPaintHex } from "./solid";
export { LinearGradientBuilder, linearGradient } from "./linear-gradient";
export { RadialGradientBuilder, radialGradient } from "./radial-gradient";
export { AngularGradientBuilder, angularGradient } from "./angular-gradient";
export { DiamondGradientBuilder, diamondGradient } from "./diamond-gradient";
export { ImagePaintBuilder, imagePaint } from "./image";
export { StrokeBuilder, stroke } from "./stroke";
