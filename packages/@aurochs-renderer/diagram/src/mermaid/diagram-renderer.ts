/**
 * @file Render diagram shapes as a fenced Mermaid flowchart
 */

import { serializeDiagramToMermaid } from "@aurochs-builder/mermaid";
import { wrapInMermaidFence } from "@aurochs/mermaid";
import type { DiagramMermaidParams } from "./types";

/** Render diagram shapes as a fenced Mermaid flowchart string. */
export function renderDiagramMermaid(params: DiagramMermaidParams): string {
  const content = serializeDiagramToMermaid({ shapes: params.shapes });

  if (!content) {
    return "";
  }

  return wrapInMermaidFence(content);
}
