/**
 * @file Geometry types
 *
 * Shared types for geometry calculations used across editor packages.
 */

/**
 * Point in 2D space
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Simple numeric bounds (not branded with any unit system)
 */
export type SimpleBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Input for rotation-aware bounds calculation
 */
export type RotatedBoundsInput = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Rotation result for a shape
 */
export type RotationResult = {
  /** New X position (top-left) */
  readonly x: number;
  /** New Y position (top-left) */
  readonly y: number;
  /** New rotation angle in degrees */
  readonly rotation: number;
};

/**
 * Resize handle positions
 */
export type ResizeHandlePosition =
  | "nw" // top-left
  | "n" // top-center
  | "ne" // top-right
  | "e" // middle-right
  | "se" // bottom-right
  | "s" // bottom-center
  | "sw" // bottom-left
  | "w"; // middle-left

/**
 * Bounds representation for resize calculations
 */
export type ResizeBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Options for resize calculation
 */
export type ResizeOptions = {
  /** Whether aspect ratio should be locked */
  readonly aspectLocked: boolean;
  /** Minimum width constraint */
  readonly minWidth: number;
  /** Minimum height constraint */
  readonly minHeight: number;
};
