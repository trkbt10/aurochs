/**
 * @file Canvas stage
 *
 * Handles canvas centering, rulers, scroll viewport, and wheel zoom.
 */

import { useMemo, useCallback, useLayoutEffect, useEffect, useState, useRef, forwardRef, type CSSProperties } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ShapeId, Pixels } from "../../pptx/domain/types";
import type { SlideId } from "../../pptx/app";
import type { DrawingPath } from "../path-tools/types";
import type { DragState, SelectionState, ResizeHandlePosition, PathEditState } from "../context/slide/state";
import type { CreationMode } from "../context/presentation/editor/types";
import type { ResourceResolver, ResolvedBackgroundFill, RenderOptions } from "../../pptx/render/core/types";
import type { ColorContext, FontScheme } from "../../pptx/domain/resolution";
import { SlideCanvas } from "../slide/SlideCanvas";
import { TextEditController, isTextEditActive, type TextEditState } from "../slide/text-edit";
import type { ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { CanvasRulers } from "./CanvasRulers";
import { useCanvasViewport } from "./use-canvas-viewport";
import { getAutoCenterScroll, getCanvasStageMetrics } from "./canvas-metrics";
import { getNextZoomValue } from "./canvas-controls";
import { useNonPassiveWheel } from "./use-non-passive-wheel";
import { useOutsideMarqueeSelection } from "./use-outside-marquee-selection";

export type CanvasStageProps = {
  readonly slide: Slide;
  readonly slideId: SlideId;
  readonly selection: SelectionState;
  readonly drag: DragState;
  readonly width: Pixels;
  readonly height: Pixels;
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
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[]) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onDoubleClick: (shapeId: ShapeId) => void;
  readonly onCreate: (x: number, y: number) => void;
  readonly onTextEditComplete: (text: string) => void;
  readonly onTextEditCancel: () => void;
  readonly onPathCommit?: (path: DrawingPath) => void;
  readonly onPathCancel?: () => void;
  readonly pathEdit?: PathEditState;
  readonly onPathEditCommit?: (path: DrawingPath, shapeId: ShapeId) => void;
  readonly onPathEditCancel?: () => void;
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
    slideId,
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
    onSelectMultiple,
    onClearSelection,
    onStartMove,
    onStartResize,
    onStartRotate,
    onDoubleClick,
    onCreate,
    onTextEditComplete,
    onTextEditCancel,
    onPathCommit,
    onPathCancel,
    pathEdit,
    onPathEditCommit,
    onPathEditCancel,
    zoom,
    onZoomChange,
    showRulers,
    rulerThickness,
  }: CanvasStageProps,
  canvasRef
) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const { containerRef: scrollRef, viewport, handleScroll } = useCanvasViewport();
  const [zoomModifierDown, setZoomModifierDown] = useState(false);
  const hasCenteredRef = useRef(false);
  const lastSlideIdRef = useRef<SlideId | null>(null);

  const widthNum = width as number;
  const heightNum = height as number;
  const zoomedWidth = widthNum * zoom;
  const zoomedHeight = heightNum * zoom;
  const stageMetrics = useMemo(
    () =>
      getCanvasStageMetrics(
        {
          width: viewport.width,
          height: viewport.height,
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

    if (lastSlideIdRef.current !== slideId) {
      lastSlideIdRef.current = slideId;
      hasCenteredRef.current = false;
    }

    if (hasCenteredRef.current) {
      return;
    }

    const nextScroll = getAutoCenterScroll(
      viewport,
      stageMetrics,
      container.scrollLeft,
      container.scrollTop
    );

    if (nextScroll.scrollLeft !== container.scrollLeft) {
      container.scrollLeft = nextScroll.scrollLeft;
    }
    if (nextScroll.scrollTop !== container.scrollTop) {
      container.scrollTop = nextScroll.scrollTop;
    }
    if (nextScroll.didCenter) {
      handleScroll();
    }

    hasCenteredRef.current = true;
  }, [viewport.width, viewport.height, stageMetrics, scrollRef, handleScroll, zoomedWidth, zoomedHeight, slideId]);

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const handleKeyDown = (event: KeyboardEvent) => {
      const zoomModifier = isMac ? event.metaKey : event.ctrlKey;
      if (zoomModifier) {
        setZoomModifierDown(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const zoomModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!zoomModifier) {
        setZoomModifierDown(false);
      }
    };
    const handleBlur = () => {
      setZoomModifierDown(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? "in" : "out";
      onZoomChange(getNextZoomValue(zoom, direction));
    },
    [zoom, onZoomChange]
  );

  useNonPassiveWheel(scrollRef, handleWheel, zoomModifierDown);

  const { marqueeStyle: outsideMarqueeStyle, onPointerDown: handleStagePointerDown } = useOutsideMarqueeSelection({
    enabled: creationMode.type === "select",
    containerRef: scrollRef,
    canvasWrapperRef,
    slideWidth: widthNum,
    slideHeight: heightNum,
    shapes: slide.shapes,
    selection,
    onClearSelection,
    onSelectMultiple,
  });

  const handleCanvasWrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      canvasWrapperRef.current = node;
      if (!canvasRef) {
        return;
      }
      if (typeof canvasRef === "function") {
        canvasRef(node);
        return;
      }
      canvasRef.current = node;
    },
    [canvasRef]
  );

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
        slideWidth={widthNum}
        slideHeight={heightNum}
        stageMetrics={stageMetrics}
        rulerThickness={rulerThickness}
        scrollRef={scrollRef}
      />
      <div ref={scrollRef} style={scrollContainerStyle} onScroll={handleScroll} onPointerDown={handleStagePointerDown}>
        {outsideMarqueeStyle && <div style={outsideMarqueeStyle} />}
        <div style={stageStyle}>
          <div ref={handleCanvasWrapperRef} style={canvasWrapperStyle}>
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
              onSelectMultiple={onSelectMultiple}
              onClearSelection={onClearSelection}
              onStartMove={onStartMove}
              onStartResize={onStartResize}
              onStartRotate={onStartRotate}
              onDoubleClick={onDoubleClick}
              creationMode={creationMode}
              onCreate={onCreate}
              onPathCommit={onPathCommit}
              onPathCancel={onPathCancel}
              pathEdit={pathEdit}
              onPathEditCommit={onPathEditCommit}
              onPathEditCancel={onPathEditCancel}
            />
            {isTextEditActive(textEdit) && (
              <TextEditController
                bounds={textEdit.bounds}
                textBody={textEdit.initialTextBody}
                colorContext={colorContext}
                fontScheme={fontScheme}
                slideWidth={widthNum}
                slideHeight={heightNum}
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
