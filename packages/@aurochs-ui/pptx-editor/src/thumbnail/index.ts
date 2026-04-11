/**
 * @file Thumbnail module
 *
 * Slide thumbnail components and utilities:
 *
 * Components:
 * - ThumbnailItem: Individual slide thumbnail with drag-and-drop
 * - SlideThumbnailPreview: React component-based slide preview
 *
 * Note: SlideThumbnailPanel (the panel container) is in panels/ as it's a consumer.
 *
 * Layout thumbnails (`LayoutThumbnail`, `useLayoutThumbnails`): @aurochs-ui/ooxml-components/presentation-theme-layout
 */

// Thumbnail item component
export { ThumbnailItem } from "./ThumbnailItem";
export type { ThumbnailItemProps, DragState, ContextMenuState } from "./types";

// Rendering components
export { SlideThumbnailPreview } from "./SlideThumbnailPreview";
export type { SlideThumbnailPreviewProps } from "./SlideThumbnailPreview";
