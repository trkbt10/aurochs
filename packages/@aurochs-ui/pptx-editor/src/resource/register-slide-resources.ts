/**
 * @file Slide resource preparation (pptx-editor configuration)
 *
 * Thin wrapper over @aurochs-builder/pptx/resource-builder's prepareSlideResources,
 * providing pptx-editor's default diagram node specs and a null-object FileReader.
 */

import type { Slide } from "@aurochs-office/pptx/domain";
import type { DiagramLayoutType } from "@aurochs-office/pptx/domain/shape";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { DiagramBuildSpec } from "@aurochs-builder/diagram";
import type { FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { prepareSlideResources } from "@aurochs-builder/pptx/resource-builder";



/**
 * UI-defined default node specs per diagram layout type.
 * Not from ECMA-376 — the spec defines XML structure, not default content.
 */
const DIAGRAM_SPECS: Record<DiagramLayoutType, DiagramBuildSpec> = {
  process: {
    nodes: [
      { id: "1", text: "Step 1" },
      { id: "2", text: "Step 2" },
      { id: "3", text: "Step 3" },
    ],
  },
  cycle: {
    nodes: [
      { id: "1", text: "Phase 1" },
      { id: "2", text: "Phase 2" },
      { id: "3", text: "Phase 3" },
      { id: "4", text: "Phase 4" },
    ],
  },
  hierarchy: {
    nodes: [
      { id: "1", text: "Top" },
      { id: "2", text: "Branch A", parentId: "1" },
      { id: "3", text: "Branch B", parentId: "1" },
      { id: "4", text: "Leaf A-1", parentId: "2" },
      { id: "5", text: "Leaf B-1", parentId: "3" },
    ],
  },
  relationship: {
    nodes: [
      { id: "1", text: "Item A" },
      { id: "2", text: "Item B" },
      { id: "3", text: "Item C" },
    ],
  },
};

function resolveDiagramSpec(diagramType: DiagramLayoutType): DiagramBuildSpec | undefined {
  return DIAGRAM_SPECS[diagramType];
}

/**
 * Prepare a slide's ResourceStore for rendering.
 * Handles both archive-loaded and editor-created chart/diagram content.
 *
 * @param fileReader - FileReader for archive access. Use NULL_FILE_READER if no archive.
 */
export function prepareSlide(
  slide: Slide,
  resourceStore: ResourceStore,
  fileReader: FileReader,
): Slide {
  return prepareSlideResources(slide, resourceStore, {
    resolveDiagramSpec,
    fileReader,
  });
}

