/**
 * @file Sheet grid cell text rendering helpers
 *
 * Renders very large cell strings without inserting the full text into the DOM.
 * This keeps the workbook content intact while preventing UI freezes on extreme fixtures.
 */

import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { spacingTokens } from "@aurochs-ui/ui-components";

export type XlsxCellCanvasTextProps = {
  readonly text: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly style: Pick<
    CSSProperties,
    "color" | "fontFamily" | "fontSize" | "fontStyle" | "fontWeight" | "justifyContent" | "alignItems"
  >;
};

const parsePx = (value: string): number => {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected px value, got: ${value}`);
  }
  return n;
};

const CELL_PADDING_X_PX = parsePx(spacingTokens.xs);

function buildCanvasFont(style: XlsxCellCanvasTextProps["style"]): string {
  const fontSize = style.fontSize ?? "12px";
  const fontFamily = style.fontFamily ?? "Calibri";
  const weight = style.fontWeight ?? "normal";
  const fontStyle = style.fontStyle ?? "normal";
  return `${fontStyle} ${weight} ${fontSize} ${fontFamily}`;
}

function pickTextAlign(justifyContent: CSSProperties["justifyContent"]): CanvasTextAlign {
  switch (justifyContent) {
    case "center":
      return "center";
    case "flex-end":
      return "right";
    default:
      return "left";
  }
}

function pickTextBaseline(alignItems: CSSProperties["alignItems"]): CanvasTextBaseline {
  switch (alignItems) {
    case "flex-start":
      return "top";
    case "flex-end":
      return "bottom";
    default:
      return "middle";
  }
}

function estimatePrefixLengthForWidth(params: {
  readonly ctx: CanvasRenderingContext2D;
  readonly text: string;
  readonly maxWidthPx: number;
}): number {
  const { ctx, text, maxWidthPx } = params;
  if (maxWidthPx <= 0 || text.length === 0) {
    return 0;
  }

  const sampleLen = Math.min(128, text.length);
  const sample = text.slice(0, sampleLen);
  const sampleWidth = ctx.measureText(sample).width;
  if (sampleWidth <= 0) {
    return Math.min(text.length, 256);
  }

  const avg = sampleWidth / sampleLen;
  const estimated = Math.ceil(maxWidthPx / Math.max(0.001, avg)) + 16;
  return Math.min(text.length, Math.max(0, Math.min(8192, estimated)));
}

function findFirstLineEndIndex(text: string): number {
  const lf = text.indexOf("\n");
  const cr = text.indexOf("\r");
  if (lf === -1) {
    return cr;
  }
  if (cr === -1) {
    return lf;
  }
  return Math.min(lf, cr);
}

function resolveDrawX(textAlign: CanvasTextAlign, innerWidthPx: number): number {
  if (textAlign === "center") {
    return innerWidthPx / 2;
  }
  if (textAlign === "right") {
    return innerWidthPx;
  }
  return 0;
}

function resolveDrawY(textBaseline: CanvasTextBaseline, innerHeightPx: number): number {
  if (textBaseline === "middle") {
    return innerHeightPx / 2;
  }
  if (textBaseline === "bottom") {
    return innerHeightPx;
  }
  return 0;
}

/**
 * Render large text by drawing the visible prefix to a canvas clipped to the cell bounds.
 *
 * This avoids DOM text nodes containing very large strings while keeping the underlying cell
 * content intact (no truncation of workbook data).
 */
export function XlsxCellCanvasText({ text, widthPx, heightPx, style }: XlsxCellCanvasTextProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const innerWidthPx = Math.max(0, widthPx - CELL_PADDING_X_PX * 2);
  const innerHeightPx = Math.max(0, heightPx);

  const drawParams = useMemo(() => {
    return {
      font: buildCanvasFont(style),
      fillStyle: String(style.color ?? "black"),
      textAlign: pickTextAlign(style.justifyContent),
      textBaseline: pickTextBaseline(style.alignItems),
    };
  }, [style]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (innerWidthPx <= 0 || innerHeightPx <= 0) {
      return;
    }
    if (typeof CanvasRenderingContext2D === "undefined") {
      return;
    }

    canvas.width = Math.max(1, Math.floor(innerWidthPx * dpr));
    canvas.height = Math.max(1, Math.floor(innerHeightPx * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidthPx, innerHeightPx);
    ctx.font = drawParams.font;
    ctx.fillStyle = drawParams.fillStyle;
    ctx.textAlign = drawParams.textAlign;
    ctx.textBaseline = drawParams.textBaseline;

    const x = resolveDrawX(drawParams.textAlign, innerWidthPx);
    const y = resolveDrawY(drawParams.textBaseline, innerHeightPx);

    const firstLineEnd = findFirstLineEndIndex(text);
    const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);

    const maxWidth = Math.max(0, innerWidthPx);
    const prefixLen = estimatePrefixLengthForWidth({ ctx, text: firstLine, maxWidthPx: maxWidth });
    const prefix = firstLine.slice(0, prefixLen);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, innerWidthPx, innerHeightPx);
    ctx.clip();
    ctx.fillText(prefix, x, y);
    ctx.restore();
  }, [dpr, drawParams, innerHeightPx, innerWidthPx, text]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="xlsx-cell-canvas-text"
      style={{ width: innerWidthPx, height: innerHeightPx, display: "block" }}
    />
  );
}
