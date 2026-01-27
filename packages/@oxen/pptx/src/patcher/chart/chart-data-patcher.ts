/**
 * @file Chart data patcher (Phase 10)
 *
 * Updates embedded chart data caches inside a chart XML part (chartN.xml).
 *
 * Notes:
 * - This patcher focuses on updating cached values (c:numCache / c:strCache).
 * - Editing embedded Excel (xlsx) sources is out of scope.
 */

import { createElement, createText, getByPath, getChild, getChildren, isXmlElement, type XmlDocument, type XmlElement, type XmlNode } from "@oxen/xml";
import { findElements, replaceChildByName, setChildren, updateDocumentRoot } from "../core/xml-mutator";

export type ChartSeries = {
  readonly name: string;
  readonly values: readonly number[];
};

export type ChartData = {
  readonly categories: readonly string[];
  readonly series: readonly ChartSeries[];
};

function cloneNode(node: XmlNode): XmlNode {
  if (!isXmlElement(node)) {
    return { ...node };
  }
  return createElement(node.name, { ...node.attrs }, node.children.map(cloneNode));
}

function requireChild(parent: XmlElement, name: string, context: string): XmlElement {
  const child = getChild(parent, name);
  if (!child) {
    throw new Error(`${context}: missing required child: ${name}`);
  }
  return child;
}

function requireChartRoot(chartXml: XmlDocument): XmlElement {
  const chartSpace = getByPath(chartXml, ["c:chartSpace"]);
  if (!chartSpace) {
    throw new Error("patchChartData: missing c:chartSpace root");
  }
  return chartSpace;
}

function getPlotArea(chartSpace: XmlElement): XmlElement {
  const chart = requireChild(chartSpace, "c:chart", "patchChartData");
  return requireChild(chart, "c:plotArea", "patchChartData");
}

function getSeriesContainers(plotArea: XmlElement): readonly XmlElement[] {
  return plotArea.children.filter((c): c is XmlElement => {
    if (!isXmlElement(c)) {
      return false;
    }
    return getChild(c, "c:ser") !== undefined;
  });
}

function patchPlotAreaSeriesContainers(
  plotArea: XmlElement,
  containers: readonly XmlElement[],
  data: ChartData,
): XmlElement {
  const patchedContainers = new Map<string, XmlElement>();
  for (const container of containers) {
    patchedContainers.set(container.name, patchContainerSeries(container, data));
  }

  const nextChildren = plotArea.children.map((child) => {
    if (!isXmlElement(child)) {
      return child;
    }
    const patched = patchedContainers.get(child.name);
    return patched ?? child;
  });

  return setChildren(plotArea, nextChildren);
}

function setOrAddSimpleValChild(parent: XmlElement, name: string, val: string): XmlElement {
  const existing = getChild(parent, name);
  if (existing) {
    return replaceChildByName(parent, name, createElement(name, { ...existing.attrs, val }));
  }
  return setChildren(parent, [...parent.children, createElement(name, { val })]);
}

function serializePtList(
  ptName: "c:pt",
  values: readonly string[],
): readonly XmlElement[] {
  return values.map((value, idx) =>
    createElement(ptName, { idx: String(idx) }, [createElement("c:v", {}, [createText(value)])]),
  );
}

function patchCache(
  cache: XmlElement,
  values: readonly string[],
): XmlElement {
  const preserved = cache.children.filter((c) => {
    if (!isXmlElement(c)) {
      return true;
    }
    return c.name !== "c:ptCount" && c.name !== "c:pt";
  });

  return createElement(cache.name, { ...cache.attrs }, [
    createElement("c:ptCount", { val: String(values.length) }),
    ...serializePtList("c:pt", values),
    ...preserved,
  ]);
}

function patchCategoryElement(cat: XmlElement, categories: readonly string[]): XmlElement {
  const strRef = getChild(cat, "c:strRef");
  if (strRef) {
    const strCache = getChild(strRef, "c:strCache");
    if (!strCache) {
      throw new Error("patchChartData: c:strRef without c:strCache is not supported");
    }
    const nextStrRef = replaceChildByName(strRef, "c:strCache", patchCache(strCache, categories));
    return replaceChildByName(cat, "c:strRef", nextStrRef);
  }

  const strLit = getChild(cat, "c:strLit");
  if (strLit) {
    return replaceChildByName(cat, "c:strLit", patchCache(strLit, categories));
  }

  // Fallback: replace with a literal cache
  return createElement(cat.name, { ...cat.attrs }, [
    createElement("c:strLit", {}, [
      createElement("c:ptCount", { val: String(categories.length) }),
      ...serializePtList("c:pt", categories),
    ]),
  ]);
}

function patchValuesElement(val: XmlElement, values: readonly number[]): XmlElement {
  const strValues = values.map((v) => String(v));

  const numRef = getChild(val, "c:numRef");
  if (numRef) {
    const numCache = getChild(numRef, "c:numCache");
    if (!numCache) {
      throw new Error("patchChartData: c:numRef without c:numCache is not supported");
    }
    const nextNumRef = replaceChildByName(numRef, "c:numCache", patchCache(numCache, strValues));
    return replaceChildByName(val, "c:numRef", nextNumRef);
  }

  const numLit = getChild(val, "c:numLit");
  if (numLit) {
    return replaceChildByName(val, "c:numLit", patchCache(numLit, strValues));
  }

  // Fallback: replace with a literal cache
  return createElement(val.name, { ...val.attrs }, [
    createElement("c:numLit", {}, [
      createElement("c:ptCount", { val: String(values.length) }),
      ...serializePtList("c:pt", strValues),
    ]),
  ]);
}

function patchSeriesName(tx: XmlElement, seriesName: string): XmlElement {
  // Prefer c:v if present (simple series name)
  const v = getChild(tx, "c:v");
  if (v) {
    return replaceChildByName(tx, "c:v", createElement("c:v", {}, [createText(seriesName)]));
  }

  // Otherwise attempt to patch c:strRef cache
  const strRef = getChild(tx, "c:strRef");
  if (strRef) {
    const strCache = getChild(strRef, "c:strCache");
    if (strCache) {
      const nextStrRef = replaceChildByName(strRef, "c:strCache", patchCache(strCache, [seriesName]));
      return replaceChildByName(tx, "c:strRef", nextStrRef);
    }
  }

  // Fallback: replace with c:v
  return createElement(tx.name, { ...tx.attrs }, [createElement("c:v", {}, [createText(seriesName)])]);
}

function patchOrCreateChildWithUpdater(
  parent: XmlElement,
  name: string,
  updater: (child: XmlElement) => XmlElement,
  create: () => XmlElement,
): XmlElement {
  const existing = getChild(parent, name);
  if (!existing) {
    return setChildren(parent, [...parent.children, create()]);
  }
  return replaceChildByName(parent, name, updater(existing));
}

export function patchSeriesData(seriesElement: XmlElement, series: ChartSeries): XmlElement {
  if (seriesElement.name !== "c:ser") {
    throw new Error(`patchSeriesData: expected c:ser, got ${seriesElement.name}`);
  }

  let next = seriesElement;

  // Ensure idx / order are present (preserve when existing, but force to numeric string)
  if (getChild(next, "c:idx")) {
    next = setOrAddSimpleValChild(next, "c:idx", getChild(next, "c:idx")?.attrs.val ?? "0");
  }
  if (getChild(next, "c:order")) {
    next = setOrAddSimpleValChild(next, "c:order", getChild(next, "c:order")?.attrs.val ?? "0");
  }

  next = patchOrCreateChildWithUpdater(
    next,
    "c:tx",
    (tx) => patchSeriesName(tx, series.name),
    () => createElement("c:tx", {}, [createElement("c:v", {}, [createText(series.name)])]),
  );

  // Values (categories are patched separately in patchChartData)
  next = patchOrCreateChildWithUpdater(
    next,
    "c:val",
    (val) => patchValuesElement(val, series.values),
    () =>
      createElement("c:val", {}, [
        createElement("c:numLit", {}, [
          createElement("c:ptCount", { val: String(series.values.length) }),
          ...serializePtList("c:pt", series.values.map(String)),
        ]),
      ]),
  );

  return next;
}

function setSeriesIndex(ser: XmlElement, index: number): XmlElement {
  let next = ser;
  next = setOrAddSimpleValChild(next, "c:idx", String(index));
  next = setOrAddSimpleValChild(next, "c:order", String(index));
  return next;
}

function ensureSeriesCount(
  seriesContainer: XmlElement,
  desiredCount: number,
): XmlElement {
  const existingSeries = getChildren(seriesContainer, "c:ser");
  if (existingSeries.length >= desiredCount) {
    return seriesContainer;
  }

  if (existingSeries.length === 0) {
    throw new Error("patchChartData: cannot add series when chart has no existing c:ser template");
  }

  const template = existingSeries[0];
  const additional: XmlElement[] = [];
  for (let i = existingSeries.length; i < desiredCount; i += 1) {
    additional.push(setSeriesIndex(cloneNode(template) as XmlElement, i));
  }

  const nextChildren = [...seriesContainer.children, ...additional];
  return setChildren(seriesContainer, nextChildren);
}

function patchContainerSeries(
  container: XmlElement,
  data: ChartData,
): XmlElement {
  const next = ensureSeriesCount(container, data.series.length);

  const seriesElements = getChildren(next, "c:ser");
  const patchedSeries = seriesElements.map((ser, idx) => {
    const s = data.series[idx];
    if (!s) {
      return ser;
    }
    const withIndex = setSeriesIndex(ser, idx);
    return patchSeriesData(withIndex, s);
  });

  // Replace all c:ser in order, preserve other children
  let seriesIndex = 0;
  const nextChildren = next.children.map((child) => {
    if (!isXmlElement(child) || child.name !== "c:ser") {
      return child;
    }
    const replacement = patchedSeries[seriesIndex];
    seriesIndex += 1;
    return replacement ?? child;
  });

  return setChildren(next, nextChildren);
}

function patchPlotAreaSeriesCategories(plotArea: XmlElement, categories: readonly string[]): XmlElement {
  const patchSeries = (ser: XmlElement): XmlElement => {
    const cat = getChild(ser, "c:cat");
    if (!cat) {
      return ser;
    }
    return replaceChildByName(ser, "c:cat", patchCategoryElement(cat, categories));
  };

  const patchAny = (node: XmlNode): XmlNode => {
    if (!isXmlElement(node)) {
      return node;
    }
    const nextChildren = node.children.map(patchAny);
    const nextEl = createElement(node.name, { ...node.attrs }, nextChildren);
    if (node.name !== "c:ser") {
      return nextEl;
    }
    return patchSeries(nextEl);
  };

  return patchAny(plotArea) as XmlElement;
}

function patchAllSeriesCategories(
  chartSpace: XmlElement,
  categories: readonly string[],
): XmlElement {
  const plotArea = getPlotArea(chartSpace);

  const seriesElements = findElements(plotArea, (el) => el.name === "c:ser");
  if (seriesElements.length === 0) {
    return chartSpace;
  }

  const patchedPlotArea = patchPlotAreaSeriesCategories(plotArea, categories);

  const chart = requireChild(chartSpace, "c:chart", "patchChartData");
  const nextChart = replaceChildByName(chart, "c:plotArea", patchedPlotArea);
  return replaceChildByName(chartSpace, "c:chart", nextChart);
}

function validateChartData(data: ChartData): void {
  if (!Array.isArray(data.categories)) {
    throw new Error("patchChartData: data.categories must be an array");
  }
  if (!Array.isArray(data.series)) {
    throw new Error("patchChartData: data.series must be an array");
  }
  for (const [idx, s] of data.series.entries()) {
    if (!s) {
      throw new Error(`patchChartData: series[${idx}] is missing`);
    }
    if (s.values.length !== data.categories.length) {
      throw new Error(
        `patchChartData: series[${idx}].values length (${s.values.length}) must match categories length (${data.categories.length})`,
      );
    }
  }
}

/**
 * Update chart cached categories + series values and names.
 */
export function patchChartData(chartXml: XmlDocument, data: ChartData): XmlDocument {
  validateChartData(data);

  return updateDocumentRoot(chartXml, (root) => {
    if (root.name !== "c:chartSpace") {
      throw new Error(`patchChartData: expected c:chartSpace root, got ${root.name}`);
    }

    const plotArea = getPlotArea(root);
    const containers = getSeriesContainers(plotArea);
    if (containers.length === 0) {
      throw new Error("patchChartData: no series container found under c:plotArea");
    }

    const patchedPlotArea = patchPlotAreaSeriesContainers(plotArea, containers, data);

    const chart = requireChild(root, "c:chart", "patchChartData");
    const nextChart = replaceChildByName(chart, "c:plotArea", patchedPlotArea);
    const withSeries = replaceChildByName(root, "c:chart", nextChart);

    return patchAllSeriesCategories(withSeries, data.categories);
  });
}

/**
 * Patch chart title (c:chart/c:title).
 */
export function patchChartTitle(chartXml: XmlDocument, title: string): XmlDocument {
  if (!title) {
    throw new Error("patchChartTitle: title is required");
  }

  return updateDocumentRoot(chartXml, (root) => {
    const chartSpace = root.name === "c:chartSpace" ? root : requireChartRoot(chartXml);
    const chart = requireChild(chartSpace, "c:chart", "patchChartTitle");

    const titleEl: XmlElement = createElement("c:title", {}, [
      createElement("c:tx", {}, [
        createElement("c:rich", {}, [
          createElement("a:bodyPr"),
          createElement("a:lstStyle"),
          createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText(title)])])]),
        ]),
      ]),
      createElement("c:layout"),
      createElement("c:overlay", { val: "0" }),
    ]);

    if (getChild(chart, "c:title")) {
      const nextChart = replaceChildByName(chart, "c:title", titleEl);
      return replaceChildByName(chartSpace, "c:chart", nextChart);
    }
    const nextChart = setChildren(chart, [...chart.children, titleEl]);
    return replaceChildByName(chartSpace, "c:chart", nextChart);
  });
}

/**
 * Patch chart style (c:chartSpace/c:style).
 */
export function patchChartStyle(chartXml: XmlDocument, styleId: number): XmlDocument {
  if (!Number.isFinite(styleId)) {
    throw new Error("patchChartStyle: styleId must be a finite number");
  }

  return updateDocumentRoot(chartXml, (root) => {
    const chartSpace = root.name === "c:chartSpace" ? root : requireChartRoot(chartXml);
    const styleEl = getChild(chartSpace, "c:style");
    if (styleEl) {
      return replaceChildByName(
        chartSpace,
        "c:style",
        createElement("c:style", { ...styleEl.attrs, val: String(styleId) }),
      );
    }
    return setChildren(chartSpace, [...chartSpace.children, createElement("c:style", { val: String(styleId) })]);
  });
}
