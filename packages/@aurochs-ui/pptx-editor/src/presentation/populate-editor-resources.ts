/**
 * @file Populate editor-created resources
 *
 * Populates ResourceStore with default data for shapes created in the editor
 * (not loaded from a PPTX archive). Charts get a default chart, diagrams get
 * a default data model with generated shapes.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { DiagramDataModel } from "@aurochs-office/diagram/domain";
import { createDefaultChart } from "@aurochs-builder/chart";
import { buildDataModel } from "@aurochs-builder/diagram";
import { generateDiagramShapes } from "@aurochs-office/pptx/domain/diagram/layout-engine";

/**
 * Populate ResourceStore entries for editor-created charts and diagrams.
 *
 * For charts: creates a default chart for the given chartType.
 * For diagrams: builds a default data model and generates layout shapes.
 *
 * Skips resources that already exist in the store (e.g. loaded from archive).
 */
export function populateEditorCreatedResources(shapes: readonly Shape[], resourceStore: ResourceStore): void {
  for (const shape of shapes) {
    if (shape.type !== "graphicFrame") continue;

    if (shape.content.type === "chart") {
      populateChart(shape, resourceStore);
    } else if (shape.content.type === "diagram") {
      populateDiagram(shape, resourceStore);
    }
  }
}

function populateChart(shape: Extract<Shape, { type: "graphicFrame" }>, resourceStore: ResourceStore): void {
  if (shape.content.type !== "chart") return;
  const { resourceId, chartType } = shape.content.data;
  if (resourceStore.has(resourceId as string)) return;
  if (chartType === undefined) return;
  const chart = createDefaultChart(chartType);
  resourceStore.set(resourceId as string, {
    kind: "chart",
    source: "created",
    data: new ArrayBuffer(0),
    parsed: chart,
  });
}

function populateDiagram(shape: Extract<Shape, { type: "graphicFrame" }>, resourceStore: ResourceStore): void {
  if (shape.content.type !== "diagram") return;
  const { dataResourceId } = shape.content.data;
  if (dataResourceId === undefined) return;
  if (resourceStore.has(dataResourceId as string)) return;

  // buildDataModel returns builder DiagramDataModel; cast to domain DiagramDataModel
  // (structurally compatible — buildDataModel only creates "parOf" connections)
  const dataModel = buildDataModel({
    nodes: [
      { id: "1", text: "Item 1" },
      { id: "2", text: "Item 2" },
      { id: "3", text: "Item 3" },
    ],
  }) as unknown as DiagramDataModel;

  const bounds = {
    x: 0,
    y: 0,
    width: (shape.transform?.width ?? 500) as number,
    height: (shape.transform?.height ?? 400) as number,
  };

  const result = generateDiagramShapes({
    dataModel,
    layoutDefinition: undefined,
    styleDefinition: undefined,
    colorDefinition: undefined,
    config: { bounds, defaultNodeWidth: 100, defaultNodeHeight: 60, defaultSpacing: 10 },
  });

  resourceStore.set(dataResourceId as string, {
    kind: "diagram",
    source: "created",
    data: new ArrayBuffer(0),
    parsed: { shapes: result.shapes, dataModel },
  });
}
