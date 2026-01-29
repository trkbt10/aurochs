/**
 * @file Fill module exports
 *
 * Pattern fill components and hooks for DrawingML rendering.
 */

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
