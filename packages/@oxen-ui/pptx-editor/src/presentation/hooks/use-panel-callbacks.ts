/**
 * @file Panel callbacks hook
 *
 * Provides callbacks for interacting with shapes, slides, and panels.
 */

import { useCallback } from "react";
import type { Shape, SlideSize } from "@oxen/pptx/domain";
import type { Background } from "@oxen/pptx/domain/slide/types";
import { applySlideLayoutAttributes, type SlideLayoutAttributes } from "@oxen/pptx/parser/slide/layout-parser";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import type { ResizeHandlePosition } from "../../context/slide/state";
import type { PresentationEditorAction } from "../../context/presentation/editor/types";
import type { PresentationDocument } from "@oxen/pptx/app";
import { loadSlideLayoutBundle } from "@oxen/pptx/app";
import { updateShapeById } from "../../shape/mutation";
import type { ShapeHierarchyTarget } from "../../shape/hierarchy";

export type UsePanelCallbacksParams = {
  readonly dispatch: (action: PresentationEditorAction) => void;
  readonly document: PresentationDocument;
};

export type CanvasCallbacks = {
  readonly handleSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  readonly handleSelectMultiple: (shapeIds: readonly ShapeId[], primaryId?: ShapeId) => void;
  readonly handleClearSelection: () => void;
  readonly handleStartMove: (startX: number, startY: number) => void;
  readonly handleStartResize: (
    handle: ResizeHandlePosition,
    startX: number,
    startY: number,
    aspectLocked: boolean,
  ) => void;
  readonly handleStartRotate: (startX: number, startY: number) => void;
};

export type ShapeCallbacks = {
  readonly handleShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  readonly handleGroup: (shapeIds: readonly ShapeId[]) => void;
  readonly handleUngroup: (shapeId: ShapeId) => void;
  readonly handleMoveShape: (shapeId: ShapeId, target: ShapeHierarchyTarget) => void;
  readonly handleUpdateShapes: (shapeIds: readonly ShapeId[], updater: (shape: Shape) => Shape) => void;
  readonly handleDelete: (shapeIds: readonly ShapeId[]) => void;
  readonly handleDuplicate: () => void;
  readonly handleReorder: (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => void;
};

export type SlideCallbacks = {
  readonly handleBackgroundChange: (background: Background | undefined) => void;
  readonly handleLayoutAttributesChange: (attributes: SlideLayoutAttributes) => void;
  readonly handleLayoutChange: (layoutTargetPath: string) => void;
  readonly handleSlideSizeChange: (slideSize: SlideSize) => void;
};

export type UsePanelCallbacksResult = {
  readonly canvas: CanvasCallbacks;
  readonly shape: ShapeCallbacks;
  readonly slide: SlideCallbacks;
};

/**
 * Hook for panel and canvas callbacks.
 */
export function usePanelCallbacks({ dispatch, document }: UsePanelCallbacksParams): UsePanelCallbacksResult {
  // Canvas callbacks
  const handleSelect = useCallback(
    (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean): void => {
      dispatch({ type: "SELECT_SHAPE", shapeId, addToSelection, toggle });
    },
    [dispatch],
  );

  const handleSelectMultiple = useCallback(
    (shapeIds: readonly ShapeId[], primaryId?: ShapeId): void => {
      dispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds, primaryId });
    },
    [dispatch],
  );

  const handleClearSelection = useCallback((): void => {
    dispatch({ type: "CLEAR_SHAPE_SELECTION" });
  }, [dispatch]);

  const handleStartMove = useCallback(
    (startX: number, startY: number): void => {
      dispatch({ type: "START_MOVE", startX: px(startX), startY: px(startY) });
    },
    [dispatch],
  );

  const handleStartResize = useCallback(
    (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean): void => {
      dispatch({ type: "START_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked });
    },
    [dispatch],
  );

  const handleStartRotate = useCallback(
    (startX: number, startY: number): void => {
      dispatch({ type: "START_ROTATE", startX: px(startX), startY: px(startY) });
    },
    [dispatch],
  );

  // Shape callbacks
  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape): void => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [dispatch],
  );

  const handleGroup = useCallback(
    (shapeIds: readonly ShapeId[]): void => {
      dispatch({ type: "GROUP_SHAPES", shapeIds });
    },
    [dispatch],
  );

  const handleUngroup = useCallback(
    (shapeId: ShapeId): void => {
      dispatch({ type: "UNGROUP_SHAPE", shapeId });
    },
    [dispatch],
  );

  const handleMoveShape = useCallback(
    (shapeId: ShapeId, target: ShapeHierarchyTarget): void => {
      dispatch({ type: "MOVE_SHAPE_IN_HIERARCHY", shapeId, target });
    },
    [dispatch],
  );

  const handleUpdateShapes = useCallback(
    (shapeIds: readonly ShapeId[], updater: (shape: Shape) => Shape): void => {
      dispatch({
        type: "UPDATE_ACTIVE_SLIDE",
        updater: (slide) => {
          const nextShapes = shapeIds.reduce(
            (shapes, shapeId) => updateShapeById(shapes, shapeId, updater),
            slide.shapes,
          );
          return { ...slide, shapes: nextShapes };
        },
      });
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (shapeIds: readonly ShapeId[]): void => {
      dispatch({ type: "DELETE_SHAPES", shapeIds });
    },
    [dispatch],
  );

  const handleDuplicate = useCallback((): void => {
    dispatch({ type: "COPY" });
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const handleReorder = useCallback(
    (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward"): void => {
      dispatch({ type: "REORDER_SHAPE", shapeId, direction });
    },
    [dispatch],
  );

  // Slide callbacks
  const handleBackgroundChange = useCallback(
    (background: Background | undefined): void => {
      dispatch({
        type: "UPDATE_ACTIVE_SLIDE",
        updater: (slide) => ({ ...slide, background }),
      });
    },
    [dispatch],
  );

  const handleLayoutAttributesChange = useCallback(
    (attributes: SlideLayoutAttributes): void => {
      dispatch({
        type: "UPDATE_ACTIVE_SLIDE_ENTRY",
        updater: (entry) => {
          if (!entry.apiSlide || !entry.apiSlide.layout) {
            throw new Error("Layout attributes require slide layout data.");
          }
          const updatedLayout = applySlideLayoutAttributes(entry.apiSlide.layout, attributes);
          return {
            ...entry,
            apiSlide: { ...entry.apiSlide, layout: updatedLayout },
            slide: { ...entry.slide },
          };
        },
      });
    },
    [dispatch],
  );

  const handleLayoutChange = useCallback(
    (layoutTargetPath: string): void => {
      const presentationFile = document.presentationFile;
      if (!presentationFile) {
        throw new Error("Layout selection requires presentation file.");
      }
      dispatch({
        type: "UPDATE_ACTIVE_SLIDE_ENTRY",
        updater: (entry) => {
          if (!entry.apiSlide) {
            throw new Error("Layout selection requires API slide data.");
          }
          const bundle = loadSlideLayoutBundle(presentationFile, layoutTargetPath);
          const updatedApiSlide = {
            ...entry.apiSlide,
            layout: bundle.layout,
            layoutTables: bundle.layoutTables,
            layoutRelationships: bundle.layoutRelationships,
            master: bundle.master,
            masterTables: bundle.masterTables,
            masterTextStyles: bundle.masterTextStyles,
            masterRelationships: bundle.masterRelationships,
            theme: bundle.theme,
            themeRelationships: bundle.themeRelationships,
          };
          return {
            ...entry,
            apiSlide: updatedApiSlide,
            layoutPathOverride: layoutTargetPath,
            slide: { ...entry.slide },
          };
        },
      });
    },
    [dispatch, document.presentationFile],
  );

  const handleSlideSizeChange = useCallback(
    (slideSize: SlideSize): void => {
      dispatch({ type: "SET_SLIDE_SIZE", slideSize });
    },
    [dispatch],
  );

  return {
    canvas: {
      handleSelect,
      handleSelectMultiple,
      handleClearSelection,
      handleStartMove,
      handleStartResize,
      handleStartRotate,
    },
    shape: {
      handleShapeChange,
      handleGroup,
      handleUngroup,
      handleMoveShape,
      handleUpdateShapes,
      handleDelete,
      handleDuplicate,
      handleReorder,
    },
    slide: {
      handleBackgroundChange,
      handleLayoutAttributesChange,
      handleLayoutChange,
      handleSlideSizeChange,
    },
  };
}
