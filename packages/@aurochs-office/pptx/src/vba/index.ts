/**
 * @file PowerPoint VBA Host Adapter exports
 *
 * Provides VBA runtime integration for PowerPoint (PPTX) presentations.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

export { createPowerPointHostAdapter, createPowerPointAdapterState } from "./adapter";
export type { PowerPointAdapterState } from "./adapter";
export type {
  PowerPointHostObject,
  PowerPointApplicationObject,
  PowerPointPresentationObject,
  PowerPointSlidesObject,
  PowerPointSlideObject,
  PowerPointShapesObject,
  PowerPointShapeObject,
  PowerPointTextRangeObject,
  PowerPointTextFrameObject,
} from "./types";
export {
  isApplicationObject,
  isPresentationObject,
  isSlidesObject,
  isSlideObject,
  isShapesObject,
  isShapeObject,
  isTextRangeObject,
  isTextFrameObject,
} from "./types";
