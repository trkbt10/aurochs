/**
 * @file Types for diagram Mermaid rendering
 */

export type MermaidDiagramShape = {
  readonly id: string;
  readonly text?: string;
  readonly bounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

export type DiagramMermaidParams = {
  readonly shapes: readonly MermaidDiagramShape[];
};
