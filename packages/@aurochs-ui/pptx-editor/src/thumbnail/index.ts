/**
 * @file Thumbnail module
 *
 * Slide thumbnail components and utilities:
 *
 * Components:
 * - ThumbnailItem: Individual slide thumbnail with drag-and-drop
 * - SlideThumbnailPreview: SVG preview component
 *
 * Hooks & utilities:
 * - useSlideThumbnails: Hook for cached thumbnail generation
 * - cache utilities: Thumbnail cache management
 *
 * Note: SlideThumbnailPanel (the panel container) is in panels/ as it's a consumer.
 */

// Thumbnail item component
export { ThumbnailItem } from "./ThumbnailItem";
export type { ThumbnailItemProps, DragState, ContextMenuState } from "./types";

// Rendering components
export { SlideThumbnailPreview } from "./SlideThumbnailPreview";
export type { SlideThumbnailPreviewProps } from "./SlideThumbnailPreview";

export { useSlideThumbnails } from "./use-slide-thumbnails";
export type { UseSlideThumbnailsOptions, SlideThumbnailRenderer } from "./use-slide-thumbnails";

export { useLayoutThumbnails } from "./use-layout-thumbnails";
export type { UseLayoutThumbnailsOptions, LayoutThumbnailData } from "./use-layout-thumbnails";

export { LayoutThumbnail } from "./LayoutThumbnail";
export type { LayoutThumbnailProps } from "./LayoutThumbnail";

export {
  createThumbnailCache,
  getCachedThumbnail,
  setCachedThumbnail,
  pruneCacheForSlideIds,
} from "./cache";
export type { ThumbnailCache, ThumbnailCacheEntry } from "./cache";
