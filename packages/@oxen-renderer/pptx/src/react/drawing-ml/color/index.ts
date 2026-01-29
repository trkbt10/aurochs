/**
 * @file Color module exports
 *
 * React hooks and components for DrawingML color resolution.
 *
 * Note: This module provides PPTX-specific hooks that use PPTX's RenderContext.
 * For format-agnostic color utilities, use @oxen-renderer/drawing-ml/color directly.
 */

// PPTX-specific hooks (use PPTX RenderContext)
export { useColor, resolveColorForReact, type ResolvedColorResult } from "./useColor";

// PPTX-specific components (use PPTX RenderContext via useColor)
export { ColorSwatch, ColorSwatchRow, type ColorSwatchProps, type ColorSwatchRowProps } from "./ColorSwatch";
