/**
 * @file Chart creation builder for Build command
 *
 * Creates a new embedded chart part (ppt/charts/chartN.xml), adds required
 * relationships/content types, and inserts a p:graphicFrame on the slide.
 */

import { createElement, parseXml, serializeDocument, type XmlDocument, type XmlElement } from "@aurochs/xml";
import {
  addShapeToTree,
  addOverride,
  addRelationship,
  ensureRelationshipsDocument,
  updateAtPath,
  updateDocumentRoot,
} from "@aurochs-builder/pptx/patcher";
import type { ZipPackage } from "@aurochs/zip";
import type { Degrees, Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { DRAWINGML_CONTENT_TYPES, OFFICE_RELATIONSHIP_TYPES } from "@aurochs-office/opc";
import { patchChartData, patchChartStyle, patchChartTitle } from "@aurochs-builder/chart/patcher";
import { buildChartSpaceDocument } from "@aurochs-builder/chart";
import type { ChartAddSpec, ChartDataSpec } from "../types";
import { patchChartTransform } from "@aurochs-builder/pptx/patcher";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { generateShapeId } from "./id-generator";
import { getSlideRelsPath } from "./rels-utils";

type AddContext = {
  readonly zipPackage: ZipPackage;
  readonly slidePath: string;
  readonly existingIds: string[];
};

const CHART_CONTENT_TYPE = DRAWINGML_CONTENT_TYPES.chart;

function requireText(value: string | null, context: string): string {
  if (!value) {
    throw new Error(context);
  }
  return value;
}

function getNextChartIndex(zipPackage: ZipPackage): number {
  const files = zipPackage.listFiles();
  const chartNumbers = files
    .map((f) => /^ppt\/charts\/chart(\d+)\.xml$/u.exec(f))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]))
    .filter((n) => Number.isFinite(n));
  const max = chartNumbers.length > 0 ? Math.max(...chartNumbers) : 0;
  return max + 1;
}

function toChartData(data: ChartDataSpec): Parameters<typeof patchChartData>[1] {
  return {
    categories: [...data.categories],
    series: data.series.map((s) => ({ name: s.name, values: [...s.values] })),
  };
}

function buildGraphicFrameXml(shapeId: string, name: string, relId: string): XmlElement {
  return createElement("p:graphicFrame", {}, [
    createElement("p:nvGraphicFramePr", {}, [
      createElement("p:cNvPr", { id: shapeId, name }),
      createElement("p:cNvGraphicFramePr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:xfrm", {}, [
      createElement("a:off", { x: "0", y: "0" }),
      createElement("a:ext", { cx: "0", cy: "0" }),
    ]),
    createElement("a:graphic", {}, [
      createElement("a:graphicData", { uri: "http://schemas.openxmlformats.org/drawingml/2006/chart" }, [
        createElement("c:chart", { "r:id": relId }),
      ]),
    ]),
  ]);
}

function buildTransform(spec: ChartAddSpec): Transform {
  return {
    x: spec.x as Pixels,
    y: spec.y as Pixels,
    width: spec.width as Pixels,
    height: spec.height as Pixels,
    rotation: 0 as Degrees,
    flipH: false,
    flipV: false,
  };
}

function ensureChartContentType(zipPackage: ZipPackage, chartPartPath: string): void {
  const contentTypesPath = "[Content_Types].xml";
  const xml = requireText(zipPackage.readText(contentTypesPath), `ensureChartContentType: missing ${contentTypesPath}`);
  const doc = parseXml(xml);
  const updated = addOverride(doc, `/${chartPartPath}`, CHART_CONTENT_TYPE);
  const out = serializeDocument(updated, { declaration: true, standalone: true });
  zipPackage.writeText(contentTypesPath, out);
}

function ensureSlideChartRelationship(zipPackage: ZipPackage, slidePath: string, chartPartPath: string): string {
  const relsPath = getSlideRelsPath(slidePath);
  const relsXml = zipPackage.readText(relsPath);
  const relsDoc = ensureRelationshipsDocument(relsXml ? parseXml(relsXml) : null);
  const { updatedXml, rId } = addRelationship(
    relsDoc,
    `../charts/${chartPartPath.split("/").pop()}`,
    OFFICE_RELATIONSHIP_TYPES.chart,
  );
  const out = serializeDocument(updatedXml, { declaration: true, standalone: true });
  zipPackage.writeText(relsPath, out);
  return rId;
}

function buildChartDocument(spec: ChartAddSpec): XmlDocument {
  const base = buildChartSpaceDocument(spec.chartType, spec.options);
  const withData = patchChartData(base, toChartData(spec.data));
  const withTitle = spec.title !== undefined ? patchChartTitle(withData, spec.title) : withData;
  return spec.styleId !== undefined ? patchChartStyle(withTitle, spec.styleId) : withTitle;
}

/**
 * Add new chart elements to a slide and create corresponding chart parts.
 */
export function addChartsToSlide(options: {
  readonly slideDoc: XmlDocument;
  readonly specs: readonly ChartAddSpec[];
  readonly ctx: AddContext;
}): { readonly doc: XmlDocument; readonly added: number } {
  if (options.specs.length === 0) {
    return { doc: options.slideDoc, added: 0 };
  }

  const firstChartIndex = getNextChartIndex(options.ctx.zipPackage);

  return options.specs.reduce(
    (acc, spec) => {
      if (spec.data.categories.length === 0) {
        throw new Error("addChartsToSlide: data.categories must not be empty");
      }
      if (spec.data.series.length === 0) {
        throw new Error("addChartsToSlide: data.series must not be empty");
      }

      const chartIndex = firstChartIndex + acc.added;
      const chartFilename = `chart${chartIndex}.xml`;
      const chartPath = `ppt/charts/${chartFilename}`;

      const chartDoc = buildChartDocument(spec);

      ensureChartContentType(options.ctx.zipPackage, chartPath);

      const relId = ensureSlideChartRelationship(options.ctx.zipPackage, options.ctx.slidePath, chartPath);

      const chartXml = serializeDocument(chartDoc, { declaration: true, standalone: true });
      options.ctx.zipPackage.writeText(chartPath, chartXml);

      const newId = generateShapeId(options.ctx.existingIds);
      options.ctx.existingIds.push(newId);
      const frameName = spec.title ?? `Chart ${newId}`;

      const frameXml = buildGraphicFrameXml(newId, frameName, relId);
      const transformed = patchChartTransform(frameXml, buildTransform(spec));

      const nextDoc = updateDocumentRoot(acc.doc, (root) =>
        updateAtPath(root, ["p:cSld", "p:spTree"], (tree) => addShapeToTree(tree, transformed)),
      );

      return { doc: nextDoc, added: acc.added + 1 };
    },
    { doc: options.slideDoc, added: 0 },
  );
}
