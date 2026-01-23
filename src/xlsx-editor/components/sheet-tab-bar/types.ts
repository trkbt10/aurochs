/**
 * @file Sheet tab bar types
 *
 * Type definitions for the sheet tab bar component and related hooks.
 */

/**
 * Drag state for sheet tabs
 */
export type SheetTabDragState =
  | { readonly type: "idle" }
  | {
      readonly type: "dragging";
      readonly draggingIndex: number;
      readonly targetGapIndex: number | undefined;
    };

/**
 * Create idle drag state
 */
export function createIdleDragState(): SheetTabDragState {
  return { type: "idle" };
}

/**
 * Drop target position for visual indicator
 */
export type DropTargetPosition = "left" | "right" | undefined;

/**
 * Props for individual sheet tab
 */
export type XlsxSheetTabProps = {
  readonly sheetIndex: number;
  readonly sheetName: string;
  readonly isActive: boolean;
  readonly hasContent: boolean;
  readonly isEditing: boolean;
  readonly canDelete: boolean;
  readonly onSelect: () => void;
  readonly onClose: () => void;
  readonly onRename: (newName: string) => void;
  readonly onStartEdit: () => void;
  readonly onCancelEdit: () => void;
  readonly onDuplicate: () => void;
  readonly onDragStart: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onDragEnd: () => void;
  readonly isDragging: boolean;
  readonly dropTargetPosition: DropTargetPosition;
  readonly onContextMenu: (e: React.MouseEvent) => void;
};

/**
 * Context menu state for sheet tabs
 */
export type SheetTabContextMenuState =
  | { readonly type: "closed" }
  | {
      readonly type: "open";
      readonly x: number;
      readonly y: number;
      readonly sheetIndex: number;
    };

/**
 * Create closed context menu state
 */
export function createClosedContextMenuState(): SheetTabContextMenuState {
  return { type: "closed" };
}
