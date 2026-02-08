/**
 * @file Element builders for PPTX construction
 *
 * This module provides builders for shapes, images, tables, charts, etc.
 */

// File I/O utilities
export { detectImageMimeType, readFileToArrayBuffer, uint8ArrayToArrayBuffer } from "./file-utils";

// Relationship path utilities
export { getSlideRelsPath } from "./rels-utils";

// ID generation
export { generateShapeId } from "./id-generator";

// XML utilities
export { setChildren } from "./xml-utils";

// Preset shape mappings
export { PRESET_MAP } from "./presets";

// For fill builders (buildColor, buildFill, buildGradientFill, etc.),
// import directly from @aurochs-builder/drawing-ml/fill

// For line builders (buildLine, buildLineEnd, buildLineFromSpec),
// import directly from @aurochs-builder/drawing-ml/line

// For effects builders (buildEffects, buildBevel, buildShape3d),
// import directly from @aurochs-builder/drawing-ml/effect

// For text builders (buildTextBody, buildParagraph, buildTextRun, collectHyperlinks),
// import directly from @aurochs-builder/drawing-ml/text

// Blip effects builders
export { buildBlipEffectsFromSpec } from "./blip-effects-builder";

// Custom geometry builders
export { buildCustomGeometryFromSpec } from "./custom-geometry-builder";

// Media embed builders
export { buildMediaReferenceFromSpec, detectEmbeddedMediaType } from "./media-embed-builder";

// Background builders
export { applyBackground, applyImageBackground, isImageBackground } from "./background-builder";

// Slide utilities
export { getShapeId, getExistingShapeIds, applyBackgroundSpec } from "./slide-utils";

// Slide processor
export {
  processSlideElements,
  type SlideModInput,
  type SlideProcessContext,
  type SlideProcessResult,
} from "./slide-processor";

// Animation builders
export { applyAnimations, type ApplyAnimationsResult } from "./animation-builder";

// Comment builders
export { applyComments } from "./comment-builder";

// Notes builders
export { applyNotes } from "./notes-builder";

// Transition builders
export { applySlideTransition, isTransitionType } from "./transition-builder";

// Theme builders
export { applyThemeEditsToPackage, applyThemeEditsToThemeXml } from "./theme-builder";

// Chart builders
export { applyChartUpdates } from "./chart-builder";

// Chart add builders
export { addChartsToSlide } from "./chart-add-builder";

// SmartArt builders
export { applySmartArtUpdates } from "./smartart-builder";

// Table update builders
export { applyTableUpdates, type ApplyTableUpdatesResult } from "./table-update-builder";

// Registry (main element builders)
export {
  // Context types
  type BuildContext,
  type BuildResult,
  type SyncBuilder,
  type AsyncBuilder,
  // Element builders
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  // Unified processing
  addElementsSync,
  addElementsAsync,
  type AddElementsSyncOptions,
  type AddElementsAsyncOptions,
} from "./registry";
