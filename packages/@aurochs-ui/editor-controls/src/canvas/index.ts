/**
 * @file Canvas selection components
 *
 * Shared SVG components for shape selection UI:
 * - SelectionBox: Bounding box around selected shape(s) with variant support
 * - ResizeHandle: Draggable handle for resizing
 * - RotateHandle: Draggable handle for rotation
 */

export type { SelectionBoxVariant } from "./types";

export { SelectionBox } from "./SelectionBox";
export type { SelectionBoxProps } from "./SelectionBox";

export { ResizeHandle } from "./ResizeHandle";
export type { ResizeHandleProps } from "./ResizeHandle";

export { RotateHandle } from "./RotateHandle";
export type { RotateHandleProps } from "./RotateHandle";
