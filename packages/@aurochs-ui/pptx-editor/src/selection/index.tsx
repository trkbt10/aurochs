/**
 * @file Selection components
 *
 * Components for displaying shape selection UI:
 * - SelectionBox: Bounding box around selected shape(s) with variant support
 * - ResizeHandle: Draggable handle for resizing
 * - RotateHandle: Draggable handle for rotation
 *
 * Local wrappers around @aurochs-ui/editor-controls/canvas components
 * to maintain package boundary discipline.
 */

import {
  SelectionBox as SelectionBoxImpl,
  type SelectionBoxProps as SelectionBoxPropsImpl,
  type SelectionBoxVariant as SelectionBoxVariantImpl,
  ResizeHandle as ResizeHandleImpl,
  type ResizeHandleProps as ResizeHandlePropsImpl,
  RotateHandle as RotateHandleImpl,
  type RotateHandleProps as RotateHandlePropsImpl,
} from "@aurochs-ui/editor-controls/canvas";

/** Props for SelectionBox component */
export type SelectionBoxProps = SelectionBoxPropsImpl;

/** Variant for SelectionBox styling */
export type SelectionBoxVariant = SelectionBoxVariantImpl;

/** Props for ResizeHandle component */
export type ResizeHandleProps = ResizeHandlePropsImpl;

/** Props for RotateHandle component */
export type RotateHandleProps = RotateHandlePropsImpl;

/**
 * Bounding box around selected shape(s) with variant support
 */
export function SelectionBox(props: SelectionBoxProps): React.ReactElement {
  return <SelectionBoxImpl {...props} />;
}

/**
 * Draggable handle for resizing
 */
export function ResizeHandle(props: ResizeHandleProps): React.ReactElement {
  return <ResizeHandleImpl {...props} />;
}

/**
 * Draggable handle for rotation
 */
export function RotateHandle(props: RotateHandleProps): React.ReactElement {
  return <RotateHandleImpl {...props} />;
}
