/**
 * @file Figma paint interpretation — shared SoT
 *
 * Pure functions that interpret FigPaint objects into platform-agnostic
 * intermediate structures. Both the SVG string renderer and the SceneGraph
 * builder consume these functions, ensuring a single source of truth for
 * gradient direction, stop extraction, image reference resolution, etc.
 *
 * These functions operate on FigPaint (the raw Kiwi/API union type).
 * They do NOT produce SVG strings or React elements — consumers handle
 * their own output format.
 */

export {
  getGradientStops,
  getGradientDirection,
  getGradientDirectionFromTransform,
  getRadialGradientCenterAndRadius,
  getAngularGradientParams,
  getDiamondGradientParams,
  getImageRef,
  getScaleMode,
  type GradientDirection,
  type RadialGradientParams,
  type AngularGradientParams,
  type DiamondGradientParams,
  type GradientTransform,
} from "./interpret";
