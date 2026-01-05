/**
 * @file Canvas rulers overlay
 *
 * Positions rulers relative to the centered canvas.
 */

import type { CSSProperties } from "react";
import { SlideRuler } from "../slide/SlideRuler";
import type { CanvasViewport } from "./use-canvas-viewport";
import type { CanvasStageMetrics } from "./canvas-metrics";

export type CanvasRulersProps = {
  readonly showRulers: boolean;
  readonly viewport: CanvasViewport;
  readonly zoom: number;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly stageMetrics: CanvasStageMetrics;
  readonly rulerThickness: number;
};

const cornerStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderRight: "1px solid var(--border-subtle, #333)",
  borderBottom: "1px solid var(--border-subtle, #333)",
};

/**
 * Ruler overlay positioned to match the canvas.
 */
export function CanvasRulers({
  showRulers,
  viewport,
  zoom,
  slideWidth,
  slideHeight,
  stageMetrics,
  rulerThickness,
}: CanvasRulersProps) {
  if (!showRulers) {
    return null;
  }

  const offsetX = viewport.scrollLeft - stageMetrics.canvasOffsetX;
  const offsetY = viewport.scrollTop - stageMetrics.canvasOffsetY;

  return (
    <>
      <div
        style={{
          ...cornerStyle,
          width: rulerThickness,
          height: rulerThickness,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: rulerThickness,
          right: 0,
          height: rulerThickness,
        }}
      >
        <SlideRuler
          orientation="horizontal"
          length={viewport.width}
          thickness={rulerThickness}
          zoom={zoom}
          offsetPx={offsetX}
          max={slideWidth}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: rulerThickness,
          left: 0,
          bottom: 0,
          width: rulerThickness,
        }}
      >
        <SlideRuler
          orientation="vertical"
          length={viewport.height}
          thickness={rulerThickness}
          zoom={zoom}
          offsetPx={offsetY}
          max={slideHeight}
        />
      </div>
    </>
  );
}
