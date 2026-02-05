/**
 * @file Renders AsciiRenderableShape[] onto an AsciiCanvas for terminal preview
 */

import type { AsciiRenderableShape } from "./types";
import { createCanvas, drawBox, drawText, renderCanvas } from "@oxen-renderer/drawing-ml/ascii";
import { createMapperConfig, mapBoundsToGrid } from "@oxen-renderer/drawing-ml/ascii";

export type SlideRenderParams = {
  readonly shapes: readonly AsciiRenderableShape[];
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly terminalWidth: number;
  readonly showBorder?: boolean;
};

/** Get the lines to render inside a shape box. */
function getShapeLines(shape: AsciiRenderableShape): readonly string[] {
  if (shape.text) {
    const lines = shape.text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 0) {
      return lines;
    }
  }
  if (shape.placeholder?.type) {
    return [`[${shape.placeholder.type}]`];
  }
  if (shape.content) {
    return [`{${shape.content.type}}`];
  }
  if (shape.type === "pic") {
    return ["[image]"];
  }
  if (shape.type === "cxnSp") {
    return ["[connector]"];
  }
  if (shape.type === "grpSp") {
    return ["[group]"];
  }
  return [shape.name];
}

/** Flatten group shapes preserving document (z) order. */
function flattenShapes(shapes: readonly AsciiRenderableShape[]): readonly AsciiRenderableShape[] {
  const result: AsciiRenderableShape[] = [];
  for (const shape of shapes) {
    if (shape.type === "grpSp" && shape.children) {
      result.push(shape);
      result.push(...flattenShapes(shape.children));
    } else {
      result.push(shape);
    }
  }
  return result;
}

/** Render shapes onto an ASCII canvas and return the result string. */
export function renderSlideAscii(params: SlideRenderParams): string {
  const { shapes, slideWidth, slideHeight, terminalWidth, showBorder } = params;
  const config = createMapperConfig(slideWidth, slideHeight, terminalWidth);
  const canvas = createCanvas(config.gridWidth, config.gridHeight);

  if (showBorder) {
    drawBox({ canvas, col: 0, row: 0, w: config.gridWidth, h: config.gridHeight, z: 0 });
  }

  const flatShapes = flattenShapes(shapes);

  for (let i = 0; i < flatShapes.length; i++) {
    const shape = flatShapes[i]!;
    if (!shape.bounds) {
      continue;
    }

    const gridRect = mapBoundsToGrid(config, shape.bounds);
    if (!gridRect) {
      continue;
    }

    const z = i + 1;

    drawBox({ canvas, col: gridRect.col, row: gridRect.row, w: gridRect.width, h: gridRect.height, z });

    if (gridRect.width > 2 && gridRect.height > 2) {
      const interiorWidth = gridRect.width - 2;
      const interiorHeight = gridRect.height - 2;
      const lines = getShapeLines(shape);

      for (let lineIdx = 0; lineIdx < Math.min(lines.length, interiorHeight); lineIdx++) {
        drawText({
          canvas,
          col: gridRect.col + 1,
          row: gridRect.row + 1 + lineIdx,
          text: lines[lineIdx]!,
          maxLen: interiorWidth,
          z,
        });
      }
    }
  }

  return renderCanvas(canvas);
}
