/**
 * @file Slide thumbnail types
 *
 * Type definitions for the slide thumbnail components.
 */

import type { SlideWithId, SlideId } from "@oxen/pptx/app";

/**
 * Props for individual thumbnail item
 */
export type ThumbnailItemProps = {
  readonly slideWithId: SlideWithId;
  readonly index: number;
  readonly isActive: boolean;
  readonly totalSlides: number;
  readonly aspectRatio: string;
  readonly renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
  readonly onClick: () => void;
  readonly onContextMenu: (e: React.MouseEvent) => void;
  readonly onDelete: () => void;
  readonly onDragStart: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly isDragOver: boolean;
  readonly dragPosition: "before" | "after" | null;
  readonly itemRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Drag state for slide reordering
 */
export type DragState = {
  draggingId: SlideId | null;
  overId: SlideId | null;
  position: "before" | "after" | null;
};

/**
 * Context menu state
 */
export type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  slideId: SlideId | null;
};
