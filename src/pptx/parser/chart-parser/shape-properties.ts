/**
 * @file Shape properties parsing for charts
 *
 * @see ECMA-376 Part 1, Section 21.2.2.188 (spPr)
 */

import type { ChartShapeProperties, ChartLines } from "../../domain/chart";
import { getChild, type XmlElement } from "../../../xml";
import { parseFillFromParent } from "../graphics/fill-parser";
import { getLineFromProperties } from "../graphics/line-parser";

/**
 * Parse shape properties (c:spPr)
 * @see ECMA-376 Part 1, Section 21.2.2.188 (spPr)
 */
export function parseChartShapeProperties(spPr: XmlElement | undefined): ChartShapeProperties | undefined {
  if (!spPr) {return undefined;}

  const fill = parseFillFromParent(spPr);
  const line = getLineFromProperties(spPr);

  if (!fill && !line) {return undefined;}

  return { fill, line };
}

/**
 * Parse chart lines (c:dropLines, c:hiLowLines, c:serLines, c:leaderLines)
 * @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
 * @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
 */
export function parseChartLines(linesEl: XmlElement | undefined): ChartLines | undefined {
  if (!linesEl) {return undefined;}

  return {
    shapeProperties: parseChartShapeProperties(getChild(linesEl, "c:spPr")),
  };
}
