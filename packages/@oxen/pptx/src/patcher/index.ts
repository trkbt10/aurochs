/**
 * @file PPTX Patcher Module
 *
 * Change detection and XML patching for PPTX export.
 *
 * @example
 * ```typescript
 * import { detectSlideChanges, patchSlideXml } from "./pptx/patcher";
 *
 * // Detect changes between original and modified slide
 * const changes = detectSlideChanges(originalSlide, modifiedSlide);
 *
 * // Apply changes to the XML document
 * const updatedXml = patchSlideXml(slideXml, changes);
 * ```
 */

// Core - Change detection and XML mutation
export * from "./core";

// Slide - Slide-level patching
export * from "./slide";

// Shape - Shape addition/serialization helpers
export * from "./shape";

// Resources - media/relationships/content-types helpers (Phase 7)
export * from "./resources/media-manager";
export * from "./resources/relationship-manager";
export * from "./resources/content-types-manager";

// Phase 9: Master / Layout / Theme
export * from "./master";
export * from "./theme";

// Presentation - slide structure management
export * from "./presentation";

// Parts - shared XML part updaters
export * from "./parts";

// Phase 10: Advanced elements (chart/table/diagram/OLE)
export * from "./chart";
export * from "./table";
export * from "./diagram";
export * from "./ole";
