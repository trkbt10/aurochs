/**
 * @file SVG viewport hook
 *
 * Manages viewport transform state for pan/zoom interactions.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ViewportTransform, ViewportSize, SlideSize } from "../../pptx/render/svg-viewport";
import {
  INITIAL_VIEWPORT,
  getNextZoomValue,
  zoomTowardCursor,
  panViewport,
  clampViewport,
  createFittedViewport,
  screenToCanvasCoords,
} from "../../pptx/render/svg-viewport";

export type UseSvgViewportOptions = {
  /** Slide dimensions */
  readonly slideSize: SlideSize;
  /** Ruler thickness in pixels */
  readonly rulerThickness: number;
  /** External zoom value (for controlled mode) */
  readonly zoom?: number;
  /** Callback when zoom changes (for controlled mode) */
  readonly onZoomChange?: (zoom: number) => void;
  /** Whether to auto-center on mount */
  readonly autoCenter?: boolean;
};

export type UseSvgViewportResult = {
  /** Ref to attach to the SVG element */
  readonly svgRef: RefObject<SVGSVGElement | null>;
  /** Current viewport transform */
  readonly viewport: ViewportTransform;
  /** Current viewport size */
  readonly viewportSize: ViewportSize;
  /** Handler for wheel events (zoom) */
  readonly handleWheel: (e: WheelEvent) => void;
  /** Handler for pointer down (pan start) */
  readonly handlePanStart: (e: React.PointerEvent) => void;
  /** Handler for pointer move (pan move) */
  readonly handlePanMove: (e: PointerEvent) => void;
  /** Handler for pointer up (pan end) */
  readonly handlePanEnd: () => void;
  /** Whether currently panning */
  readonly isPanning: boolean;
  /** Center the viewport on the slide */
  readonly centerViewport: () => void;
  /** Fit the slide to the viewport */
  readonly fitToView: () => void;
  /** Set zoom level */
  readonly setZoom: (zoom: number) => void;
};

/**
 * Hook for managing SVG viewport pan/zoom state.
 */
export function useSvgViewport({
  slideSize,
  rulerThickness,
  zoom: externalZoom,
  onZoomChange,
  autoCenter = true,
}: UseSvgViewportOptions): UseSvgViewportResult {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<ViewportTransform>(INITIAL_VIEWPORT);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const hasCenteredRef = useRef(false);

  // Apply external zoom if controlled
  const effectiveViewport = useMemo(() => {
    if (externalZoom !== undefined) {
      return { ...viewport, scale: externalZoom };
    }
    return viewport;
  }, [viewport, externalZoom]);

  // Update viewport size on resize
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {return;}

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      setViewportSize((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(svg);
    updateSize();

    return () => observer.disconnect();
  }, []);

  // Auto-center on mount
  useLayoutEffect(() => {
    if (!autoCenter || hasCenteredRef.current) {return;}
    if (viewportSize.width === 0 || viewportSize.height === 0) {return;}

    const fitted = createFittedViewport(viewportSize, slideSize, rulerThickness);
    setViewport(fitted);

    if (externalZoom === undefined && onZoomChange) {
      onZoomChange(fitted.scale);
    }

    hasCenteredRef.current = true;
  }, [autoCenter, viewportSize, slideSize, rulerThickness, externalZoom, onZoomChange]);

  // Wheel handler for zoom and scroll-based panning
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const svg = svgRef.current;
      if (!svg) {return;}

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const zoomModifier = isMac ? e.metaKey : e.ctrlKey;

      if (zoomModifier) {
        // Zoom mode: Ctrl/Cmd + wheel
        e.preventDefault();

        const rect = svg.getBoundingClientRect();
        const cursorPos = screenToCanvasCoords(e.clientX, e.clientY, rect, rulerThickness);

        const currentScale = externalZoom ?? viewport.scale;
        const direction = e.deltaY < 0 ? "in" : "out";
        const newScale = getNextZoomValue(currentScale, direction);

        if (onZoomChange) {
          onZoomChange(newScale);
        }

        // Update viewport with zoom-toward-cursor
        setViewport((prev) => {
          const currentVp = externalZoom !== undefined ? { ...prev, scale: externalZoom } : prev;
          return zoomTowardCursor(currentVp, cursorPos.x, cursorPos.y, newScale);
        });
      } else {
        // Pan mode: scroll for vertical, Shift+scroll for horizontal
        e.preventDefault();

        // Shift swaps the delta direction (horizontal scroll)
        const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
        const dy = e.shiftKey ? -e.deltaX : -e.deltaY;

        setViewport((prev) => {
          const panned = panViewport(prev, dx, dy);
          return clampViewport(panned, viewportSize, slideSize, rulerThickness);
        });
      }
    },
    [viewport.scale, externalZoom, onZoomChange, rulerThickness, viewportSize, slideSize]
  );

  // Pan handlers
  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
      // Middle-click or Alt+left-click to pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    []
  );

  const handlePanMove = useCallback(
    (e: PointerEvent) => {
      if (!isPanning) {return;}

      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      setViewport((prev) => {
        const panned = panViewport(prev, dx, dy);
        return clampViewport(panned, viewportSize, slideSize, rulerThickness);
      });
    },
    [isPanning, viewportSize, slideSize, rulerThickness]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Center viewport
  const centerViewport = useCallback(() => {
    const fitted = createFittedViewport(viewportSize, slideSize, rulerThickness);
    setViewport((prev) => ({
      translateX: fitted.translateX,
      translateY: fitted.translateY,
      scale: prev.scale,
    }));
  }, [viewportSize, slideSize, rulerThickness]);

  // Fit to view
  const fitToView = useCallback(() => {
    const fitted = createFittedViewport(viewportSize, slideSize, rulerThickness);
    setViewport(fitted);

    if (onZoomChange) {
      onZoomChange(fitted.scale);
    }
  }, [viewportSize, slideSize, rulerThickness, onZoomChange]);

  // Set zoom
  const setZoom = useCallback(
    (newZoom: number) => {
      if (onZoomChange) {
        onZoomChange(newZoom);
      } else {
        setViewport((prev) => ({ ...prev, scale: newZoom }));
      }
    },
    [onZoomChange]
  );

  return {
    svgRef,
    viewport: effectiveViewport,
    viewportSize,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    isPanning,
    centerViewport,
    fitToView,
    setZoom,
  };
}
