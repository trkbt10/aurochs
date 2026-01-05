/**
 * @file Canvas stage
 *
 * Handles canvas centering, rulers, scroll viewport, and wheel zoom.
 */

import { useMemo, useCallback, useLayoutEffect, forwardRef, type CSSProperties } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ShapeId } from "../../pptx/domain/types";
import type { DragState, SelectionState, ResizeHandlePosition } from "../state";
import type { CreationMode } from "../presentation/types";
import type { ResourceResolver, ResolvedBackgroundFill, RenderOptions } from "../../pptx/render/core/types";
import type { ColorContext, FontScheme } from "../../pptx/domain/resolution";
import { SlideCanvas } from "../slide/SlideCanvas";
import { TextEditController, isTextEditActive, type TextEditState } from "../slide/text-edit";
import type { ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { CanvasRulers } from "./CanvasRulers";
import { useCanvasViewport } from "./use-canvas-viewport";
import { getCanvasStageMetrics, getCenteredScrollTarget } from "./canvas-metrics";
import { getNextZoomValue } from "./canvas-controls";
import { useNonPassiveWheel } from "./use-non-passive-wheel";

export type CanvasStageProps = {
  readonly slide: Slide;
  readonly selection: SelectionState;
  readonly drag: DragState;
  readonly width: number;
  readonly height: number;
  readonly primaryShape: Shape | undefined;
  readonly selectedShapes: readonly Shape[];
  readonly contextMenuActions: ContextMenuActions;
  readonly colorContext?: ColorContext;
  readonly resources?: ResourceResolver;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly renderOptions?: Partial<RenderOptions>;
  readonly editingShapeId?: ShapeId;
  readonly layoutShapes?: readonly Shape[];
  readonly creationMode: CreationMode;
  readonly textEdit: TextEditState;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onDoubleClick: (shapeId: ShapeId) => void;
  readonly onCreate: (x: number, y: number) => void;
  readonly onTextEditComplete: (text: string) => void;
  readonly onTextEditCancel: () => void;
  readonly zoom: number;
  readonly onZoomChange: (value: number) => void;
  readonly showRulers: boolean;
  readonly rulerThickness: number;
};

const canvasAreaStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

/**
 * Canvas stage with rulers and scrolling.
 */
const PAN_MARGIN = 120;

export const CanvasStage = forwardRef<HTMLDivElement, CanvasStageProps>(function CanvasStage(
  {
    slide,
    selection,
    drag,
    width,
    height,
    primaryShape,
    selectedShapes,
    contextMenuActions,
    colorContext,
    resources,
    fontScheme,
    resolvedBackground,
    renderOptions,
    editingShapeId,
    layoutShapes,
    creationMode,
    textEdit,
    onSelect,
    onClearSelection,
    onStartMove,
    onStartResize,
    onStartRotate,
    onDoubleClick,
    onCreate,
    onTextEditComplete,
    onTextEditCancel,
    zoom,
    onZoomChange,
    showRulers,
    rulerThickness,
  }: CanvasStageProps,
  canvasRef
) {
  const { containerRef: scrollRef, viewport, handleScroll } = useCanvasViewport();

  const zoomedWidth = width * zoom;
  const zoomedHeight = height * zoom;
  const stageMetrics = useMemo(
    () =>
      getCanvasStageMetrics(
        {
          width: viewport.width,
          height: viewport.height,
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop,
        },
        zoomedWidth,
        zoomedHeight,
        PAN_MARGIN
      ),
    [viewport.width, viewport.height, zoomedWidth, zoomedHeight]
  );

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const target = getCenteredScrollTarget(viewport, stageMetrics);
    const nextLeft = Math.abs(container.scrollLeft - target.scrollLeft) > 1 ? target.scrollLeft : container.scrollLeft;
    const nextTop = Math.abs(container.scrollTop - target.scrollTop) > 1 ? target.scrollTop : container.scrollTop;
    const needsUpdate = nextLeft !== container.scrollLeft || nextTop !== container.scrollTop;

    if (nextLeft !== container.scrollLeft) {
      container.scrollLeft = nextLeft;
    }
    if (nextTop !== container.scrollTop) {
      container.scrollTop = nextTop;
    }
    if (needsUpdate) {
      handleScroll();
    }
  }, [viewport.width, viewport.height, stageMetrics, scrollRef, handleScroll, zoomedWidth, zoomedHeight]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const zoomModifier = isMac ? event.metaKey : event.ctrlKey;
      if (zoomModifier) {
        event.preventDefault();
        const direction = event.deltaY < 0 ? "in" : "out";
        onZoomChange(getNextZoomValue(zoom, direction));
        return;
      }

      if (event.shiftKey) {
        event.preventDefault();
        const container = scrollRef.current;
        if (!container) {
          return;
        }
        const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
        container.scrollLeft += delta;
      }
    },
    [zoom, onZoomChange, scrollRef]
  );

  useNonPassiveWheel(scrollRef, handleWheel);

  const scrollContainerStyle: CSSProperties = {
    position: "absolute",
    top: showRulers ? rulerThickness : 0,
    left: showRulers ? rulerThickness : 0,
    right: 0,
    bottom: 0,
    overflow: "auto",
  };

  const stageStyle: CSSProperties = {
    position: "relative",
    width: stageMetrics.stageWidth,
    height: stageMetrics.stageHeight,
  };

  const canvasWrapperStyle: CSSProperties = {
    position: "absolute",
    left: stageMetrics.canvasOffsetX,
    top: stageMetrics.canvasOffsetY,
    width: zoomedWidth,
    height: zoomedHeight,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
    backgroundColor: "white",
  };

  return (
    <div style={canvasAreaStyle}>
      <CanvasRulers
        showRulers={showRulers}
        viewport={viewport}
        zoom={zoom}
        slideWidth={width}
        slideHeight={height}
        stageMetrics={stageMetrics}
        rulerThickness={rulerThickness}
      />
      <div ref={scrollRef} style={scrollContainerStyle} onScroll={handleScroll}>
        <div style={stageStyle}>
          <div ref={canvasRef} style={canvasWrapperStyle}>
            <SlideCanvas
              slide={slide}
              selection={selection}
              drag={drag}
              width={width}
              height={height}
              primaryShape={primaryShape}
              selectedShapes={selectedShapes}
              contextMenuActions={contextMenuActions}
              colorContext={colorContext}
              resources={resources}
              fontScheme={fontScheme}
              resolvedBackground={resolvedBackground}
              renderOptions={renderOptions}
              editingShapeId={editingShapeId}
              layoutShapes={layoutShapes}
              onSelect={onSelect}
              onClearSelection={onClearSelection}
              onStartMove={onStartMove}
              onStartResize={onStartResize}
              onStartRotate={onStartRotate}
              onDoubleClick={onDoubleClick}
              creationMode={creationMode}
              onCreate={onCreate}
            />
            {isTextEditActive(textEdit) && (
              <TextEditController
                bounds={textEdit.bounds}
                textBody={textEdit.initialTextBody}
                colorContext={colorContext}
                fontScheme={fontScheme}
                slideWidth={width}
                slideHeight={height}
                onComplete={onTextEditComplete}
                onCancel={onTextEditCancel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
