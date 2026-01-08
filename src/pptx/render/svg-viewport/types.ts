/**
 * @file SVG viewport types
 *
 * Types for unified SVG-based canvas viewport management.
 */

/**
 * Represents the viewport transformation state.
 * All values are in screen pixels.
 */
export type ViewportTransform = {
  /** Pan X offset in screen pixels */
  readonly translateX: number;
  /** Pan Y offset in screen pixels */
  readonly translateY: number;
  /** Zoom scale factor (1 = 100%) */
  readonly scale: number;
};

/**
 * Initial viewport transform (centered, no zoom).
 */
export const INITIAL_VIEWPORT: ViewportTransform = {
  translateX: 0,
  translateY: 0,
  scale: 1,
};

/**
 * Viewport dimensions in pixels.
 */
export type ViewportSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Slide dimensions in slide units.
 */
export type SlideSize = {
  readonly width: number;
  readonly height: number;
};
