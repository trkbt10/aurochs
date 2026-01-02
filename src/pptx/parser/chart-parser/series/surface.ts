/**
 * @file Surface chart series parsing
 *
 * Surface charts display 3D surface data. They can be rendered as wireframe
 * or filled surfaces.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.189 (surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.188 (surface3DChart)
 */

import type { SurfaceSeries, SurfaceChartSeries, BandFormat } from "../../../domain/chart";
import { getChild, getChildren, type XmlElement } from "../../../../xml";
import { getIntAttr, getBoolAttr } from "../../primitive";
import { parseSeriesText, parseDataReference } from "../data-reference";
import { parseChartShapeProperties } from "../shape-properties";
import { parseDataLabels } from "../components";

function parseBandFormats(bandFmtsEl: XmlElement | undefined): readonly BandFormat[] | undefined {
  if (!bandFmtsEl) {return undefined;}
  const formats: BandFormat[] = [];
  for (const bandFmt of getChildren(bandFmtsEl, "c:bandFmt")) {
    const idxEl = getChild(bandFmt, "c:idx");
    if (!idxEl) {continue;}
    const idx = getIntAttr(idxEl, "val") ?? 0;
    formats.push({
      idx,
      shapeProperties: parseChartShapeProperties(getChild(bandFmt, "c:spPr")),
    });
  }
  return formats.length > 0 ? formats : undefined;
}

/**
 * Parse surface series (c:ser in c:surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.189 (surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseSurfaceSeries(ser: XmlElement): SurfaceSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    categories: parseDataReference(getChild(ser, "c:cat")),
    values: parseDataReference(getChild(ser, "c:val")),
  };
}

/**
 * Parse surface chart (c:surfaceChart, c:surface3DChart)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.189 (surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.188 (surface3DChart)
 */
export function parseSurfaceChart(
  surfaceChart: XmlElement,
  index: number,
  type: "surfaceChart" | "surface3DChart"
): SurfaceChartSeries {
  const wireframeEl = getChild(surfaceChart, "c:wireframe");

  const series: SurfaceSeries[] = [];
  for (const ser of getChildren(surfaceChart, "c:ser")) {
    const s = parseSurfaceSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type,
    index,
    order: index,
    wireframe: wireframeEl ? getBoolAttr(wireframeEl, "val") : undefined,
    bandFormats: parseBandFormats(getChild(surfaceChart, "c:bandFmts")),
    series,
    dataLabels: parseDataLabels(getChild(surfaceChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(surfaceChart, "c:spPr")),
  };
}
