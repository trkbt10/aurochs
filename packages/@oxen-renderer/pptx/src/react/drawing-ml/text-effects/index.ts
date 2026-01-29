/**
 * @file Text Effects module exports
 *
 * SVG filter components for DrawingML text effects.
 *
 * Note: These components use PPTX-specific TextEffectsConfig type from
 * @oxen-office/pptx/domain/drawing-ml/text-effects. For format-agnostic
 * text effects, use @oxen-renderer/drawing-ml/text-effects directly.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

// PPTX-specific implementation (uses PPTX text effects types)
export { createTextEffectsFilterDef } from "./TextEffectsFilter";
