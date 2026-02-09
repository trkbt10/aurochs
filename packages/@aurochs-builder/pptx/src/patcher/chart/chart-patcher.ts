/**
 * @file Chart patcher (Phase 10)
 *
 * Updates slide-level chart GraphicFrame (p:graphicFrame) and (optionally)
 * the referenced chart XML part (chartN.xml).
 */

import type { XmlDocument, XmlElement } from "@aurochs/xml";
import { getChild, isXmlElement } from "@aurochs/xml";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { replaceChildByName, updateChildByName } from "../core/xml-mutator";
import { patchTransformElement } from "../serializer/transform";
import type { ChartDataSpec } from "@aurochs-builder/chart";
import { patchChartData, patchChartStyle, patchChartTitle } from "@aurochs-builder/chart/patcher";

export type ChartStyle = {
  readonly styleId: number;
};

export type ChartChange =
  | { readonly type: "title"; readonly value: string }
  | { readonly type: "data"; readonly data: ChartDataSpec }
  | { readonly type: "style"; readonly style: ChartStyle };

export type ChartPatchTarget = {
  readonly graphicFrame: XmlElement;
  readonly chartXml: XmlDocument;
};

function requireChild(parent: XmlElement, name: string, context: string): XmlElement {
  const child = getChild(parent, name);
  if (!child) {
    throw new Error(`${context}: missing required child: ${name}`);
  }
  return child;
}

function patchGraphicFrameTitle(graphicFrame: XmlElement, title: string): XmlElement {
  const nv = requireChild(graphicFrame, "p:nvGraphicFramePr", "patchChartElement");
  const cNvPr = requireChild(nv, "p:cNvPr", "patchChartElement");
  const nextCNvPr = { ...cNvPr, attrs: { ...cNvPr.attrs, name: title } };
  return updateChildByName(graphicFrame, "p:nvGraphicFramePr", (nvEl) =>
    replaceChildByName(nvEl, "p:cNvPr", nextCNvPr),
  );
}

/** Apply a single chart element change to a graphic frame */
function applyChartElementChange(frame: XmlElement, change: ChartChange): XmlElement {
  switch (change.type) {
    case "title":
      return patchGraphicFrameTitle(frame, change.value);
    case "data":
    case "style":
      // These are applied to the chart part (chartN.xml) via patchChart().
      return frame;
  }
}

/**
 * Patch chart elements that live on the slide (graphicFrame itself).
 */
export function patchChartElement(graphicFrame: XmlElement, changes: readonly ChartChange[]): XmlElement {
  if (graphicFrame.name !== "p:graphicFrame") {
    throw new Error(`patchChartElement: expected p:graphicFrame, got ${graphicFrame.name}`);
  }

  return changes.reduce((frame, change) => applyChartElementChange(frame, change), graphicFrame);
}

/**
 * Patch chart position/size (p:graphicFrame/p:xfrm).
 */
export function patchChartTransform(graphicFrame: XmlElement, transform: Transform): XmlElement {
  if (graphicFrame.name !== "p:graphicFrame") {
    throw new Error(`patchChartTransform: expected p:graphicFrame, got ${graphicFrame.name}`);
  }

  const xfrm = getChild(graphicFrame, "p:xfrm");
  if (!xfrm || !isXmlElement(xfrm)) {
    throw new Error("patchChartTransform: missing p:xfrm");
  }

  const patched = patchTransformElement(xfrm, transform);
  return replaceChildByName(graphicFrame, "p:xfrm", patched);
}

/** Apply a single chart change to the chart XML document */
function applyChartXmlChange(doc: XmlDocument, change: ChartChange): XmlDocument {
  switch (change.type) {
    case "title":
      return patchChartTitle(doc, change.value);
    case "data":
      return patchChartData(doc, change.data);
    case "style":
      return patchChartStyle(doc, change.style.styleId);
  }
}

/**
 * Patch slide graphicFrame + referenced chart part in one call.
 */
export function patchChart(target: ChartPatchTarget, changes: readonly ChartChange[]): ChartPatchTarget {
  const nextFrame = patchChartElement(target.graphicFrame, changes);
  const nextChartXml = changes.reduce((doc, change) => applyChartXmlChange(doc, change), target.chartXml);

  return { graphicFrame: nextFrame, chartXml: nextChartXml };
}
