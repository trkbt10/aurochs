/** @file React hooks for viewer and editor functionality */
export { usePptx } from "./usePptx";
export { useDocx } from "./useDocx";
export { useXlsx } from "./useXlsx";

// Re-export viewer hooks from @aurochs-ui/pptx-editor
// These are provided for backwards compatibility - prefer importing directly from @aurochs-ui/pptx-editor
export { useSlideNavigation, useViewerKeyboard } from "@aurochs-ui/pptx-editor";

// Legacy slideshow keyboard hook (now integrated into PresentationSlideshow)
export { useSlideshowKeyboard } from "./useSlideshowKeyboard";
