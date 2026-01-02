/**
 * @file Diagram data model parser
 *
 * Parses DiagramML data model (dgm:dataModel) used by SmartArt.
 */
/* eslint-disable curly -- diagram parsers use guard clauses for readability */

import type {
  DiagramBackground,
  DiagramConnection,
  DiagramDataModel,
  DiagramExtension,
  DiagramPoint,
  DiagramPropertySet,
  DiagramPrSetCustVal,
  DiagramAnimLvlStr,
  DiagramAnimOneStr,
  DiagramArrowheadStyle,
  DiagramAutoTextRotation,
  DiagramBendPoint,
  DiagramBreakpoint,
  DiagramCenterShapeMapping,
  DiagramChildAlignment,
  DiagramChildDirection,
  DiagramConnectorDimension,
  DiagramConnectorPoint,
  DiagramConnectorRouting,
  DiagramContinueDirection,
  DiagramCxnType,
  DiagramHorizontalAlignment,
  DiagramNodeHorizontalAlignment,
  DiagramNodeVerticalAlignment,
  DiagramOffset,
  DiagramTextAlignment,
  DiagramDirection,
  DiagramElementType,
  DiagramFallbackDimension,
  DiagramFlowDirection,
  DiagramLinearDirection,
  DiagramHierBranchStyle,
  DiagramResizeHandlesStr,
  DiagramGrowDirection,
  DiagramHierarchyAlignment,
  DiagramModelId,
  DiagramVariableList,
  DiagramWhole,
} from "../../domain/diagram";
import type { XmlDocument, XmlElement } from "../../../xml/index";
import { getAttr, getByPath, getChild, getChildren, isXmlElement } from "../../../xml/index";
import { getBoolAttr, getIntAttr, parsePercentage } from "../primitive";
import { parseShapeProperties } from "../shape-parser/properties";
import { parseTextBody } from "../text/text-parser";

/**
 * Parse diagram data model from XML document.
 */
export function parseDiagramDataModel(doc: XmlDocument): DiagramDataModel | undefined {
  const dataModel = getByPath(doc, ["dgm:dataModel"]);
  if (!dataModel || !isXmlElement(dataModel)) return undefined;
  return parseDiagramDataModelElement(dataModel);
}

/**
 * Parse diagram data model from element.
 */
export function parseDiagramDataModelElement(
  element: XmlElement | undefined
): DiagramDataModel | undefined {
  if (!element) return undefined;

  const points = parsePointList(getChild(element, "dgm:ptLst"));
  const connections = parseConnectionList(getChild(element, "dgm:cxnLst"));
  const background = parseBackground(getChild(element, "dgm:bg"));
  const whole = parseWhole(getChild(element, "dgm:whole"));
  const extensions = parseExtensionList(getChild(element, "dgm:extLst"));

  return {
    points,
    connections,
    background,
    whole,
    extensions,
  };
}

function parsePointList(element: XmlElement | undefined): readonly DiagramPoint[] {
  if (!element) return [];
  return getChildren(element, "dgm:pt").map(parsePoint);
}

function parsePoint(element: XmlElement): DiagramPoint {
  const modelId = parseModelId(getAttr(element, "modelId")) ?? "";
  const type = parseElementType(getAttr(element, "type"));
  const connectionId = getAttr(element, "cxnId");
  const propertySet = parsePropertySet(getChild(element, "dgm:prSet"));
  const shapeProperties = parseShapeProperties(getChild(element, "dgm:spPr"));
  const textBody = parseTextBody(getChild(element, "dgm:t"));
  const extensions = parseExtensionList(getChild(element, "dgm:extLst"));

  return {
    modelId,
    type,
    connectionId,
    propertySet,
    shapeProperties,
    textBody,
    extensions,
  };
}

function parsePropertySet(element: XmlElement | undefined): DiagramPropertySet | undefined {
  if (!element) return undefined;

  const placeholder = getBoolAttr(element, "phldr");

  return {
    layoutTypeId: getAttr(element, "loTypeId"),
    layoutCategoryId: getAttr(element, "loCatId"),
    quickStyleTypeId: getAttr(element, "qsTypeId"),
    quickStyleCategoryId: getAttr(element, "qsCatId"),
    colorTypeId: getAttr(element, "csTypeId"),
    colorCategoryId: getAttr(element, "csCatId"),
    coherent3DOff: getBoolAttr(element, "coherent3DOff"),
    customAngle: getIntAttr(element, "custAng"),
    customFlipHorizontal: getBoolAttr(element, "custFlipHor"),
    customFlipVertical: getBoolAttr(element, "custFlipVert"),
    customSizeX: getIntAttr(element, "custSzX"),
    customSizeY: getIntAttr(element, "custSzY"),
    customScaleX: parsePrSetCustVal(getAttr(element, "custScaleX")),
    customScaleY: parsePrSetCustVal(getAttr(element, "custScaleY")),
    customText: getBoolAttr(element, "custT"),
    customLinearFactorX: parsePrSetCustVal(getAttr(element, "custLinFactX")),
    customLinearFactorY: parsePrSetCustVal(getAttr(element, "custLinFactY")),
    customLinearFactorNeighborX: parsePrSetCustVal(getAttr(element, "custLinFactNeighborX")),
    customLinearFactorNeighborY: parsePrSetCustVal(getAttr(element, "custLinFactNeighborY")),
    customRadiusScale: parsePrSetCustVal(getAttr(element, "custRadScaleRad")),
    customRadiusScaleInclude: parsePrSetCustVal(getAttr(element, "custRadScaleInc")),
    placeholder,
    placeholderText: getAttr(element, "phldrT"),
    presentationAssocId: getAttr(element, "presAssocID"),
    presentationName: getAttr(element, "presName"),
    presentationStyleLabel: getAttr(element, "presStyleLbl"),
    presentationStyleIndex: getIntAttr(element, "presStyleIdx"),
    presentationStyleCount: getIntAttr(element, "presStyleCnt"),
    presentationLayoutVars: parseVariableList(getChild(element, "dgm:presLayoutVars")),
  };
}

function parsePrSetCustVal(value: string | undefined): DiagramPrSetCustVal | undefined {
  return parsePercentage(value);
}

function parseVariableList(element: XmlElement | undefined): DiagramVariableList | undefined {
  if (!element) return undefined;

  const variables = element.children
    .filter(isXmlElement)
    .map((child) => ({
      name: stripPrefix(child.name),
      value: parseVariableValue(stripPrefix(child.name), getAttr(child, "val")),
    }));

  if (variables.length === 0) return undefined;

  return { variables };
}

function parseVariableValue(name: string, value: string | undefined): string | undefined {
  if (name === "animLvl") return parseAnimLvlStr(value);
  if (name === "animOne") return parseAnimOneStr(value);
  if (name === "begSty" || name === "endSty") return parseArrowheadStyle(value);
  if (name === "autoTxRot") return parseAutoTextRotation(value);
  if (name === "bendPt") return parseBendPoint(value);
  if (name === "break") return parseBreakpoint(value);
  if (name === "ctrShpMap") return parseCenterShapeMapping(value);
  if (name === "chAlign") return parseChildAlignment(value);
  if (name === "chDir") return parseChildDirection(value);
  if (name === "dim") return parseConnectorDimension(value);
  if (name === "begPts" || name === "endPts") return parseConnectorPoint(value);
  if (name === "connRout") return parseConnectorRouting(value);
  if (name === "contDir") return parseContinueDirection(value);
  if (name === "horzAlign") return parseHorizontalAlignment(value);
  if (name === "nodeHorzAlign") return parseNodeHorizontalAlignment(value);
  if (name === "nodeVertAlign") return parseNodeVerticalAlignment(value);
  if (name === "off") return parseOffset(value);
  if (
    name === "alignTx"
    || name === "parTxLTRAlign"
    || name === "parTxRTLAlign"
    || name === "shpTxLTRAlignCh"
    || name === "shpTxRTLAlignCh"
  ) {
    return parseDiagramTextAlignment(value);
  }
  if (name === "dir") return parseDiagramDirection(value);
  if (name === "fallback") return parseFallbackDimension(value);
  if (name === "hierBranch") return parseHierBranchStyle(value);
  if (name === "resizeHandles") return parseResizeHandlesStr(value);
  if (name === "flowDir") return parseFlowDirection(value);
  if (name === "linDir") return parseLinearDirection(value);
  if (name === "grDir") return parseGrowDirection(value);
  if (name === "hierAlign") return parseHierarchyAlignment(value);
  return value;
}

function parseAnimLvlStr(value: string | undefined): DiagramAnimLvlStr | undefined {
  return isAnimLvlStr(value) ? value : undefined;
}

function isAnimLvlStr(value: string | undefined): value is DiagramAnimLvlStr {
  switch (value) {
    case "ctr":
    case "lvl":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseAnimOneStr(value: string | undefined): DiagramAnimOneStr | undefined {
  return isAnimOneStr(value) ? value : undefined;
}

function isAnimOneStr(value: string | undefined): value is DiagramAnimOneStr {
  switch (value) {
    case "branch":
    case "none":
    case "one":
      return true;
    default:
      return false;
  }
}

function parseArrowheadStyle(value: string | undefined): DiagramArrowheadStyle | undefined {
  return isArrowheadStyle(value) ? value : undefined;
}

function isArrowheadStyle(value: string | undefined): value is DiagramArrowheadStyle {
  switch (value) {
    case "auto":
    case "arr":
    case "noArr":
      return true;
    default:
      return false;
  }
}

function parseAutoTextRotation(value: string | undefined): DiagramAutoTextRotation | undefined {
  return isAutoTextRotation(value) ? value : undefined;
}

function isAutoTextRotation(value: string | undefined): value is DiagramAutoTextRotation {
  switch (value) {
    case "grav":
    case "none":
    case "upr":
      return true;
    default:
      return false;
  }
}

function parseBendPoint(value: string | undefined): DiagramBendPoint | undefined {
  return isBendPoint(value) ? value : undefined;
}

function isBendPoint(value: string | undefined): value is DiagramBendPoint {
  switch (value) {
    case "beg":
    case "def":
    case "end":
      return true;
    default:
      return false;
  }
}

function parseBreakpoint(value: string | undefined): DiagramBreakpoint | undefined {
  return isBreakpoint(value) ? value : undefined;
}

function isBreakpoint(value: string | undefined): value is DiagramBreakpoint {
  switch (value) {
    case "bal":
    case "endCnv":
    case "fixed":
      return true;
    default:
      return false;
  }
}

function parseCenterShapeMapping(value: string | undefined): DiagramCenterShapeMapping | undefined {
  return isCenterShapeMapping(value) ? value : undefined;
}

function isCenterShapeMapping(value: string | undefined): value is DiagramCenterShapeMapping {
  switch (value) {
    case "fNode":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseChildAlignment(value: string | undefined): DiagramChildAlignment | undefined {
  return isChildAlignment(value) ? value : undefined;
}

function isChildAlignment(value: string | undefined): value is DiagramChildAlignment {
  switch (value) {
    case "b":
    case "l":
    case "r":
    case "t":
      return true;
    default:
      return false;
  }
}

function parseChildDirection(value: string | undefined): DiagramChildDirection | undefined {
  return isChildDirection(value) ? value : undefined;
}

function isChildDirection(value: string | undefined): value is DiagramChildDirection {
  switch (value) {
    case "horz":
    case "vert":
      return true;
    default:
      return false;
  }
}

function parseConnectorDimension(value: string | undefined): DiagramConnectorDimension | undefined {
  return isConnectorDimension(value) ? value : undefined;
}

function isConnectorDimension(value: string | undefined): value is DiagramConnectorDimension {
  switch (value) {
    case "1D":
    case "2D":
    case "cust":
      return true;
    default:
      return false;
  }
}

function parseConnectorPoint(value: string | undefined): DiagramConnectorPoint | undefined {
  return isConnectorPoint(value) ? value : undefined;
}

function isConnectorPoint(value: string | undefined): value is DiagramConnectorPoint {
  switch (value) {
    case "auto":
    case "bCtr":
    case "bL":
    case "bR":
    case "ctr":
    case "midL":
    case "midR":
    case "radial":
    case "tCtr":
    case "tL":
    case "tR":
      return true;
    default:
      return false;
  }
}

function parseConnectorRouting(value: string | undefined): DiagramConnectorRouting | undefined {
  return isConnectorRouting(value) ? value : undefined;
}

function isConnectorRouting(value: string | undefined): value is DiagramConnectorRouting {
  switch (value) {
    case "bend":
    case "curve":
    case "longCurve":
    case "stra":
      return true;
    default:
      return false;
  }
}

function parseContinueDirection(value: string | undefined): DiagramContinueDirection | undefined {
  return isContinueDirection(value) ? value : undefined;
}

function isContinueDirection(value: string | undefined): value is DiagramContinueDirection {
  switch (value) {
    case "revDir":
    case "sameDir":
      return true;
    default:
      return false;
  }
}

function parseHorizontalAlignment(
  value: string | undefined
): DiagramHorizontalAlignment | undefined {
  return isHorizontalAlignment(value) ? value : undefined;
}

function isHorizontalAlignment(value: string | undefined): value is DiagramHorizontalAlignment {
  switch (value) {
    case "ctr":
    case "l":
    case "none":
    case "r":
      return true;
    default:
      return false;
  }
}

function parseNodeHorizontalAlignment(
  value: string | undefined
): DiagramNodeHorizontalAlignment | undefined {
  return isNodeHorizontalAlignment(value) ? value : undefined;
}

function isNodeHorizontalAlignment(
  value: string | undefined
): value is DiagramNodeHorizontalAlignment {
  switch (value) {
    case "ctr":
    case "l":
    case "r":
      return true;
    default:
      return false;
  }
}

function parseNodeVerticalAlignment(
  value: string | undefined
): DiagramNodeVerticalAlignment | undefined {
  return isNodeVerticalAlignment(value) ? value : undefined;
}

function isNodeVerticalAlignment(
  value: string | undefined
): value is DiagramNodeVerticalAlignment {
  switch (value) {
    case "b":
    case "mid":
    case "t":
      return true;
    default:
      return false;
  }
}

function parseOffset(value: string | undefined): DiagramOffset | undefined {
  return isOffset(value) ? value : undefined;
}

function isOffset(value: string | undefined): value is DiagramOffset {
  switch (value) {
    case "ctr":
    case "off":
      return true;
    default:
      return false;
  }
}

function parseDiagramTextAlignment(
  value: string | undefined
): DiagramTextAlignment | undefined {
  return isDiagramTextAlignment(value) ? value : undefined;
}

function isDiagramTextAlignment(value: string | undefined): value is DiagramTextAlignment {
  switch (value) {
    case "ctr":
    case "l":
    case "r":
      return true;
    default:
      return false;
  }
}

function parseDiagramDirection(value: string | undefined): DiagramDirection | undefined {
  return isDiagramDirection(value) ? value : undefined;
}

function isDiagramDirection(value: string | undefined): value is DiagramDirection {
  switch (value) {
    case "norm":
    case "rev":
      return true;
    default:
      return false;
  }
}

function parseElementType(value: string | undefined): DiagramElementType | undefined {
  return isElementType(value) ? value : undefined;
}

function isElementType(value: string | undefined): value is DiagramElementType {
  switch (value) {
    case "all":
    case "asst":
    case "doc":
    case "node":
    case "nonAsst":
    case "nonNorm":
    case "norm":
    case "parTrans":
    case "pres":
    case "sibTrans":
      return true;
    default:
      return false;
  }
}

function parseFallbackDimension(
  value: string | undefined
): DiagramFallbackDimension | undefined {
  return isFallbackDimension(value) ? value : undefined;
}

function isFallbackDimension(value: string | undefined): value is DiagramFallbackDimension {
  switch (value) {
    case "1D":
    case "2D":
      return true;
    default:
      return false;
  }
}

function parseHierBranchStyle(value: string | undefined): DiagramHierBranchStyle | undefined {
  return isHierBranchStyle(value) ? value : undefined;
}

function isHierBranchStyle(value: string | undefined): value is DiagramHierBranchStyle {
  switch (value) {
    case "hang":
    case "init":
    case "l":
    case "r":
    case "std":
      return true;
    default:
      return false;
  }
}

function parseResizeHandlesStr(value: string | undefined): DiagramResizeHandlesStr | undefined {
  return isResizeHandlesStr(value) ? value : undefined;
}

function isResizeHandlesStr(value: string | undefined): value is DiagramResizeHandlesStr {
  switch (value) {
    case "exact":
    case "rel":
      return true;
    default:
      return false;
  }
}

function parseGrowDirection(value: string | undefined): DiagramGrowDirection | undefined {
  return isGrowDirection(value) ? value : undefined;
}

function isGrowDirection(value: string | undefined): value is DiagramGrowDirection {
  switch (value) {
    case "bL":
    case "bR":
    case "tL":
    case "tR":
      return true;
    default:
      return false;
  }
}

function parseHierarchyAlignment(
  value: string | undefined
): DiagramHierarchyAlignment | undefined {
  return isHierarchyAlignment(value) ? value : undefined;
}

function isHierarchyAlignment(value: string | undefined): value is DiagramHierarchyAlignment {
  switch (value) {
    case "bCtrCh":
    case "bCtrDes":
    case "bL":
    case "bR":
    case "lB":
    case "lCtrCh":
    case "lCtrDes":
    case "lT":
    case "rB":
    case "rCtrCh":
    case "rCtrDes":
    case "rT":
    case "tCtrCh":
    case "tCtrDes":
    case "tL":
    case "tR":
      return true;
    default:
      return false;
  }
}

function parseFlowDirection(value: string | undefined): DiagramFlowDirection | undefined {
  return isFlowDirection(value) ? value : undefined;
}

function isFlowDirection(value: string | undefined): value is DiagramFlowDirection {
  switch (value) {
    case "col":
    case "row":
      return true;
    default:
      return false;
  }
}

function parseLinearDirection(value: string | undefined): DiagramLinearDirection | undefined {
  return isLinearDirection(value) ? value : undefined;
}

function isLinearDirection(value: string | undefined): value is DiagramLinearDirection {
  switch (value) {
    case "fromB":
    case "fromL":
    case "fromR":
    case "fromT":
      return true;
    default:
      return false;
  }
}

function parseModelId(value: string | undefined): DiagramModelId | undefined {
  if (!value) return undefined;
  if (isGuid(value)) return value;
  if (isModelIdInt(value)) return value;
  return undefined;
}

function isGuid(value: string): boolean {
  return /^\{?[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}\}?$/.test(value);
}

function isModelIdInt(value: string): boolean {
  return /^-?\d+$/.test(value);
}

function parseCxnType(value: string | undefined): DiagramCxnType | undefined {
  return isCxnType(value) ? value : undefined;
}

function isCxnType(value: string | undefined): value is DiagramCxnType {
  switch (value) {
    case "parOf":
    case "presOf":
    case "presParOf":
    case "unknownRelationship":
      return true;
    default:
      return false;
  }
}

function parseConnectionList(element: XmlElement | undefined): readonly DiagramConnection[] {
  if (!element) return [];
  return getChildren(element, "dgm:cxn").map(parseConnection);
}

function parseConnection(element: XmlElement): DiagramConnection {
  const modelId = parseModelId(getAttr(element, "modelId")) ?? "";

  return {
    modelId,
    type: parseCxnType(getAttr(element, "type")),
    sourceId: getAttr(element, "srcId"),
    destinationId: getAttr(element, "destId"),
    sourceOrder: getIntAttr(element, "srcOrd"),
    destinationOrder: getIntAttr(element, "destOrd"),
    parentTransitionId: getAttr(element, "parTransId"),
    siblingTransitionId: getAttr(element, "sibTransId"),
    presentationId: getAttr(element, "presId"),
  };
}

function parseBackground(element: XmlElement | undefined): DiagramBackground | undefined {
  if (!element) return undefined;
  return { present: true };
}

function parseWhole(element: XmlElement | undefined): DiagramWhole | undefined {
  if (!element) return undefined;
  return { present: true };
}

function parseExtensionList(element: XmlElement | undefined): readonly DiagramExtension[] | undefined {
  if (!element) return undefined;

  const extensions = getChildren(element, "a:ext").map((ext) => {
    const dataModelExt = getChild(ext, "dsp:dataModelExt");
    const dataModelExtValue = parseDataModelExt(dataModelExt);
    return {
      uri: getAttr(ext, "uri"),
      dataModelExt: dataModelExtValue,
    } satisfies DiagramExtension;
  });

  if (extensions.length === 0) return undefined;

  return extensions;
}

function stripPrefix(name: string): string {
  const idx = name.indexOf(":");
  return idx === -1 ? name : name.slice(idx + 1);
}

function parseDataModelExt(
  element: XmlElement | undefined,
): DiagramExtension["dataModelExt"] | undefined {
  if (!element) {
    return undefined;
  }
  return {
    relId: getAttr(element, "relId"),
    minVersion: getAttr(element, "minVer"),
  };
}
