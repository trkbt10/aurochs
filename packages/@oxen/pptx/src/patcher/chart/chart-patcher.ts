/**
 * @file Chart patcher (Phase 10)
 *
 * Updates slide-level chart GraphicFrame (p:graphicFrame) and (optionally)
 * the referenced chart XML part (chartN.xml).
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getChild, isXmlElement } from "@oxen/xml";
import type { Transform } from "../../domain/geometry";
import { replaceChildByName, updateChildByName } from "../core/xml-mutator";
import { patchTransformElement } from "../serializer/transform";
import type { ChartData } from "./chart-data-patcher";
import { patchChartData, patchChartStyle, patchChartTitle } from "./chart-data-patcher";

export type ChartStyle = {
  readonly styleId: number;
};

export type ChartChange =
  | { readonly type: "title"; readonly value: string }
  | { readonly type: "data"; readonly data: ChartData }
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

/**
 * Patch chart elements that live on the slide (graphicFrame itself).
 */
export function patchChartElement(graphicFrame: XmlElement, changes: readonly ChartChange[]): XmlElement {
  if (graphicFrame.name !== "p:graphicFrame") {
    throw new Error(`patchChartElement: expected p:graphicFrame, got ${graphicFrame.name}`);
  }

  let next = graphicFrame;
  for (const change of changes) {
    switch (change.type) {
      case "title":
        next = patchGraphicFrameTitle(next, change.value);
        break;
      case "data":
      case "style":
        // These are applied to the chart part (chartN.xml) via patchChart().
        break;
      default:
        // Exhaustiveness (TS)
        ((_: never) => _)(change);
    }
  }

  return next;
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

/**
 * Patch slide graphicFrame + referenced chart part in one call.
 */
export function patchChart(target: ChartPatchTarget, changes: readonly ChartChange[]): ChartPatchTarget {
  const nextFrame = patchChartElement(target.graphicFrame, changes);
  let nextChartXml = target.chartXml;

  for (const change of changes) {
    switch (change.type) {
      case "title":
        nextChartXml = patchChartTitle(nextChartXml, change.value);
        break;
      case "data":
        nextChartXml = patchChartData(nextChartXml, change.data);
        break;
      case "style":
        nextChartXml = patchChartStyle(nextChartXml, change.style.styleId);
        break;
      default:
        ((_: never) => _)(change);
    }
  }

  return { graphicFrame: nextFrame, chartXml: nextChartXml };
}
