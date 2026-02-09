/**
 * @file Chart update utilities for Build command
 *
 * This updates existing embedded charts referenced from a slide via r:id.
 * It does not create new chart parts; it patches chartN.xml and the slide's
 * p:graphicFrame element.
 */

import { getByPath, isXmlElement, parseXml, serializeDocument, type XmlDocument, type XmlElement } from "@aurochs/xml";
import {
  updateDocumentRoot,
  updateAtPath,
  patchChart,
  patchChartTransform,
  type ChartChange,
} from "@aurochs-builder/pptx/patcher";
import { listRelationships } from "@aurochs-office/opc";
import { resolveRelationshipTargetPath } from "@aurochs-office/opc";
import type { ZipPackage } from "@aurochs/zip";
import type { ChartUpdateSpec } from "../types";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import type { Degrees, Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { getSlideRelsPath } from "./rels-utils";

type UpdateContext = {
  readonly zipPackage: ZipPackage;
  readonly slidePath: string;
};

function requireXmlText(value: string | null, context: string): string {
  if (!value) {
    throw new Error(context);
  }
  return value;
}

function getGraphicFrameId(frame: XmlElement): string | undefined {
  const cNvPr = getByPath(frame, ["p:nvGraphicFramePr", "p:cNvPr"]);
  if (!cNvPr || !isXmlElement(cNvPr)) {
    return undefined;
  }
  return cNvPr.attrs.id;
}

function frameChartResourceId(frame: XmlElement): string | undefined {
  const chart = getByPath(frame, ["a:graphic", "a:graphicData", "c:chart"]);
  if (!chart || !isXmlElement(chart)) {
    return undefined;
  }
  return chart.attrs["r:id"];
}

function findGraphicFrameByChartRid(spTree: XmlElement, chartRid: string): XmlElement | undefined {
  for (const child of spTree.children) {
    if (!isXmlElement(child) || child.name !== "p:graphicFrame") {
      continue;
    }
    if (frameChartResourceId(child) === chartRid) {
      return child;
    }
  }
  return undefined;
}

function buildTransform(spec: ChartUpdateSpec["transform"]): Transform {
  if (!spec) {
    throw new Error("buildTransform: transform is required");
  }
  return {
    x: spec.x as Pixels,
    y: spec.y as Pixels,
    width: spec.width as Pixels,
    height: spec.height as Pixels,
    rotation: (spec.rotation ?? 0) as Degrees,
    flipH: spec.flipH ?? false,
    flipV: spec.flipV ?? false,
  };
}

function buildChartChanges(spec: ChartUpdateSpec): readonly ChartChange[] {
  const changes: ChartChange[] = [];
  if (spec.title !== undefined) {
    changes.push({ type: "title", value: spec.title });
  }
  if (spec.data !== undefined) {
    changes.push({
      type: "data",
      data: {
        categories: [...spec.data.categories],
        series: spec.data.series.map((s) => ({ name: s.name, values: [...s.values] })),
      },
    });
  }
  if (spec.styleId !== undefined) {
    changes.push({ type: "style", style: { styleId: spec.styleId } });
  }
  return changes;
}

/** Resolve the final graphic frame, applying transform if present */
function resolveChartFrame(
  graphicFrame: XmlElement,
  transform: ChartUpdateSpec["transform"],
): XmlElement {
  if (transform) {
    return patchChartTransform(graphicFrame, buildTransform(transform));
  }
  return graphicFrame;
}

/**
 * Apply updates to existing chart elements on a slide.
 */
export function applyChartUpdates(
  slideDoc: XmlDocument,
  ctx: UpdateContext,
  updates: readonly ChartUpdateSpec[],
): { readonly doc: XmlDocument; readonly updated: number } {
  if (updates.length === 0) {
    return { doc: slideDoc, updated: 0 };
  }

  const relsPath = getSlideRelsPath(ctx.slidePath);
  const relsXml = requireXmlText(
    ctx.zipPackage.readText(relsPath),
    `applyChartUpdates: could not read slide rels: ${relsPath}`,
  );
  const relsDoc = parseXml(relsXml);
  const relMap = new Map(listRelationships(relsDoc).map((r) => [r.id, r.target]));

  return updates.reduce(
    (acc, update) => {
      const chartTarget = relMap.get(update.resourceId);
      if (!chartTarget) {
        throw new Error(`applyChartUpdates: missing chart relationship: ${update.resourceId}`);
      }

      const chartPartPath = resolveRelationshipTargetPath(ctx.slidePath, chartTarget);
      const chartXml = requireXmlText(
        ctx.zipPackage.readText(chartPartPath),
        `applyChartUpdates: could not read chart part: ${chartPartPath}`,
      );
      const chartDoc = parseXml(chartXml);

      const spTree = getByPath(acc.doc, ["p:sld", "p:cSld", "p:spTree"]);
      if (!spTree || !isXmlElement(spTree)) {
        throw new Error("applyChartUpdates: invalid slide structure (missing p:spTree)");
      }

      const frame = findGraphicFrameByChartRid(spTree, update.resourceId);
      if (!frame) {
        throw new Error(`applyChartUpdates: could not find p:graphicFrame for chart ${update.resourceId}`);
      }

      const changes = buildChartChanges(update);
      const patched = patchChart({ graphicFrame: frame, chartXml: chartDoc }, changes);
      const patchedFrame = resolveChartFrame(patched.graphicFrame, update.transform);

      const frameId = getGraphicFrameId(frame);
      if (!frameId) {
        throw new Error("applyChartUpdates: could not determine graphicFrame id");
      }

      const nextDoc = updateDocumentRoot(acc.doc, (root) =>
        updateAtPath(root, ["p:cSld", "p:spTree"], (tree) => {
          const nextChildren = tree.children.map((child) => {
            if (!isXmlElement(child) || child.name !== "p:graphicFrame") {
              return child;
            }
            return getGraphicFrameId(child) === frameId ? patchedFrame : child;
          });
          return { ...tree, children: nextChildren };
        }),
      );

      const nextChartXml = serializeDocument(patched.chartXml, { declaration: true, standalone: true });
      ctx.zipPackage.writeText(chartPartPath, nextChartXml);

      return { doc: nextDoc, updated: acc.updated + 1 };
    },
    { doc: slideDoc, updated: 0 },
  );
}
