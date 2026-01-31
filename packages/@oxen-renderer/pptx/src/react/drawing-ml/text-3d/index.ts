/**
 * @file Text 3D module exports
 *
 * SVG rendering for DrawingML 3D text effects.
 *
 * PPTX-specific implementations using PPTX 3D types.
 * For format-agnostic components (renderTextExtrusion, getExtrusionOffset,
 * createTextBevelFilterDef, getBevelOffsets, BevelConfig), import directly
 * from @oxen-renderer/drawing-ml.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// PPTX-specific implementations (use PPTX 3D types)
export { render3dTextEffects } from "./render-3d-effects";
