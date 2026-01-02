/**
 * @file Graphic frame (p:graphicFrame) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.21 (p:graphicFrame)
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";
import type {
  GraphicContent,
  GraphicFrame,
  GraphicFrameLocks,
  OleObjectFollowColorScheme,
} from "../../domain";
import { parseTable } from "../table/table-parser";
import { parseTransform } from "../graphics/transform-parser";
import { getBoolAttr, getIntAttr, parseShapeId } from "../primitive";
import { parseNonVisualProperties } from "./non-visual";
import { getOleObjElement } from "./alternate-content";
import { parseBlipFillProperties } from "./pic";

function parseGraphicFrameLocks(element: XmlElement | undefined): GraphicFrameLocks | undefined {
  if (!element) {
    return undefined;
  }
  const noGrp = getBoolAttr(element, "noGrp");
  const noDrilldown = getBoolAttr(element, "noDrilldown");
  const noSelect = getBoolAttr(element, "noSelect");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  if (
    noGrp === undefined &&
    noDrilldown === undefined &&
    noSelect === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noDrilldown,
    noSelect,
    noChangeAspect,
    noMove,
    noResize,
  };
}

function parseOleObjectFollowColorScheme(
  value: string | undefined,
): OleObjectFollowColorScheme | undefined {
  switch (value) {
    case "full":
    case "none":
    case "textAndBackground":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse graphic content from graphicFrame
 */
function parseGraphicContent(graphicData: XmlElement | undefined): GraphicContent | undefined {
  if (!graphicData) {
    return undefined;
  }

  const uri = getAttr(graphicData, "uri") ?? "";

  // Table
  const tbl = getChild(graphicData, "a:tbl");
  if (tbl) {
    const table = parseTable(tbl);
    if (table) {
      return { type: "table", data: { table } };
    }
  }

  // Chart
  const chart = getChild(graphicData, "c:chart");
  if (chart) {
    const resourceId = getAttr(chart, "r:id");
    if (resourceId) {
      return { type: "chart", data: { resourceId } };
    }
  }

  // Diagram
  const relIds = getChild(graphicData, "dgm:relIds");
  if (relIds) {
    return {
      type: "diagram",
      data: {
        dataResourceId: getAttr(relIds, "r:dm"),
        layoutResourceId: getAttr(relIds, "r:lo"),
        styleResourceId: getAttr(relIds, "r:qs"),
        colorResourceId: getAttr(relIds, "r:cs"),
      },
    };
  }

  // OLE Object
  // @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
  // @see MS-OE376 Part 4 Section 4.4.2.4
  // Handle mc:AlternateContent fallback for cross-platform compatibility
  const oleObj = getOleObjElement(graphicData);
  if (oleObj) {
    const embed = getChild(oleObj, "p:embed");
    const followColorScheme = parseFollowColorScheme(embed);

    // Parse p:pic child for preview image (ECMA-376-1:2016 format)
    const picProps = parseOleObjectPreview(oleObj);

    return {
      type: "oleObject",
      data: {
        resourceId: getAttr(oleObj, "r:id"),
        progId: getAttr(oleObj, "progId"),
        name: getAttr(oleObj, "name"),
        spid: parseShapeId(getAttr(oleObj, "spid")),
        imgW: getIntAttr(oleObj, "imgW"),
        imgH: getIntAttr(oleObj, "imgH"),
        showAsIcon: getBoolAttr(oleObj, "showAsIcon"),
        followColorScheme,
        pic: picProps,
      },
    };
  }

  return { type: "unknown", uri };
}

/**
 * Parse graphic frame (p:graphicFrame)
 * @see ECMA-376 Part 1, Section 19.3.1.21
 */
export function parseGraphicFrame(element: XmlElement): GraphicFrame | undefined {
  const nvGraphicFramePr = getChild(element, "p:nvGraphicFramePr");
  const cNvPr = nvGraphicFramePr ? getChild(nvGraphicFramePr, "p:cNvPr") : undefined;
  const cNvGraphicFramePr = nvGraphicFramePr ? getChild(nvGraphicFramePr, "p:cNvGraphicFramePr") : undefined;
  const graphicFrameLocks = parseGraphicFrameLocksFromParent(cNvGraphicFramePr);

  const xfrm = getChild(element, "p:xfrm");
  const transform = parseTransform(xfrm);
  if (!transform) {
    return undefined;
  }

  const graphic = getChild(element, "a:graphic");
  const graphicData = graphic ? getChild(graphic, "a:graphicData") : undefined;
  const content = parseGraphicContent(graphicData);
  if (!content) {
    return undefined;
  }

  return {
    type: "graphicFrame",
    nonVisual: {
      ...parseNonVisualProperties(cNvPr),
      graphicFrameLocks,
    },
    transform,
    content,
  };
}

function parseOleObjectPreview(oleObj: XmlElement): ReturnType<typeof parseBlipFillProperties> | undefined {
  const pic = getChild(oleObj, "p:pic");
  if (!pic) {
    return undefined;
  }
  const blipFill = getChild(pic, "p:blipFill");
  return parseBlipFillProperties(blipFill);
}

function parseFollowColorScheme(embed: XmlElement | undefined): OleObjectFollowColorScheme | undefined {
  if (!embed) {
    return undefined;
  }
  return parseOleObjectFollowColorScheme(getAttr(embed, "followColorScheme"));
}

function parseGraphicFrameLocksFromParent(parent: XmlElement | undefined): GraphicFrameLocks | undefined {
  if (!parent) {
    return undefined;
  }
  return parseGraphicFrameLocks(getChild(parent, "a:graphicFrameLocks"));
}
