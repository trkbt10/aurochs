/**
 * @file Slide resource preparation (pptx-editor configuration)
 *
 * Single entry point: prepareSlide.
 *
 * Archive resources are already loaded into the document's ResourceStore
 * by the converter (loadSlideExternalContent at document creation time).
 * This function only registers builder-generated resources (editor-created
 * charts, diagrams) for shapes that don't already have entries in the store.
 *
 * FileReader is NOT used here — it belongs to the converter's document creation
 * path, not to the editor's render-time path.
 */

import type { Slide } from "@aurochs-office/pptx/domain";
import type { DiagramLayoutType } from "@aurochs-office/pptx/domain/shape";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { DiagramBuildSpec } from "@aurochs-builder/diagram";
import { prepareSlideResources } from "@aurochs-builder/pptx/resource-builder";
import { NULL_FILE_READER } from "@aurochs-office/pptx/parser/slide/external-content-loader";

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

const BUILDER_OPTIONS = { resolveDiagramSpec };

/**
 * Prepare a slide's ResourceStore for rendering.
 *
 * Archive resources are already in the store (loaded at document creation time).
 * This only registers builder-generated resources for editor-created shapes.
 *
 * NULL_FILE_READER is passed to prepareSlideResources: loadSlideExternalContent
 * becomes a no-op (archive entries already present in store, and readFile returns null).
 * registerBuilderResources fills in any remaining gaps.
 */
export function prepareSlide(
  slide: Slide,
  resourceStore: ResourceStore,
): Slide {
  return prepareSlideResources(slide, resourceStore, NULL_FILE_READER, BUILDER_OPTIONS);
}
