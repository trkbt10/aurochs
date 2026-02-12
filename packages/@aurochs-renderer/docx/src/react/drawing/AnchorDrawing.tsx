/**
 * @file Anchor Drawing Component for DOCX
 *
 * Renders wp:anchor elements as SVG groups.
 * Anchor drawings are positioned absolutely relative to page, column, or paragraph.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.3 (wp:anchor)
 */

import { memo, useMemo } from "react";
import type { DocxAnchorDrawing } from "@aurochs-office/docx/domain/drawing";
import { emuToPx } from "@aurochs-office/docx/domain/ecma376-defaults";
import { Picture } from "./Picture";
import { WordprocessingShape } from "./WordprocessingShape";
import { ChartPlaceholder } from "./ChartPlaceholder";
import type { DocxResourceResolver } from "../context";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AnchorDrawing component.
 */
export type AnchorDrawingProps = {
  /** Anchor drawing data */
  readonly drawing: DocxAnchorDrawing;
  /** Computed X position in pixels (from layout) */
  readonly x: number;
  /** Computed Y position in pixels (from layout) */
  readonly y: number;
  /** Resource resolver for images */
  readonly resources: DocxResourceResolver;
  /** Unique ID prefix for clip paths */
  readonly idPrefix?: string;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Computes common data attributes for anchor drawing groups.
 */
function useAnchorDataAttributes(drawing: DocxAnchorDrawing) {
  return useMemo(() => {
    const effectExtent = drawing.effectExtent;
    return {
      "data-element-type": "anchor-drawing" as const,
      "data-doc-pr-id": drawing.docPr.id,
      "data-doc-pr-name": drawing.docPr.name,
      "data-behind-doc": drawing.behindDoc ?? false,
      "data-relative-height": drawing.relativeHeight ?? 0,
      "data-locked": drawing.locked ?? false,
      "data-simple-pos": drawing.simplePos ?? false,
      "data-allow-overlap": drawing.allowOverlap ?? true,
      // Effect extent in EMUs (for external processing if needed)
      ...(effectExtent !== undefined && {
        "data-effect-extent-l": effectExtent.l ?? 0,
        "data-effect-extent-t": effectExtent.t ?? 0,
        "data-effect-extent-r": effectExtent.r ?? 0,
        "data-effect-extent-b": effectExtent.b ?? 0,
      }),
    };
  }, [drawing]);
}

/**
 * Renders an anchor drawing (wp:anchor) as SVG group.
 */
function AnchorDrawingBase({ drawing, x, y, resources, idPrefix }: AnchorDrawingProps) {
  // Convert extent from EMUs to pixels
  const width = useMemo(() => emuToPx(drawing.extent.cx as number) as number, [drawing.extent.cx]);
  const height = useMemo(() => emuToPx(drawing.extent.cy as number) as number, [drawing.extent.cy]);

  // Compute common data attributes
  const dataAttributes = useAnchorDataAttributes(drawing);

  // Resolve image URL if this is a picture drawing
  const imageUrl = useMemo(() => {
    if (drawing.pic === undefined) {
      return undefined;
    }
    const rId = drawing.pic.blipFill?.blip?.rEmbed;
    if (rId === undefined) {
      return undefined;
    }
    return resources.resolve(rId as string);
  }, [drawing.pic, resources]);

  // Generate unique clip ID
  const clipId = useMemo(() => {
    const prefix = idPrefix ?? "anchor";
    const docPrId = drawing.docPr.id;
    return `${prefix}-${docPrId}`;
  }, [idPrefix, drawing.docPr.id]);

  // Render picture
  if (drawing.pic !== undefined) {
    return (
      <g transform={`translate(${x}, ${y})`} {...dataAttributes}>
        <Picture
          picture={drawing.pic}
          width={width}
          height={height}
          imageUrl={imageUrl}
          clipId={clipId}
        />
      </g>
    );
  }

  // Render WordprocessingML Shape
  if (drawing.wsp !== undefined) {
    return (
      <g transform={`translate(${x}, ${y})`} {...dataAttributes}>
        <WordprocessingShape
          shape={drawing.wsp}
          width={width}
          height={height}
          idPrefix={clipId}
        />
      </g>
    );
  }

  // Render Chart placeholder
  if (drawing.chart !== undefined) {
    return (
      <g transform={`translate(${x}, ${y})`} {...dataAttributes}>
        <ChartPlaceholder
          chart={drawing.chart}
          width={width}
          height={height}
        />
      </g>
    );
  }

  // Empty drawing (should not happen)
  return null;
}

/**
 * Memoized AnchorDrawing component.
 */
export const AnchorDrawing = memo(AnchorDrawingBase);
