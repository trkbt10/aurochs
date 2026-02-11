/**
 * @file Viewer module index
 *
 * Unified viewer components for presentations.
 * Provides reusable hooks, primitives, and composite components.
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
} from "./components";

// Composite Components
export { PresentationSlideshow, type PresentationSlideshowProps, type SlideshowSlideContent } from "./PresentationSlideshow";
export { PresentationViewer, type PresentationViewerProps } from "./PresentationViewer";
export { EmbeddableSlide, type EmbeddableSlideProps } from "./EmbeddableSlide";
export { SlideShareViewer, type SlideShareViewerProps } from "./SlideShareViewer";
