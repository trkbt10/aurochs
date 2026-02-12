/**
 * @file Shape geometry calculation utilities
 *
 * Shape geometry, text rectangles, and connection site calculations.
 *
 * @see ECMA-376 Part 1, Section 20.1.9 (Preset Shape Geometries)
 */

// Guide engine for preset shapes (re-exported from drawing-ml)
export type { GuideContext } from "@aurochs-office/drawing-ml/domain/geometry";
export {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  angleUnitsToDegrees,
  degreesToAngleUnits,
  normalizeAngle,
} from "@aurochs-office/drawing-ml/domain/geometry";

// Text rectangle calculations
export type { ResolvedTextRect } from "./text-rect";
export {
  calculateTextRect,
  isInsideTextRect,
  applyTextInsets,
} from "./text-rect";

// Connection site calculations
export type { ResolvedConnectionSite, ConnectionSiteLookup } from "./connection-site";
export {
  calculateConnectionSites,
  getConnectionPoint,
  transformConnectionPoint,
} from "./connection-site";
