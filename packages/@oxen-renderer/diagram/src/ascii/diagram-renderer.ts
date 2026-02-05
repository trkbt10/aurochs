/**
 * @file Renders diagram shapes onto an ASCII canvas
 */

import { createCanvas, drawBox, drawText, renderCanvas, createMapperConfig, mapBoundsToGrid } from "@oxen-renderer/drawing-ml/ascii";
import type { DiagramAsciiParams } from "./types";

/** Render laid-out diagram shapes as ASCII art. */
export function renderDiagramAscii(params: DiagramAsciiParams): string {
  const { shapes, width, height, terminalWidth, showBorder } = params;
  const config = createMapperConfig(width, height, terminalWidth);
  const canvas = createCanvas(config.gridWidth, config.gridHeight);

  if (showBorder) {
    drawBox({ canvas, col: 0, row: 0, w: config.gridWidth, h: config.gridHeight, z: 0 });
  }

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]!;
    const gridRect = mapBoundsToGrid(config, shape.bounds);
    if (!gridRect) {
      continue;
    }

    const z = i + 1;
    drawBox({ canvas, col: gridRect.col, row: gridRect.row, w: gridRect.width, h: gridRect.height, z });

    if (gridRect.width > 2 && gridRect.height > 2 && shape.text) {
      const interiorWidth = gridRect.width - 2;
      const interiorHeight = gridRect.height - 2;
      const lines = shape.text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

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
