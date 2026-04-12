/**
 * @file Core drawing layer
 *
 * Wraps the DrawingOverlay component with the scroll-transform container
 * pattern used by both the editor and viewer.
 *
 * Context-free: all data is passed via props.
 */

import { useMemo } from "react";
import type { XlsxDrawing } from "@aurochs-office/xlsx/domain/drawing/types";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { SheetLayout } from "../selectors/sheet-layout";
import { DrawingOverlay, type DrawingPositionResolver } from "../drawing/DrawingOverlay";

export type CoreDrawingLayerProps = {
  /** Drawing data from the sheet */
  readonly drawing: XlsxDrawing | undefined;
  /** Sheet layout for computing anchor positions */
  readonly layout: SheetLayout;
  /** Resource store for resolving image data URLs */
  readonly resourceStore: ResourceStore | undefined;
  /** Current horizontal scroll offset in pixels */
  readonly scrollLeft: number;
  /** Current vertical scroll offset in pixels */
  readonly scrollTop: number;
};

/**
 * Create a DrawingPositionResolver from the SheetLayout.
 */
function createDrawingPositionResolver(layout: SheetLayout): DrawingPositionResolver {
  return {
    getColumnPositionPx: (col0: number) => layout.cols.getOffsetPx(col0),
    getRowPositionPx: (row0: number) => layout.rows.getOffsetPx(row0),
  };
}

/**
 * Renders sheet drawings (images, shapes, charts) with scroll-transform positioning.
 *
 * Returns null when no drawings exist.
 */
export function CoreDrawingLayer({
  drawing,
  layout,
  resourceStore,
  scrollLeft,
  scrollTop,
}: CoreDrawingLayerProps) {
  const positionResolver = useMemo(() => createDrawingPositionResolver(layout), [layout]);

  if (!drawing) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
        }}
      >
        <DrawingOverlay
          drawing={drawing}
          positionResolver={positionResolver}
          resourceStore={resourceStore}
        />
      </div>
    </div>
  );
}
