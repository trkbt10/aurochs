/**
 * @file PDF operator parser module
 *
 * Functional PDF content stream parser using handler registry pattern.
 *
 * This module replaces the class-based OperatorParser with:
 * - Pure function handlers for each operator category
 * - O(1) operator lookup via Map registry
 * - Immutable state transitions
 * - Individually testable components
 */

// Main parse function
export { parseContentStream, createParser, getSupportedOperators } from "./parse";

// Types
export type {
  ParsedPath,
  ParsedText,
  ParsedImage,
  ParsedRasterImage,
  ParsedElement,
  TextRun,
  ParserContext,
  ParserStateUpdate,
  GraphicsStateOps,
  OperatorHandler,
  OperatorHandlerEntry,
  TextObjectState,
  OperandStack,
  OperandValue,
} from "./types";

// Handler registries (for extension/testing)
export { OPERATOR_HANDLERS, createInitialContext, applyUpdate, createGfxOpsFromStack } from "./parse";
export { PATH_CONSTRUCTION_HANDLERS, PATH_PAINTING_HANDLERS, pathHandlers } from "./path-handlers";
export { COLOR_HANDLERS, colorHandlers } from "./color-handlers";
export { GRAPHICS_STATE_HANDLERS, graphicsStateHandlers } from "./graphics-state-handlers";
export { TEXT_HANDLERS, textHandlers, createInitialTextState, calculateTextDisplacement, calculateEffectiveFontSize, getGlyphWidth, createTextRun } from "./text-handlers";
export { SHADING_HANDLERS, shadingHandlers } from "./shading-handlers";
export { XOBJECT_HANDLERS, xobjectHandlers } from "./xobject-handlers";

// Stack operations (for testing)
export {
  popNumber,
  popString,
  popArray,
  popNumbers,
  pushValue,
  pushValues,
  finalizeArray,
  collectColorComponents,
} from "./stack-ops";
