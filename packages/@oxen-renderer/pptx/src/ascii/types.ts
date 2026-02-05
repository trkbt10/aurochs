/**
 * @file Input types for the ASCII renderer
 *
 * Minimal shape interface the renderer needs.
 * Structurally compatible with ShapeJson from pptx-cli.
 */

export type { Bounds } from "@oxen-renderer/drawing-ml/ascii";

export type AsciiRenderableShape = {
  readonly name: string;
  readonly type: string;
  readonly bounds?: import("@oxen-renderer/drawing-ml/ascii").Bounds;
  readonly text?: string;
  readonly placeholder?: { readonly type?: string };
  readonly content?: { readonly type: string };
  readonly children?: readonly AsciiRenderableShape[];
};
