/**
 * @file Default canvas background for slide-based editors
 *
 * Renders a white "paper" rect with drop-shadow and a boundary line.
 * Used by PPTX, PDF, and POTX editors via EditorCanvas canvasBackground prop.
 *
 * Figma-like infinite canvas editors do NOT use this — they have no paper.
 */

import type { CSSProperties } from "react";

type SlideCanvasBackgroundParams = {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
};

const slideBgStyle: CSSProperties = {
  filter: "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.4))",
};

/**
 * Canvas background for slide/page-based editors.
 *
 * Pass this as the `canvasBackground` prop to EditorCanvas:
 * ```tsx
 * <EditorCanvas canvasBackground={slideCanvasBackground} ... />
 * ```
 */
export function slideCanvasBackground({ width, height, scale }: SlideCanvasBackgroundParams) {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        style={slideBgStyle}
      />
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke="rgba(128, 128, 128, 0.5)"
        strokeWidth={1 / scale}
        pointerEvents="none"
      />
    </>
  );
}
