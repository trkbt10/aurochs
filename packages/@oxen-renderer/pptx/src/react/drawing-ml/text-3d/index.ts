/**
 * @file Text 3D module exports
 *
 * SVG rendering for DrawingML 3D text effects.
 *
 * Note: These components use PPTX-specific Scene3d/Shape3d types from
 * @oxen-office/pptx/domain/three-d. For format-agnostic 3D text effects,
 * use @oxen-renderer/drawing-ml/text-3d directly.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// PPTX-specific implementations (use PPTX 3D types)
export { render3dTextEffects } from "./render-3d-effects";
export { renderTextExtrusion, getExtrusionOffset } from "./extrusion";
export { createTextBevelFilterDef, getBevelOffsets, type BevelConfig } from "./bevel-filter";
