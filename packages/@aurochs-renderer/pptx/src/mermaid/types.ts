/**
 * @file Types for PPTX Mermaid rendering
 *
 * Structurally compatible with AsciiRenderableShape from the ascii renderer.
 */

export type MermaidTableContent = {
  readonly type: "table";
  readonly table: {
    readonly rows: number;
    readonly cols: number;
    readonly data: readonly {
      readonly cells: readonly { readonly text: string }[];
    }[];
  };
};

export type MermaidChartContent = {
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

export type MermaidDiagramContent = {
  readonly type: "diagram";
  readonly diagram: {
    readonly shapes?: readonly {
      readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
      readonly text?: string;
    }[];
    readonly width?: number;
    readonly height?: number;
  };
};

export type MermaidGraphicContent =
  | MermaidTableContent
  | MermaidChartContent
  | MermaidDiagramContent
  | { readonly type: "oleObject" }
  | { readonly type: "unknown" };

export type MermaidRenderableShape = {
  readonly name: string;
  readonly type: string;
  readonly text?: string;
  readonly placeholder?: { readonly type?: string };
  readonly content?: MermaidGraphicContent;
};

export type SlideMermaidParams = {
  readonly shapes: readonly MermaidRenderableShape[];
  readonly slideNumber?: number;
};
