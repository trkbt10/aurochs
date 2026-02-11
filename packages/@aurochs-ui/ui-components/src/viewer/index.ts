/**
 * @file Viewer module exports
 *
 * Shared components and hooks for document/slide/sheet viewers.
 */

// Layout components
export { ViewerContainer, type ViewerContainerProps } from "./ViewerContainer";
export { ViewerToolbar, type ViewerToolbarProps } from "./ViewerToolbar";
export { ViewerMain, type ViewerMainProps } from "./ViewerMain";
export { ViewerSidebar, type ViewerSidebarProps } from "./ViewerSidebar";
export { ViewerContent, type ViewerContentProps } from "./ViewerContent";
export { ViewerFooter, type ViewerFooterProps } from "./ViewerFooter";

// Embeddable components
export { EmbeddableContainer, type EmbeddableContainerProps } from "./EmbeddableContainer";
export { EmbeddableContent, type EmbeddableContentProps } from "./EmbeddableContent";
export { EmbeddableFooter, type EmbeddableFooterProps } from "./EmbeddableFooter";

// Item components
export { ThumbnailItem, type ThumbnailItemProps } from "./ThumbnailItem";
export { PositionIndicator, type PositionIndicatorProps, type PositionIndicatorVariant } from "./PositionIndicator";
export {
  NavigationControls,
  type NavigationControlsProps,
  type NavigationControlsVariant,
} from "./NavigationControls";

// Hooks
export { useItemNavigation, type UseItemNavigationOptions, type ItemNavigationResult } from "./useItemNavigation";
export { useViewerKeyboard, type ViewerKeyboardActions } from "./useViewerKeyboard";
