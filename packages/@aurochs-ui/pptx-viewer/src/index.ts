/**
 * @file Viewer module - internal aggregation
 *
 * NOTE: This file is for INTERNAL use only (re-export from src/index.ts).
 * Do NOT add "./viewer" to package.json exports.
 *
 * Reason: Tree-shaking. If consumers import from a barrel export,
 * all dependencies are bundled even when only one component is needed.
 * Each component is exported individually in package.json:
 * - ./viewer/PresentationSlideshow
 * - ./viewer/PresentationViewer
 * - ./viewer/EmbeddableSlide
 * - ./viewer/SlideShareViewer
 *
 * Use cases:
 * - Play: PresentationSlideshow (fullscreen presentation)
 * - View single: EmbeddableSlide (embed in iframe/page)
 * - View list: PresentationViewer, SlideShareViewer (with thumbnails)
 */

// Hooks
export {
  // Navigation
  useSlideNavigation,
  type UseSlideNavigationOptions,
  type SlideNavigationResult,
  // Viewer keyboard
  useViewerKeyboard,
  type ViewerKeyboardActions,
  // Slideshow mode management
  useSlideshowMode,
  type UseSlideshowModeOptions,
  type SlideshowModeResult,
  // Slideshow playback
  useSlideshowAutoAdvance,
  type UseSlideshowAutoAdvanceOptions,
  useSlideshowControls,
  type UseSlideshowControlsOptions,
  type SlideshowControlsResult,
  useSlideshowKeyboard,
  type SlideshowKeyboardActions,
  useSlideshowRenderSize,
  type UseSlideshowRenderSizeOptions,
  type RenderSize,
} from "./hooks";

// Primitive Components
export {
  SlideIndicator,
  ProgressBar,
  KeyboardHints,
  NavigationControls,
  SlidePreview,
  ViewerControls,
  type SlideIndicatorProps,
  type SlideIndicatorVariant,
  type ProgressBarProps,
  type ProgressBarVariant,
  type KeyboardHintsProps,
  type KeyboardHintsVariant,
  type KeyboardHint,
  type NavigationControlsProps,
  type NavigationControlsVariant,
  type SlidePreviewProps,
  type ViewerControlsProps,
  type ControlAction,
  type NavigationState,
  type PositionState,
} from "./components";

// Composite Components
export { PresentationSlideshow, type PresentationSlideshowProps, type SlideshowSlideContent } from "./PresentationSlideshow";
export { PresentationViewer, type PresentationViewerProps } from "./PresentationViewer";
export { EmbeddableSlide, type EmbeddableSlideProps } from "./EmbeddableSlide";
export { SlideShareViewer, type SlideShareViewerProps } from "./SlideShareViewer";
