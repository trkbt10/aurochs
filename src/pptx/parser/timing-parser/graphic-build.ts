/**
 * @file Build properties parsing for charts/diagrams
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.1 (bldChart)
 * @see ECMA-376 Part 1, Section 20.1.2.2.2 (bldDgm)
 */

import { getAttr, type XmlElement } from "../../../xml";
import type { ChartBuild, DgmBuild } from "../../domain/animation";
import { mapChartBuildType, mapDgmBuildType } from "./mapping";

/**
 * Parse a:bldChart element.
 */
export function parseBuildChartElement(element: XmlElement | undefined): ChartBuild | undefined {
  if (!element) {return undefined;}
  const build = mapChartBuildType(getAttr(element, "bld"));
  const animBg = getAttr(element, "animBg");
  if (!build && animBg === undefined) {return undefined;}
  return {
    build,
    animateBackground: animBg === "1",
  };
}

/**
 * Parse a:bldDgm element.
 */
export function parseBuildDgmElement(element: XmlElement | undefined): DgmBuild | undefined {
  if (!element) {return undefined;}
  const build = mapDgmBuildType(getAttr(element, "bld"));
  if (!build) {return undefined;}
  return { build };
}
