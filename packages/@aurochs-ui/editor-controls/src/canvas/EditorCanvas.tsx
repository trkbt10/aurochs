/**
 * @file EditorCanvas - Shared SVG editor canvas with viewport management
 *
 * SoT for the editor canvas used by both pptx-editor and pdf-editor.
 * Manages viewport (pan/zoom), coordinate conversion, marquee selection,
 * selection box rendering, and global drag tracking.
 * Format-specific content is injected via children/contentSvg props.
 *
 * Key features:
 * - Internal viewport management (pan/zoom via wheel, middle-click, alt+click)
 * - EditorCanvasHandle via forwardRef for external coordinate conversion
 * - Item hit areas with per-item event dispatch (page coordinates)
 * - Canvas-level events for empty area interactions
 * - Built-in marquee selection with AABB intersection
 * - Selection box rendering computed from selectedIds + itemBounds + drag
 * - Optional global drag tracking for item move / resize / rotate
 * - SVG rulers (viewport-fixed)
 * - HTML viewport overlay for text editing, path tools, etc.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SelectionBox } from "./SelectionBox";
import { SvgRulers } from "./SvgRulers";
import { ViewportOverlay } from "./ViewportOverlay";
import { useSvgViewport } from "./use-svg-viewport";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import { applyDragPreview, getCombinedBoundsWithRotation } from "@aurochs-ui/editor-core/geometry";
import { getTransformString, screenToSlideCoords } from "@aurochs-ui/editor-core/viewport";
import type { ViewportTransform, ViewportSize } from "@aurochs-ui/editor-core/viewport";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type EditorCanvasItemBounds = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
};

/** Page coordinates computed by EditorCanvas from screen events. */
export type CanvasPageCoords = {
  readonly pageX: number;
  readonly pageY: number;
  readonly clientX: number;
  readonly clientY: number;
  /** Whether a modifier key (Shift/Meta/Ctrl) was held — used for additive selection. */
  readonly addToSelection: boolean;
  /** Whether a toggle modifier (Meta/Ctrl) was held — used for toggle selection. */
  readonly toggle: boolean;
};

/** Imperative handle for external access to canvas internals. */
export type EditorCanvasHandle = {
  /** Convert screen coordinates to page (slide) coordinates. */
  screenToPage(clientX: number, clientY: number): { pageX: number; pageY: number } | undefined;
  /** Current viewport transform. */
  readonly viewport: ViewportTransform;
  /** Current viewport size in pixels. */
  readonly viewportSize: ViewportSize;
};

/**
 * Drag state accepted by EditorCanvas for selection preview computation.
 * Passed to applyDragPreview() — any object with a `type` field works.
 * The "move"/"resize"/"rotate" types apply preview deltas; others are no-ops.
 */
export type EditorCanvasDrag = { readonly type: string };

export type EditorCanvasProps = {
  // --- Canvas dimensions (in page/logical units) ---
  readonly canvasWidth: number;
  readonly canvasHeight: number;

  // --- Viewport control ---
  readonly zoomMode: ZoomMode;
  readonly onZoomModeChange: (mode: ZoomMode) => void;
  readonly onDisplayZoomChange?: (zoom: number) => void;
  readonly onViewportChange?: (viewport: ViewportTransform) => void;

  // --- Rulers ---
  readonly showRulers?: boolean;
  readonly rulerThickness?: number;

  // --- Content ---
  /** React children rendered inside the viewport transform group (e.g., SlideRenderer). */
  readonly children?: ReactNode;
  /** SVG string to inject via dangerouslySetInnerHTML (outer <svg> tags are stripped). */
  readonly contentSvg?: string;
  /** Additional SVG overlay string. */
  readonly overlaySvg?: string;
  /** Embedded font CSS (@font-face declarations) injected as <style> in SVG. */
  readonly embeddedFontCss?: string;

  // --- Hit areas ---
  /** All items with bounds — used for hit areas AND as source for selectedBounds computation. */
  readonly itemBounds: readonly EditorCanvasItemBounds[];

  // --- Selection ---
  /** IDs of selected items. EditorCanvas computes selection boxes from itemBounds + drag preview. */
  readonly selectedIds: readonly string[];
  /** ID of the primary selected item (gets "primary" variant + handles in single-select). */
  readonly primaryId: string | undefined;
  /** Drag state for computing selection preview (passed to applyDragPreview). */
  readonly drag?: EditorCanvasDrag;
  /** Whether a drag/resize interaction is in progress (affects cursor). */
  readonly isInteracting?: boolean;
  /** Whether text editing is active (hides selection handles). */
  readonly isTextEditing?: boolean;
  /** Whether to show rotate handles on selection boxes (default: false). */
  readonly showRotateHandle?: boolean;

  // --- Item events (dispatched with page coordinates) ---
  readonly onItemPointerDown?: (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly onItemClick?: (id: string, coords: CanvasPageCoords, e: React.MouseEvent) => void;
  readonly onItemDoubleClick?: (id: string, coords: CanvasPageCoords, e: React.MouseEvent) => void;
  readonly onItemContextMenu?: (id: string, coords: CanvasPageCoords, e: React.MouseEvent) => void;

  // --- Canvas events (dispatched when clicking/pressing empty area) ---
  readonly onCanvasPointerDown?: (coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly onCanvasClick?: (coords: CanvasPageCoords, e: React.MouseEvent) => void;
  readonly onContextMenu?: (e: React.MouseEvent) => void;

  // --- Selection handle events ---
  readonly onResizeStart?: (handle: ResizeHandlePosition, coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly onRotateStart?: (coords: CanvasPageCoords, e: React.PointerEvent) => void;

  // --- Global drag tracking (optional) ---
  // When provided, EditorCanvas attaches global pointermove/pointerup listeners
  // after the corresponding interaction starts (item pointer down / resize / rotate).
  // This eliminates the need for wrappers to manage their own global listeners.
  readonly onItemDragMove?: (coords: CanvasPageCoords) => void;
  readonly onItemDragEnd?: (coords: CanvasPageCoords) => void;
  readonly onResizeDragMove?: (handle: ResizeHandlePosition, coords: CanvasPageCoords) => void;
  readonly onResizeDragEnd?: (handle: ResizeHandlePosition, coords: CanvasPageCoords) => void;
  readonly onRotateDragMove?: (coords: CanvasPageCoords) => void;
  readonly onRotateDragEnd?: (coords: CanvasPageCoords) => void;

  // --- Marquee selection ---
  /** Enable built-in marquee selection on canvas background drag (default: true). */
  readonly enableMarquee?: boolean;
  /**
   * Called when marquee drag completes.
   * EditorCanvas performs AABB intersection of the marquee rect against `itemBounds`
   * and returns both the intersecting item IDs and the raw rect.
   */
  readonly onMarqueeSelect?: (
    result: {
      readonly itemIds: readonly string[];
      readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    },
    additive: boolean,
  ) => void;

  // --- Viewport overlay (HTML content aligned with viewport transform) ---
  readonly viewportOverlay?: ReactNode;

  // --- Drag & drop (raw events, caller uses handle.screenToPage for coords) ---
  readonly onDragOver?: (e: React.DragEvent) => void;
  readonly onDrop?: (e: React.DragEvent) => void;

  // --- Styling ---
  /** Style for the canvas background rect (default: drop-shadow). */
  readonly canvasBgStyle?: CSSProperties;
  /** Override cursor (default: "grabbing" during pan/interact, else "default"). */
  readonly cursor?: string;
};

// =============================================================================
// Helpers
// =============================================================================

function extractSvgInnerContent(svgString: string): string {
  const openTagEnd = svgString.indexOf(">");
  if (openTagEnd === -1) return svgString;
  const closeTagStart = svgString.lastIndexOf("</svg>");
  if (closeTagStart === -1) return svgString;
  return svgString.slice(openTagEnd + 1, closeTagStart);
}

const DEFAULT_RULER_THICKNESS = 20;

function getRotationTransform(b: EditorCanvasItemBounds): string | undefined {
  if (!b.rotation) return undefined;
  return `rotate(${b.rotation}, ${b.x + b.width / 2}, ${b.y + b.height / 2})`;
}

type MarqueeState = {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly additive: boolean;
};

type ActiveTracking =
  | { readonly type: "item"; readonly id: string }
  | { readonly type: "resize"; readonly handle: ResizeHandlePosition }
  | { readonly type: "rotate" };

const IDLE_DRAG: EditorCanvasDrag = { type: "idle" };

// =============================================================================
// Component
// =============================================================================

/**
 * Shared SVG editor canvas with viewport management.
 *
 * Use `ref` to access {@link EditorCanvasHandle} for coordinate conversion
 * and viewport state from parent components.
 */
export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  {
    canvasWidth,
    canvasHeight,
    zoomMode,
    onZoomModeChange,
    onDisplayZoomChange,
    onViewportChange,
    showRulers = true,
    rulerThickness: rulerThicknessProp = DEFAULT_RULER_THICKNESS,
    children,
    contentSvg,
    overlaySvg,
    embeddedFontCss,
    itemBounds,
    selectedIds,
    primaryId,
    drag,
    isInteracting = false,
    isTextEditing = false,
    showRotateHandle = false,
    onItemPointerDown,
    onItemClick,
    onItemDoubleClick,
    onItemContextMenu,
    onCanvasPointerDown,
    onCanvasClick,
    onContextMenu,
    onResizeStart,
    onRotateStart,
    onItemDragMove,
    onItemDragEnd,
    onResizeDragMove,
    onResizeDragEnd,
    onRotateDragMove,
    onRotateDragEnd,
    enableMarquee = true,
    onMarqueeSelect,
    viewportOverlay,
    onDragOver,
    onDrop,
    canvasBgStyle = defaultCanvasBgStyle,
    cursor,
  },
  ref,
) {
  const rulerThickness = showRulers ? rulerThicknessProp : 0;
  const slideSize = useMemo(() => ({ width: canvasWidth, height: canvasHeight }), [canvasWidth, canvasHeight]);

  // --- Viewport management ---
  const {
    svgRef,
    viewport,
    viewportSize,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    isPanning,
  } = useSvgViewport({
    slideSize,
    rulerThickness,
    zoomMode,
    onZoomModeChange,
    onDisplayZoomChange,
  });

  // Notify parent of viewport changes
  useEffect(() => {
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  // Register wheel handler (non-passive for preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [svgRef, handleWheel]);

  // --- Coordinate conversion ---
  const screenToPage = useCallback(
    (clientX: number, clientY: number): { pageX: number; pageY: number } | undefined => {
      const svg = svgRef.current;
      if (!svg) return undefined;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return undefined;
      const result = screenToSlideCoords({ clientX, clientY, svgRect: rect, viewport, rulerThickness });
      return { pageX: result.x, pageY: result.y };
    },
    [svgRef, viewport, rulerThickness],
  );

  // --- Imperative handle ---
  useImperativeHandle(
    ref,
    () => ({
      screenToPage,
      get viewport() {
        return viewport;
      },
      get viewportSize() {
        return viewportSize;
      },
    }),
    [screenToPage, viewport, viewportSize],
  );

  // --- Internal state ---
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const ignoreNextClickRef = useRef(false);
  const [activeTracking, setActiveTracking] = useState<ActiveTracking | null>(null);

  // Content extraction
  const innerContent = useMemo(
    () => (contentSvg ? extractSvgInnerContent(contentSvg) : undefined),
    [contentSvg],
  );

  // --- Compute selectedBounds from itemBounds + selectedIds + drag ---
  const selectedBounds = useMemo(() => {
    const dragState = drag ?? IDLE_DRAG;
    const result: EditorCanvasItemBounds[] = [];
    for (const id of selectedIds) {
      const b = itemBounds.find((ib) => ib.id === id);
      if (!b) continue;
      const preview = applyDragPreview(id, { ...b, rotation: b.rotation ?? 0 }, dragState);
      result.push({ id, x: preview.x, y: preview.y, width: preview.width, height: preview.height, rotation: preview.rotation });
    }
    return result;
  }, [selectedIds, itemBounds, drag]);

  // --- Compute multi-selection combined bounds ---
  const multiSelectionBounds = useMemo(() => {
    if (selectedBounds.length <= 1) return undefined;
    return getCombinedBoundsWithRotation(selectedBounds.map((b) => ({ ...b, rotation: b.rotation ?? 0 })));
  }, [selectedBounds]);

  const hasMultiSelection = multiSelectionBounds != null;

  // --- Helper: make CanvasPageCoords from event ---
  const makeCoordsFromEvent = useCallback(
    (e: { clientX: number; clientY: number; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): CanvasPageCoords | undefined => {
      const page = screenToPage(e.clientX, e.clientY);
      if (!page) return undefined;
      return {
        ...page,
        clientX: e.clientX,
        clientY: e.clientY,
        addToSelection: e.shiftKey || e.metaKey || e.ctrlKey,
        toggle: e.metaKey || e.ctrlKey,
      };
    },
    [screenToPage],
  );

  // --- Item event handlers ---
  const handleItemPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (!onItemPointerDown) return;
      e.stopPropagation();
      const coords = makeCoordsFromEvent(e);
      if (!coords) return;
      onItemPointerDown(id, coords, e);

      // Start global drag tracking if callbacks provided
      if (onItemDragMove) {
        setActiveTracking({ type: "item", id });
      }
    },
    [onItemPointerDown, onItemDragMove, makeCoordsFromEvent],
  );

  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (!onItemClick) return;
      e.stopPropagation();
      const coords = makeCoordsFromEvent(e);
      if (coords) onItemClick(id, coords, e);
    },
    [onItemClick, makeCoordsFromEvent],
  );

  const handleItemDoubleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (!onItemDoubleClick) return;
      e.stopPropagation();
      e.preventDefault();
      const coords = makeCoordsFromEvent(e);
      if (coords) onItemDoubleClick(id, coords, e);
    },
    [onItemDoubleClick, makeCoordsFromEvent],
  );

  const handleItemContextMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (!onItemContextMenu) return;
      e.preventDefault();
      e.stopPropagation();
      const coords = makeCoordsFromEvent(e);
      if (coords) onItemContextMenu(id, coords, e);
    },
    [onItemContextMenu, makeCoordsFromEvent],
  );

  // --- Selection handle events ---
  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      e.stopPropagation();
      if (!onResizeStart) return;
      const coords = makeCoordsFromEvent(e);
      if (!coords) return;
      onResizeStart(handle, coords, e);

      // Start global drag tracking if callbacks provided
      if (onResizeDragMove) {
        setActiveTracking({ type: "resize", handle });
      }
    },
    [onResizeStart, onResizeDragMove, makeCoordsFromEvent],
  );

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (!onRotateStart) return;
      const coords = makeCoordsFromEvent(e);
      if (!coords) return;
      onRotateStart(coords, e);

      // Start global drag tracking if callbacks provided
      if (onRotateDragMove) {
        setActiveTracking({ type: "rotate" });
      }
    },
    [onRotateStart, onRotateDragMove, makeCoordsFromEvent],
  );

  // --- Canvas-level events ---
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) return;
      if (!onCanvasClick) return;
      const coords = makeCoordsFromEvent(e);
      if (coords) onCanvasClick(coords, e);
    },
    [onCanvasClick, makeCoordsFromEvent],
  );

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Pan gesture: middle-click or alt+left-click
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        handlePanStart(e);
        return;
      }

      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) return;

      const coords = makeCoordsFromEvent(e);
      if (!coords) return;

      // Notify canvas pointer down (caller may call e.preventDefault() to suppress marquee)
      onCanvasPointerDown?.(coords, e);

      // Start marquee if enabled and not prevented by caller
      if (enableMarquee && onMarqueeSelect && !e.defaultPrevented) {
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        const next: MarqueeState = {
          startX: coords.pageX,
          startY: coords.pageY,
          currentX: coords.pageX,
          currentY: coords.pageY,
          additive,
        };
        marqueeRef.current = next;
        setMarquee(next);
        ignoreNextClickRef.current = false;
        e.preventDefault();
      }
    },
    [handlePanStart, makeCoordsFromEvent, onCanvasPointerDown, enableMarquee, onMarqueeSelect],
  );

  // --- Marquee finalization ---
  const finalizeMarquee = useCallback(
    (m: MarqueeState) => {
      const dx = Math.abs(m.currentX - m.startX);
      const dy = Math.abs(m.currentY - m.startY);
      if (dx <= 2 && dy <= 2) return;

      ignoreNextClickRef.current = true;

      const rect = {
        x: Math.min(m.startX, m.currentX),
        y: Math.min(m.startY, m.currentY),
        width: Math.abs(m.currentX - m.startX),
        height: Math.abs(m.currentY - m.startY),
      };

      // AABB intersection: find items overlapping the marquee rect
      const rectRight = rect.x + rect.width;
      const rectBottom = rect.y + rect.height;
      const itemIds = itemBounds
        .filter((b) => {
          const bRight = b.x + b.width;
          const bBottom = b.y + b.height;
          return bRight >= rect.x && b.x <= rectRight && bBottom >= rect.y && b.y <= rectBottom;
        })
        .map((b) => b.id);

      onMarqueeSelect?.({ itemIds, rect }, m.additive);
    },
    [onMarqueeSelect, itemBounds],
  );

  // --- Global pointer listeners: pan + marquee ---
  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      if (isPanning) {
        handlePanMove(e);
        return;
      }

      const current = marqueeRef.current;
      if (current) {
        const page = screenToPage(e.clientX, e.clientY);
        if (page) {
          const next: MarqueeState = { ...current, currentX: page.pageX, currentY: page.pageY };
          marqueeRef.current = next;
          setMarquee(next);
        }
      }
    },
    [isPanning, handlePanMove, screenToPage],
  );

  const handleWindowPointerUp = useCallback(() => {
    if (isPanning) {
      handlePanEnd();
      return;
    }

    const current = marqueeRef.current;
    if (current) {
      marqueeRef.current = null;
      setMarquee(null);
      finalizeMarquee(current);
    }
  }, [isPanning, handlePanEnd, finalizeMarquee]);

  useEffect(() => {
    if (!marquee && !isPanning) return;

    const handleCancel = () => {
      marqueeRef.current = null;
      setMarquee(null);
      handlePanEnd();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp, { once: true });
    window.addEventListener("pointercancel", handleCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [marquee, isPanning, handleWindowPointerMove, handleWindowPointerUp, handlePanEnd]);

  // --- Global pointer listeners: item / resize / rotate drag tracking ---
  useEffect(() => {
    if (!activeTracking) return;

    const handleMove = (e: PointerEvent) => {
      const coords = makeCoordsFromEvent(e);
      if (!coords) return;
      switch (activeTracking.type) {
        case "item":
          onItemDragMove?.(coords);
          break;
        case "resize":
          onResizeDragMove?.(activeTracking.handle, coords);
          break;
        case "rotate":
          onRotateDragMove?.(coords);
          break;
      }
    };

    const handleUp = (e: PointerEvent) => {
      const coords = makeCoordsFromEvent(e);
      setActiveTracking(null);
      if (!coords) return;
      switch (activeTracking.type) {
        case "item":
          onItemDragEnd?.(coords);
          break;
        case "resize":
          onResizeDragEnd?.(activeTracking.handle, coords);
          break;
        case "rotate":
          onRotateDragEnd?.(coords);
          break;
      }
    };

    const handleCancel = () => {
      setActiveTracking(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [activeTracking, makeCoordsFromEvent, onItemDragMove, onItemDragEnd, onResizeDragMove, onResizeDragEnd, onRotateDragMove, onRotateDragEnd]);

  // --- Marquee rect for rendering ---
  const marqueeRect = useMemo(() => {
    if (!marquee) return null;
    return {
      x: Math.min(marquee.startX, marquee.currentX),
      y: Math.min(marquee.startY, marquee.currentY),
      width: Math.abs(marquee.currentX - marquee.startX),
      height: Math.abs(marquee.currentY - marquee.startY),
    };
  }, [marquee]);

  // --- SVG styles ---
  const svgStyle: CSSProperties = useMemo(
    () => ({
      display: "block",
      width: "100%",
      height: "100%",
      cursor: cursor ?? (isPanning || isInteracting ? "grabbing" : "default"),
      backgroundColor: colorTokens.background.tertiary,
    }),
    [cursor, isPanning, isInteracting],
  );

  return (
    <div style={outerContainerStyle} onContextMenu={onContextMenu}>
      <svg
        ref={svgRef}
        style={svgStyle}
        onClick={handleSvgClick}
        onPointerDown={handleSvgPointerDown}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {embeddedFontCss && <style type="text/css">{embeddedFontCss}</style>}

        {/* Canvas viewport group with ruler offset + pan/zoom transform */}
        <g transform={`translate(${rulerThickness}, ${rulerThickness})`}>
          <g transform={getTransformString(viewport)}>
            {/* Canvas background */}
            <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="white" style={canvasBgStyle} />

            {/* Content: React children (e.g., SlideRenderer) */}
            {children}

            {/* Content: SVG string injection */}
            {innerContent != null && <g dangerouslySetInnerHTML={{ __html: innerContent }} />}
            {overlaySvg && <g dangerouslySetInnerHTML={{ __html: overlaySvg }} />}

            {/* Hit areas for items */}
            {itemBounds.map((b) => (
              <g key={`hit-${b.id}`} transform={getRotationTransform(b)}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={Math.max(b.width, 1)}
                  height={Math.max(b.height, 1)}
                  fill="transparent"
                  style={hitAreaStyle}
                  onClick={(e) => handleItemClick(b.id, e)}
                  onDoubleClick={(e) => handleItemDoubleClick(b.id, e)}
                  onPointerDown={(e) => handleItemPointerDown(b.id, e)}
                  onContextMenu={(e) => handleItemContextMenu(b.id, e)}
                  data-shape-id={b.id}
                />
              </g>
            ))}

            {/* Selection boxes (computed from selectedIds + itemBounds + drag) */}
            <g style={selectionGroupStyle}>
              {selectedBounds.map((bounds) => (
                <SelectionBox
                  key={bounds.id}
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.width}
                  height={bounds.height}
                  rotation={bounds.rotation}
                  variant={hasMultiSelection ? "primary" : primaryId === bounds.id ? "primary" : "secondary"}
                  showResizeHandles={!isTextEditing && !hasMultiSelection && primaryId === bounds.id}
                  showRotateHandle={!isTextEditing && showRotateHandle && !hasMultiSelection && primaryId === bounds.id}
                  onResizeStart={handleResizeStart}
                  onRotateStart={handleRotateStart}
                />
              ))}

              {/* Multi-selection combined bounds */}
              {!isTextEditing && multiSelectionBounds && (
                <SelectionBox
                  x={multiSelectionBounds.x}
                  y={multiSelectionBounds.y}
                  width={multiSelectionBounds.width}
                  height={multiSelectionBounds.height}
                  variant="multi"
                  showRotateHandle={showRotateHandle}
                  onResizeStart={handleResizeStart}
                  onRotateStart={handleRotateStart}
                />
              )}
            </g>

            {/* Marquee selection rect */}
            {marqueeRect && (
              <rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.width}
                height={marqueeRect.height}
                fill={colorTokens.selection.primary}
                fillOpacity={0.12}
                stroke={colorTokens.selection.primary}
                strokeWidth={1 / viewport.scale}
                pointerEvents="none"
              />
            )}

            {/* Canvas boundary */}
            <rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="none"
              stroke="rgba(128, 128, 128, 0.5)"
              strokeWidth={1 / viewport.scale}
              pointerEvents="none"
            />
          </g>
        </g>

        {/* Rulers (viewport-fixed, rendered on top) */}
        <SvgRulers
          viewport={viewport}
          viewportSize={viewportSize}
          slideSize={slideSize}
          rulerThickness={rulerThicknessProp}
          visible={showRulers}
        />
      </svg>

      {/* Viewport overlay (HTML content aligned with canvas transform) */}
      {viewportOverlay && (
        <ViewportOverlay
          viewport={viewport}
          viewportSize={viewportSize}
          slideWidth={canvasWidth}
          slideHeight={canvasHeight}
          rulerThickness={rulerThickness}
        >
          {viewportOverlay}
        </ViewportOverlay>
      )}
    </div>
  );
});

// =============================================================================
// Styles
// =============================================================================

const outerContainerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const hitAreaStyle: CSSProperties = { cursor: "pointer" };
const selectionGroupStyle: CSSProperties = { pointerEvents: "auto" };
const defaultCanvasBgStyle: CSSProperties = { filter: "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.4))" };
