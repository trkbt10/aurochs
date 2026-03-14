/**
 * @file Canvas selection types
 *
 * Shared types for canvas-based selection UI components.
 */

/**
 * Selection box variant:
 * - primary: Single selected shape (with handles)
 * - secondary: Non-primary shape in multi-selection (no handles)
 * - multi: Combined bounding box for multi-selection (with handles)
 */
export type SelectionBoxVariant = "primary" | "secondary" | "multi";
