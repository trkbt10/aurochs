/**
 * @file Viewer hooks index
 *
 * Re-exports all viewer-related hooks.
 */

// Navigation
export { useSlideNavigation, type UseSlideNavigationOptions, type SlideNavigationResult } from "./useSlideNavigation";

// Viewer keyboard
export { useViewerKeyboard, type ViewerKeyboardActions } from "./useViewerKeyboard";

// Slideshow mode management
export {
  useSlideshowMode,
  type UseSlideshowModeOptions,
  type SlideshowModeResult,
} from "./useSlideshowMode";

// Slideshow playback hooks
export { useSlideshowAutoAdvance, type UseSlideshowAutoAdvanceOptions } from "./useSlideshowAutoAdvance";
export { useSlideshowControls, type UseSlideshowControlsOptions, type SlideshowControlsResult } from "./useSlideshowControls";
export { useSlideshowKeyboard, type SlideshowKeyboardActions } from "./useSlideshowKeyboard";
export { useSlideshowRenderSize, type UseSlideshowRenderSizeOptions, type RenderSize } from "./useSlideshowRenderSize";
