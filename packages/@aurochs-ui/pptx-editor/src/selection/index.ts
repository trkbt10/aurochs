/**
 * @file Selection components
 *
 * Components for displaying shape selection UI:
 * - SelectionBox: Bounding box around selected shape(s) with variant support
 * - ResizeHandle: Draggable handle for resizing
 * - RotateHandle: Draggable handle for rotation
 */

export { SelectionBox } from "./SelectionBox";
export type { SelectionBoxProps, SelectionBoxVariant } from "./SelectionBox";

export { ResizeHandle } from "./ResizeHandle";
export type { ResizeHandleProps } from "./ResizeHandle";

export { RotateHandle } from "./RotateHandle";
export type { RotateHandleProps } from "./RotateHandle";
