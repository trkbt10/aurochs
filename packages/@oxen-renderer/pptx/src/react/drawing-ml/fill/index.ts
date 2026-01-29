/**
 * @file Fill module exports
 *
 * Pattern fill components and hooks for DrawingML rendering.
 *
 * Note: This module provides PPTX-specific hooks that use PPTX's RenderContext.
 * For format-agnostic fill utilities, use @oxen-renderer/drawing-ml/fill directly.
 */

// PPTX-specific exports (use PPTX RenderContext)
export {
  PatternDef,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
  type PatternDefProps,
} from "./PatternDef";

export {
  usePatternFill,
  resolvePatternFillForReact,
  type PatternFillResult,
} from "./usePatternFill";

// Re-export shared components/types from drawing-ml for convenience
export {
  PatternDef as SharedPatternDef,
  type PatternDefProps as SharedPatternDefProps,
  type PatternFillResult as SharedPatternFillResult,
} from "@oxen-renderer/drawing-ml/fill";
