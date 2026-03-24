/**
 * @file Slide resource builder
 *
 * Provides pure builder functions and a slide-level resource preparation function.
 *
 * Pure functions (no side effects):
 *   buildChartResourceEntry — ChartType → ResolvedResourceEntry
 *   buildDiagramResourceEntry — DiagramBuildSpec + size → ResolvedResourceEntry
 *
 * Slide preparation (enriches context for a slide):
 *   prepareSlideResources — parser enrich + builder register in one call
 *   Ensures ResourceStore is populated before rendering.
 */

import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { DiagramLayoutType } from "@aurochs-office/pptx/domain/shape";
import type { ResolvedResourceEntry, ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { ChartType } from "@aurochs-office/chart/domain";
import type { DiagramDataModel } from "@aurochs-office/diagram/domain";
import type { FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { loadSlideExternalContent } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createDefaultChart } from "@aurochs-builder/chart";
import { buildDataModel } from "@aurochs-builder/diagram";
import type { DiagramBuildSpec } from "@aurochs-builder/diagram";
import { generateDiagramShapes } from "@aurochs-office/pptx/domain/diagram/layout-engine";

// =============================================================================
// Pure builder functions
// =============================================================================

export function buildChartResourceEntry(chartType: ChartType): ResolvedResourceEntry {
  return {
    kind: "chart",
    source: "created",
    data: new ArrayBuffer(0),
    parsed: createDefaultChart(chartType),
  };
}

export function buildDiagramResourceEntry(
  spec: DiagramBuildSpec,
  width: number,
  height: number,
): ResolvedResourceEntry {
  const dataModel: DiagramDataModel = buildDataModel(spec);
  const { shapes } = generateDiagramShapes({
    dataModel,
    layoutDefinition: undefined,
    styleDefinition: undefined,
    colorDefinition: undefined,
    config: {
      bounds: { x: 0, y: 0, width, height },
      defaultNodeWidth: 100,
      defaultNodeHeight: 60,
      defaultSpacing: 10,
    },
  });

  return {
    kind: "diagram",
    source: "created",
    data: new ArrayBuffer(0),
    parsed: { shapes, dataModel },
  };
}

// =============================================================================
// Slide-level resource preparation
// =============================================================================

export type BuilderResourceOptions = {
  /** Resolve a DiagramBuildSpec for a given layout type. Returns undefined to skip. */
  readonly resolveDiagramSpec?: (diagramType: DiagramLayoutType) => DiagramBuildSpec | undefined;
};

/**
 * Prepare a slide's ResourceStore for rendering from PPTX archive.
 *
 * Runs two steps:
 * 1. Parser: loadSlideExternalContent — reads archive via fileReader
 * 2. Builder: register chart/diagram entries for shapes not covered by step 1
 *
 * Use this when a PPTX archive is available (apiSlide present).
 *
 * @returns The enriched slide (may differ from input if parser attached data)
 */
export function prepareSlideResources(
  slide: Slide,
  resourceStore: ResourceStore,
  fileReader: FileReader,
  options: BuilderResourceOptions = {},
): Slide {
  const enrichedSlide = loadSlideExternalContent(slide, fileReader, resourceStore);
  registerBuilderResources(enrichedSlide.shapes, resourceStore, options);
  return enrichedSlide;
}

// =============================================================================
// Builder resource registration
// =============================================================================

/**
 * Register builder-generated resources (charts, diagrams) in ResourceStore.
 *
 * Use this when no PPTX archive is available (editor-created slides).
 * Only generates resources for shapes that don't already have entries in the store.
 */
export function registerBuilderResources(
  shapes: readonly Shape[],
  resourceStore: ResourceStore,
  options: BuilderResourceOptions = {},
): void {
  for (const shape of shapes) {
    if (shape.type !== "graphicFrame") {
      continue;
    }

    switch (shape.content.type) {
      case "chart": {
        const { resourceId, chartType } = shape.content.data;
        if (chartType !== undefined && !resourceStore.has(resourceId)) {
          resourceStore.set(resourceId, buildChartResourceEntry(chartType));
        }
        break;
      }
      case "diagram": {
        const { dataResourceId, diagramType } = shape.content.data;
        if (dataResourceId !== undefined && diagramType !== undefined && !resourceStore.has(dataResourceId)) {
          const spec = options.resolveDiagramSpec?.(diagramType);
          if (spec !== undefined) {
            const { width, height } = shape.transform;
            resourceStore.set(dataResourceId, buildDiagramResourceEntry(spec, width, height));
          }
        }
        break;
      }
    }
  }
}
