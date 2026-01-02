/**
 * @file Build list parsing for timing/animation
 *
 * @see ECMA-376 Part 1, Section 19.5.8 (p:bldLst)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "../../../xml";
import type { BuildEntry, GraphicBuild, TemplateEffect } from "../../domain/animation";
import { getBoolAttr, parseShapeId } from "../primitive";
import { mapOleChartBuildType, mapParaBuildType, parseDuration } from "./mapping";
import { parseBuildChartElement, parseBuildDgmElement } from "./graphic-build";
import { parseTimeNodeList } from "./time-node";

/**
 * Parse build paragraph (p:bldP).
 * @see ECMA-376 Part 1, Section 19.5.12
 */
export function parseBuildParagraph(bldP: XmlElement): BuildEntry | undefined {
  const spid = parseShapeId(getAttr(bldP, "spid"));
  if (!spid) {return undefined;}

  const grpId = getAttr(bldP, "grpId");
  const build = getAttr(bldP, "build");
  const animBg = getAttr(bldP, "animBg");
  const rev = getAttr(bldP, "rev");
  const advAuto = getAttr(bldP, "advAuto");
  const tmplLst = getChild(bldP, "p:tmplLst");

  return {
    shapeId: spid,
    groupId: grpId ? parseInt(grpId, 10) : undefined,
    buildType: mapParaBuildType(build),
    advanceAfter: parseDuration(advAuto),
    animateBackground: animBg === "1",
    reverse: rev === "1",
    templateEffects: tmplLst ? parseTemplateList(tmplLst) : undefined,
  };
}

function parseTemplateList(tmplLst: XmlElement): readonly TemplateEffect[] {
  const templates: TemplateEffect[] = [];

  for (const tmpl of getChildren(tmplLst, "p:tmpl")) {
    const levelAttr = getAttr(tmpl, "lvl");
    const level = levelAttr ? parseInt(levelAttr, 10) : undefined;
    const tnLst = getChild(tmpl, "p:tnLst");
    if (!tnLst) {continue;}
    const timeNodes = parseTimeNodeList(tnLst);
    templates.push({ level, timeNodes });
  }

  return templates;
}

function parseGraphicBuildElement(bldGraphic: XmlElement): GraphicBuild | undefined {
  const bldAsOne = getChild(bldGraphic, "p:bldAsOne");
  if (bldAsOne) {
    return { type: "asOne" };
  }

  const bldSub = getChild(bldGraphic, "p:bldSub");
  if (!bldSub) {return undefined;}

  const chartBuild = parseBuildChartElement(getChild(bldSub, "a:bldChart"));
  const diagramBuild = parseBuildDgmElement(getChild(bldSub, "a:bldDgm"));
  if (!chartBuild && !diagramBuild) {return undefined;}

  return {
    type: "sub",
    chartBuild,
    diagramBuild,
  };
}

/**
 * Parse build graphic (p:bldGraphic).
 * @see ECMA-376 Part 1, Section 19.5.13
 */
export function parseBuildGraphic(bldGraphic: XmlElement): BuildEntry | undefined {
  const spid = parseShapeId(getAttr(bldGraphic, "spid"));
  if (!spid) {return undefined;}

  const grpId = getAttr(bldGraphic, "grpId");
  const graphicBuild = parseGraphicBuildElement(bldGraphic);

  return {
    shapeId: spid,
    groupId: grpId ? parseInt(grpId, 10) : undefined,
    uiExpand: getBoolAttr(bldGraphic, "uiExpand"),
    graphicBuild,
  };
}

/**
 * Parse build embedded chart (p:bldOleChart).
 * @see ECMA-376 Part 1, Section 19.5.15
 */
export function parseBuildOleChart(bldOleChart: XmlElement): BuildEntry | undefined {
  const spid = parseShapeId(getAttr(bldOleChart, "spid"));
  if (!spid) {return undefined;}

  const grpId = getAttr(bldOleChart, "grpId");
  const build = mapOleChartBuildType(getAttr(bldOleChart, "bld"));
  const animBg = getBoolAttr(bldOleChart, "animBg");
  const oleChartBuild = resolveOleChartBuild(build, animBg);

  return {
    shapeId: spid,
    groupId: grpId ? parseInt(grpId, 10) : undefined,
    uiExpand: getBoolAttr(bldOleChart, "uiExpand"),
    oleChartBuild,
  };
}

function resolveOleChartBuild(
  build: ReturnType<typeof mapOleChartBuildType>,
  animateBackground: boolean | undefined,
): { build?: ReturnType<typeof mapOleChartBuildType>; animateBackground?: boolean } | undefined {
  if (build !== undefined || animateBackground !== undefined) {
    return { build, animateBackground };
  }
  return undefined;
}

/**
 * Parse build list (p:bldLst).
 * @see ECMA-376 Part 1, Section 19.5.8
 */
export function parseBuildList(bldLst: XmlElement): readonly BuildEntry[] {
  const entries: BuildEntry[] = [];

  for (const bldP of getChildren(bldLst, "p:bldP")) {
    const entry = parseBuildParagraph(bldP);
    if (entry) {entries.push(entry);}
  }

  for (const bldGraphic of getChildren(bldLst, "p:bldGraphic")) {
    const entry = parseBuildGraphic(bldGraphic);
    if (entry) {entries.push(entry);}
  }

  for (const bldOleChart of getChildren(bldLst, "p:bldOleChart")) {
    const entry = parseBuildOleChart(bldOleChart);
    if (entry) {entries.push(entry);}
  }

  return entries;
}
