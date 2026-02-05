/**
 * @file Types for diagram ASCII rendering
 */

import type { Bounds } from "@oxen-renderer/drawing-ml/ascii";

export type AsciiDiagramShape = {
  readonly id: string;
  readonly bounds: Bounds;
  readonly text?: string;
  readonly preset?: string;
};

export type DiagramAsciiParams = {
  readonly shapes: readonly AsciiDiagramShape[];
  readonly width: number;
  readonly height: number;
  readonly terminalWidth: number;
  readonly showBorder?: boolean;
};
