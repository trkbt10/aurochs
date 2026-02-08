/**
 * @file Input types for the ASCII renderer
 *
 * Minimal shape interface the renderer needs.
 * Structurally compatible with ShapeJson from pptx-cli.
 */

export type { Bounds } from "@aurochs-renderer/drawing-ml/ascii";

export type AsciiTableContent = {
  readonly type: "table";
  readonly table: {
    readonly rows: number;
    readonly cols: number;
    readonly data: readonly {
      readonly cells: readonly { readonly text: string }[];
    }[];
  };
};

export type AsciiChartContent = {
  readonly type: "chart";
  readonly chart: {
    readonly resourceId: string;
    readonly title?: string;
    readonly chartType?: string;
    readonly series?: readonly {
      readonly name?: string;
      readonly values?: readonly (number | null)[];
      readonly categories?: readonly (string | null)[];
    }[];
  };
};

export type AsciiDiagramContent = {
  readonly type: "diagram";
  readonly diagram: {
    readonly shapes?: readonly {
      readonly bounds: import("@aurochs-renderer/drawing-ml/ascii").Bounds;
      readonly text?: string;
    }[];
    readonly width?: number;
    readonly height?: number;
  };
};

export type AsciiGraphicContent =
  | AsciiTableContent
  | AsciiChartContent
  | AsciiDiagramContent
  | { readonly type: "oleObject" }
  | { readonly type: "unknown" };

export type AsciiRenderableShape = {
  readonly name: string;
  readonly type: string;
  readonly bounds?: import("@aurochs-renderer/drawing-ml/ascii").Bounds;
  readonly text?: string;
  readonly placeholder?: { readonly type?: string };
  readonly content?: AsciiGraphicContent;
  readonly children?: readonly AsciiRenderableShape[];
};
