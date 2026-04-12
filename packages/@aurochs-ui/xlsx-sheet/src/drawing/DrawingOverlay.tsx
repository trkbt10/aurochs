/**
 * @file Drawing Overlay (Source of Truth)
 *
 * Shared React component for rendering XLSX drawings (images, shapes, charts)
 * as an overlay on top of the cell grid.
 *
 * This component is the Single Source of Truth for drawing rendering,
 * consumed by both the editor (XlsxSheetGridLayers) and viewer (ReadonlySheetGrid)
 * to prevent implementation/appearance divergence.
 *
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawings)
 */

import { useMemo, type CSSProperties } from "react";
import type {
  XlsxDrawing,
  XlsxDrawingAnchor,
  XlsxDrawingContent,
  XlsxPicture,
  XlsxShape,
  XlsxChartFrame,
  XlsxGroupShape,
  XlsxCellAnchorOffset,
} from "@aurochs-office/xlsx/domain/drawing/types";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved pixel bounds for a drawing element.
 */
type DrawingBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Provides pixel positions for columns and rows.
 *
 * Abstracts over different SheetLayout implementations (editor vs SVG renderer)
 * so this component can be used in both contexts.
 */
export type DrawingPositionResolver = {
  /** Get pixel X position at a column boundary (0-based column index). */
  readonly getColumnPositionPx: (col0: number) => number;
  /** Get pixel Y position at a row boundary (0-based row index). */
  readonly getRowPositionPx: (row0: number) => number;
};

export type DrawingOverlayProps = {
  /** Drawing data containing anchors and content */
  readonly drawing: XlsxDrawing | undefined;
  /** Position resolver for converting cell anchors to pixels */
  readonly positionResolver: DrawingPositionResolver;
  /** Resource store for resolving image data URLs */
  readonly resourceStore: ResourceStore | undefined;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * EMUs (English Metric Units) per inch.
 * @see ECMA-376 Part 1, Section 20.1.2.1
 */
const EMU_PER_INCH = 914400;

/** Default screen DPI */
const PIXELS_PER_INCH = 96;

// =============================================================================
// Layout Calculation
// =============================================================================

function emuToPixels(emu: number): number {
  return (emu / EMU_PER_INCH) * PIXELS_PER_INCH;
}

function getCellAnchorPosition(
  anchor: XlsxCellAnchorOffset,
  resolver: DrawingPositionResolver,
): { x: number; y: number } {
  const x = resolver.getColumnPositionPx(anchor.col as number) + emuToPixels(anchor.colOff);
  const y = resolver.getRowPositionPx(anchor.row as number) + emuToPixels(anchor.rowOff);
  return { x, y };
}

function calculateBounds(
  anchor: XlsxDrawingAnchor,
  resolver: DrawingPositionResolver,
): DrawingBounds {
  switch (anchor.type) {
    case "twoCellAnchor": {
      const from = getCellAnchorPosition(anchor.from, resolver);
      const to = getCellAnchorPosition(anchor.to, resolver);
      return {
        x: from.x,
        y: from.y,
        width: Math.max(0, to.x - from.x),
        height: Math.max(0, to.y - from.y),
      };
    }
    case "oneCellAnchor": {
      const from = getCellAnchorPosition(anchor.from, resolver);
      return {
        x: from.x,
        y: from.y,
        width: emuToPixels(anchor.ext.cx),
        height: emuToPixels(anchor.ext.cy),
      };
    }
    case "absoluteAnchor": {
      return {
        x: emuToPixels(anchor.pos.x),
        y: emuToPixels(anchor.pos.y),
        width: emuToPixels(anchor.ext.cx),
        height: emuToPixels(anchor.ext.cy),
      };
    }
  }
}

// =============================================================================
// Styles
// =============================================================================

function createBoundsStyle(bounds: DrawingBounds): CSSProperties {
  return {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    pointerEvents: "none",
  };
}

const placeholderStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f0f0f0",
  border: "1px solid #ccc",
  fontSize: 10,
  color: "#999",
  overflow: "hidden",
};

// =============================================================================
// Content Renderers
// =============================================================================

function PictureContent({
  picture,
  bounds,
  resourceStore,
}: {
  readonly picture: XlsxPicture;
  readonly bounds: DrawingBounds;
  readonly resourceStore: ResourceStore | undefined;
}) {
  const href = useMemo(() => {
    // Prefer imagePath (direct path), then resolve via ResourceStore
    if (picture.imagePath && resourceStore) {
      // imagePath is set but ResourceStore keyed by relId
      // Try relId first in ResourceStore
      if (picture.blipRelId) {
        return resourceStore.toDataUrl(picture.blipRelId);
      }
    }
    if (picture.blipRelId && resourceStore) {
      return resourceStore.toDataUrl(picture.blipRelId);
    }
    return undefined;
  }, [picture.blipRelId, picture.imagePath, resourceStore]);

  if (!href) {
    return (
      <div style={createBoundsStyle(bounds)}>
        <div style={placeholderStyle}>
          {picture.nvPicPr.name || "Image"}
        </div>
      </div>
    );
  }

  return (
    <div style={createBoundsStyle(bounds)}>
      <img
        src={href}
        alt={picture.nvPicPr.descr ?? picture.nvPicPr.name ?? ""}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
        }}
        draggable={false}
      />
    </div>
  );
}

function ShapeContent({
  shape,
  bounds,
}: {
  readonly shape: XlsxShape;
  readonly bounds: DrawingBounds;
}) {
  return (
    <div style={createBoundsStyle(bounds)}>
      <div style={placeholderStyle}>
        {shape.txBody ?? shape.nvSpPr.name ?? shape.prstGeom ?? "Shape"}
      </div>
    </div>
  );
}

function ChartContent({
  chartFrame,
  bounds,
}: {
  readonly chartFrame: XlsxChartFrame;
  readonly bounds: DrawingBounds;
}) {
  return (
    <div style={createBoundsStyle(bounds)}>
      <div style={placeholderStyle}>
        {chartFrame.nvGraphicFramePr.name ?? "Chart"}
      </div>
    </div>
  );
}

function GroupContent({
  group,
  bounds,
  positionResolver,
  resourceStore,
}: {
  readonly group: XlsxGroupShape;
  readonly bounds: DrawingBounds;
  readonly positionResolver: DrawingPositionResolver;
  readonly resourceStore: ResourceStore | undefined;
}) {
  // Group shapes contain children with their own positioning.
  // For simplicity, render the group container and let children
  // render within the group's bounds using a transform.
  return (
    <div style={createBoundsStyle(bounds)}>
      {group.children.map((child, idx) => (
        <DrawingContentRenderer
          key={idx}
          content={child}
          bounds={bounds}
          positionResolver={positionResolver}
          resourceStore={resourceStore}
        />
      ))}
    </div>
  );
}

function DrawingContentRenderer({
  content,
  bounds,
  positionResolver,
  resourceStore,
}: {
  readonly content: XlsxDrawingContent;
  readonly bounds: DrawingBounds;
  readonly positionResolver: DrawingPositionResolver;
  readonly resourceStore: ResourceStore | undefined;
}) {
  switch (content.type) {
    case "picture":
      return <PictureContent picture={content} bounds={bounds} resourceStore={resourceStore} />;
    case "shape":
      return <ShapeContent shape={content} bounds={bounds} />;
    case "chartFrame":
      return <ChartContent chartFrame={content} bounds={bounds} />;
    case "groupShape":
      return (
        <GroupContent
          group={content}
          bounds={bounds}
          positionResolver={positionResolver}
          resourceStore={resourceStore}
        />
      );
    case "connectionShape":
      // Connection shapes (connectors) are not rendered for now
      return null;
    default:
      return null;
  }
}

// =============================================================================
// Main Component
// =============================================================================

function AnchorRenderer({
  anchor,
  positionResolver,
  resourceStore,
}: {
  readonly anchor: XlsxDrawingAnchor;
  readonly positionResolver: DrawingPositionResolver;
  readonly resourceStore: ResourceStore | undefined;
}) {
  if (!anchor.content) {
    return null;
  }

  const bounds = calculateBounds(anchor, positionResolver);

  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  return (
    <DrawingContentRenderer
      content={anchor.content}
      bounds={bounds}
      positionResolver={positionResolver}
      resourceStore={resourceStore}
    />
  );
}

/**
 * Renders XLSX drawings as an absolutely positioned overlay.
 *
 * This is the Source of Truth component for drawing rendering.
 * Both the editor (XlsxSheetGridLayers) and viewer (ReadonlySheetGrid)
 * consume this component to ensure identical rendering behavior.
 *
 * The component renders into the coordinate space of the cell grid
 * (not the viewport). The parent is expected to handle scroll offsets
 * and clipping.
 */
export function DrawingOverlay({
  drawing,
  positionResolver,
  resourceStore,
}: DrawingOverlayProps) {
  if (!drawing || drawing.anchors.length === 0) {
    return null;
  }

  return (
    <>
      {drawing.anchors.map((anchor, idx) => (
        <AnchorRenderer
          key={idx}
          anchor={anchor}
          positionResolver={positionResolver}
          resourceStore={resourceStore}
        />
      ))}
    </>
  );
}
