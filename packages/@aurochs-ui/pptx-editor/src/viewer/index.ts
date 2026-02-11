/**
 * @file Viewer module index
 *
 * Unified viewer components for presentations.
 * Provides reusable hooks, primitives, and composite components.
 */

// Hooks
export {
  useSlideNavigation,
  useViewerKeyboard,
  useSlideshowMode,
  type UseSlideNavigationOptions,
  type SlideNavigationResult,
  type ViewerKeyboardActions,
  type UseSlideshowModeOptions,
  type SlideshowModeResult,
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
export { PresentationViewer, type PresentationViewerProps } from "./PresentationViewer";
export { EmbeddableSlide, type EmbeddableSlideProps } from "./EmbeddableSlide";
export { SlideShareViewer, type SlideShareViewerProps } from "./SlideShareViewer";
