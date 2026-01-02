/**
 * @file Parser module for PPTX processing
 *
 * Provides parsers that transform XmlElement to Domain Objects.
 *
 * ## Architecture
 *
 * ```
 * XmlElement (raw XML AST)
 *     │
 *     ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         Parse Layer                              │
 * │                                                                  │
 * │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 * │  │ primitive.ts │  │ context.ts   │  │ color-parser │          │
 * │  │ (units)      │  │ (context)    │  │ (colors)     │          │
 * │  └──────────────┘  └──────────────┘  └──────────────┘          │
 * │                                                                  │
 * │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 * │  │ fill-parser  │  │ line-parser  │  │ text-parser  │          │
 * │  │ (fills)      │  │ (strokes)    │  │ (text body)  │          │
 * │  └──────────────┘  └──────────────┘  └──────────────┘          │
 * │                                                                  │
 * │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 * │  │ shape-parser │  │ effects-     │  │ geometry-    │          │
 * │  │ (shapes)     │  │ parser       │  │ parser       │          │
 * │  └──────────────┘  └──────────────┘  └──────────────┘          │
 * │                                                                  │
 * │  ┌────────────────────────────────────────────────────┐        │
 * │  │              slide-parser (entry point)            │        │
 * │  └────────────────────────────────────────────────────┘        │
 * └─────────────────────────────────────────────────────────────────┘
 *     │
 *     ▼
 * Domain Objects (Slide, Shape, TextBody, etc.)
 * ```
 *
 * @example
 * ```typescript
 * import { parseSlide } from "./parser";
 *
 * const slide = parseSlide(slideXmlDocument, context);
 * // slide: Slide domain object
 * ```
 */

// =============================================================================
// Context
// =============================================================================

// Note: ColorContext, ColorMap, ColorScheme, FontScheme, FontSpec are in core/color-types.ts
// Import them from there directly, not from parser

export type {
  MasterStylesInfo,
  ParseContext,
  PlaceholderContext,
  PlaceholderTables,
  ResourceResolver,
  TextStyleContext,
} from "./context";

export { createEmptyParseContext, createResourceResolver } from "./context";

// =============================================================================
// Primitive Parsing
// =============================================================================

export {
  // Integer/Number
  parseInt32,
  parseInt32Or,
  parseFloat64,
  parseInt64,
  parseUnsignedInt,
  parseIndex,
  // Boolean
  parseBoolean,
  parseBooleanOr,
  // EMU (length)
  parseEmu,
  parseEmuOr,
  parsePositiveEmu,
  parseCoordinate32Unqualified,
  parseCoordinateUnqualified,
  parseDrawingElementId,
  parseSlideId,
  parseSlideLayoutId,
  parseSlideMasterId,
  parseSlideSizeCoordinate,
  parseLineWidth,
  parsePositiveCoordinate,
  parsePositiveCoordinate32,
  // Angle
  parseAngle,
  parseAngleOr,
  parsePositiveFixedAngle,
  parseFixedAngle,
  parseFovAngle,
  parseFontCollectionIndex,
  // Percentage
  parsePercentage,
  parsePercentage100k,
  parsePositivePercentage,
  parseFixedPercentage,
  parsePositiveFixedPercentage,
  // Font size
  parseFontSize,
  parseFontSizeOr,
  parseFontSizeToPx,
  pointsToPixels,
  // Attribute helpers
  getEmuAttr,
  getEmuAttrOr,
  getAngleAttr,
  getBoolAttr,
  getBoolAttrOr,
  getIntAttr,
  getIntAttrOr,
  getIndexAttr,
  getFontSizeAttr,
  getPercentAttr,
  getPercent100kAttr,
  getChildAttr,
  getChildEmuAttr,
  getChildBoolAttr,
} from "./primitive";

// =============================================================================
// Transform Parsing
// =============================================================================

export {
  parseTransform,
  parseGroupTransform,
  getTransformFromProperties,
  getGroupTransformFromProperties,
  applyGroupTransform,
} from "./graphics/transform-parser";

// =============================================================================
// Color Parsing
// =============================================================================

export { findColorElement, parseColor, parseColorFromParent } from "./graphics/color-parser";

// Note: resolveColor is now in core/color-resolver.ts
// Import it from there directly

// =============================================================================
// Fill Parsing
// =============================================================================

export { findFillElement, parseFill, parseFillFromParent } from "./graphics/fill-parser";

// =============================================================================
// Line Parsing
// =============================================================================

export { parseLine, getLineFromProperties } from "./graphics/line-parser";

// =============================================================================
// Effects Parsing
// =============================================================================

export { parseEffects } from "./graphics/effects-parser";

// =============================================================================
// Geometry Parsing
// =============================================================================

export { parseGeometry } from "./graphics/geometry-parser";

// =============================================================================
// Text Parsing
// =============================================================================

export {
  parseBodyProperties,
  parseParagraphProperties,
  parseRunProperties,
  parseParagraph,
  parseTextBody,
} from "./text/text-parser";

// =============================================================================
// Shape Parsing
// =============================================================================

export { parseShapeElement, parseShapeTree } from "./shape-parser";

// =============================================================================
// Diagram Parsing
// =============================================================================

export { parseDiagramDataModel, parseDiagramDataModelElement } from "./diagram/data-parser";

export {
  parseDiagramLayoutDefinition,
  parseDiagramLayoutDefinitionHeader,
  parseDiagramLayoutDefinitionHeaderList,
} from "./diagram/layout-parser";

export {
  parseDiagramStyleDefinition,
  parseDiagramStyleDefinitionHeader,
  parseDiagramStyleDefinitionHeaderList,
} from "./diagram/style-parser";

export {
  parseDiagramColorsDefinition,
  parseDiagramColorsDefinitionHeader,
  parseDiagramColorsDefinitionHeaderList,
} from "./diagram/color-parser";

// =============================================================================
// Slide Parsing
// =============================================================================

export {
  parseBackground,
  parseTransition,
  parseColorMapOverride,
  parseSlide,
  parseSlideLayout,
  parseSlideLayoutIdList,
  parseSlideMaster,
  parseHandoutMaster,
  parseNotesMaster,
} from "./slide/slide-parser";

// =============================================================================
// Programmable Tags
// =============================================================================

export { parseTagList } from "./metadata/tag-parser";

// =============================================================================
// Text Style Levels
// =============================================================================

export { parseTextStyleLevels } from "./text/text-style-levels";

// =============================================================================
// Comments
// =============================================================================

export { parseComment, parseCommentAuthor, parseCommentAuthorList, parseCommentList } from "./metadata/comment-parser";

// =============================================================================
// Slide Synchronization
// =============================================================================

export { parseSlideSyncProperties } from "./slide/slide-sync-parser";
