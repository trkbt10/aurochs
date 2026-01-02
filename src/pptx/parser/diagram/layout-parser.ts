/**
 * @file Diagram layout definition parser
 *
 * Parses DiagramML layout definitions (dgm:layoutDef).
 */
/* eslint-disable curly, jsdoc/require-jsdoc -- layout parser uses guard clauses and many small helpers */

import type {
  DiagramAlgorithm,
  DiagramAlgorithmType,
  DiagramAlgorithmParam,
  DiagramAdjust,
  DiagramCategory,
  DiagramChoose,
  DiagramConstraint,
  DiagramForEach,
  DiagramElse,
  DiagramIf,
  DiagramLayoutDefinitionHeader,
  DiagramLayoutDefinitionHeaderList,
  DiagramLayoutContent,
  DiagramLayoutDefinition,
  DiagramLayoutNode,
  DiagramLayoutShape,
  DiagramLayoutShapeType,
  DiagramOutputShapeType,
  DiagramParameterId,
  DiagramParameterValue,
  DiagramPyramidAccentPosition,
  DiagramPyramidAccentTextMargin,
  DiagramRotationPath,
  DiagramSecondaryChildAlignment,
  DiagramSecondaryLinearDirection,
  DiagramStartingElement,
  DiagramTextAnchorHorizontal,
  DiagramTextAnchorVertical,
  DiagramTextBlockDirection,
  DiagramTextDirection,
  DiagramVerticalAlignment,
  DiagramPresentationOf,
  DiagramRule,
  DiagramAnimLvlStr,
  DiagramAnimOneStr,
  DiagramArrowheadStyle,
  DiagramAutoTextRotation,
  DiagramAxisType,
  DiagramAxisTypes,
  DiagramBendPoint,
  DiagramBooleans,
  DiagramBoolOperator,
  DiagramBreakpoint,
  DiagramCenterShapeMapping,
  DiagramChildAlignment,
  DiagramChildDirection,
  DiagramChildOrderType,
  DiagramConnectorDimension,
  DiagramConnectorPoint,
  DiagramConnectorRouting,
  DiagramConstraintRelationship,
  DiagramConstraintType,
  DiagramContinueDirection,
  DiagramHorizontalAlignment,
  DiagramNodeHorizontalAlignment,
  DiagramNodeVerticalAlignment,
  DiagramOffset,
  DiagramTextAlignment,
  DiagramDirection,
  DiagramElementType,
  DiagramElementTypes,
  DiagramFallbackDimension,
  DiagramFlowDirection,
  DiagramLinearDirection,
  DiagramFunctionArgument,
  DiagramFunctionOperator,
  DiagramFunctionType,
  DiagramFunctionValue,
  DiagramHierBranchStyle,
  DiagramResizeHandlesStr,
  DiagramVariableType,
  DiagramGrowDirection,
  DiagramHierarchyAlignment,
  DiagramIndex1,
  DiagramInts,
  DiagramUnsignedInts,
  DiagramVariableList,
} from "../../domain/diagram";
import type { XmlDocument, XmlElement } from "../../../xml/index";
import { getAttr, getByPath, getChild, getChildren, isXmlElement } from "../../../xml/index";
import { getIntAttr, parseBoolean, parseFloat64, parseInt32 } from "../primitive";
import { parseDiagramDataModelElement } from "./data-parser";

/**
 * Parse diagram layout definition from XML document.
 */
export function parseDiagramLayoutDefinition(
  doc: XmlDocument
): DiagramLayoutDefinition | undefined {
  const layoutDef = getByPath(doc, ["dgm:layoutDef"]);
  if (!layoutDef || !isXmlElement(layoutDef)) return undefined;

  const title = getAttrFromChild(layoutDef, "dgm:title", "val");
  const description = getAttrFromChild(layoutDef, "dgm:desc", "val");
  const categories = parseCategoryList(getChild(layoutDef, "dgm:catLst"));
  const sampDataEl = getChild(layoutDef, "dgm:sampData");
  const styleDataEl = getChild(layoutDef, "dgm:styleData");
  const colorDataEl = getChild(layoutDef, "dgm:clrData");
  const sampleData = parseDiagramDataModelElement(
    sampDataEl ? getChild(sampDataEl, "dgm:dataModel") : undefined
  );
  const styleData = parseDiagramDataModelElement(
    styleDataEl ? getChild(styleDataEl, "dgm:dataModel") : undefined
  );
  const colorData = parseDiagramDataModelElement(
    colorDataEl ? getChild(colorDataEl, "dgm:dataModel") : undefined
  );
  const layoutNode = parseLayoutNode(getChild(layoutDef, "dgm:layoutNode"));

  return {
    uniqueId: getAttr(layoutDef, "uniqueId"),
    title,
    description,
    categories,
    sampleData,
    styleData,
    colorData,
    layoutNode,
  };
}

export function parseDiagramLayoutDefinitionHeader(
  doc: XmlDocument
): DiagramLayoutDefinitionHeader | undefined {
  const header = getByPath(doc, ["dgm:layoutDefHdr"]);
  if (!header || !isXmlElement(header)) return undefined;
  return parseLayoutDefinitionHeader(header);
}

export function parseDiagramLayoutDefinitionHeaderList(
  doc: XmlDocument
): DiagramLayoutDefinitionHeaderList | undefined {
  const headerList = getByPath(doc, ["dgm:layoutDefHdrLst"]);
  if (!headerList || !isXmlElement(headerList)) return undefined;

  const headers = getChildren(headerList, "dgm:layoutDefHdr")
    .map(parseLayoutDefinitionHeader)
    .filter((header): header is DiagramLayoutDefinitionHeader => header !== undefined);

  if (headers.length === 0) return undefined;

  return { headers };
}

function parseCategoryList(element: XmlElement | undefined): readonly DiagramCategory[] | undefined {
  if (!element) return undefined;
  const categories = getChildren(element, "dgm:cat").map((cat) => ({
    type: getAttr(cat, "type"),
    priority: getIntAttr(cat, "pri"),
  }));
  if (categories.length === 0) return undefined;
  return categories;
}

function parseLayoutDefinitionHeader(
  element: XmlElement
): DiagramLayoutDefinitionHeader | undefined {
  const title = getAttrFromChild(element, "dgm:title", "val");
  const description = getAttrFromChild(element, "dgm:desc", "val");
  const categories = parseCategoryList(getChild(element, "dgm:catLst"));

  if (!title && !description && !categories && Object.keys(element.attrs).length === 0) {
    return undefined;
  }

  return {
    uniqueId: getAttr(element, "uniqueId"),
    title,
    description,
    categories,
    defaultStyle: getAttr(element, "defStyle"),
    minimumVersion: getAttr(element, "minVer"),
    resourceId: getIntAttr(element, "resId"),
  };
}

function parseLayoutNode(element: XmlElement | undefined): DiagramLayoutNode | undefined {
  if (!element) return undefined;

  const content = parseLayoutContent(element);

  return {
    name: getAttr(element, "name"),
    childOrder: parseChildOrderType(getAttr(element, "chOrder")),
    moveWith: getAttr(element, "moveWith"),
    styleLabel: getAttr(element, "styleLbl"),
    ...content,
  };
}

function parseLayoutContent(element: XmlElement): DiagramLayoutContent {
  const variables = parseVariableList(getChild(element, "dgm:varLst"));
  const algorithm = parseAlgorithm(getChild(element, "dgm:alg"));
  const shape = parseLayoutShape(getChild(element, "dgm:shape"));
  const presentationOf = parsePresentationOf(getChild(element, "dgm:presOf"));
  const constraints = parseConstraintList(getChild(element, "dgm:constrLst"));
  const rules = parseRuleList(getChild(element, "dgm:ruleLst"));
  const forEach = parseForEachList(getChildren(element, "dgm:forEach"));
  const choose = parseChooseList(getChildren(element, "dgm:choose"));
  const children = getChildren(element, "dgm:layoutNode")
    .map(parseLayoutNode)
    .filter((node): node is DiagramLayoutNode => node !== undefined);

  return {
    variables,
    algorithm,
    shape,
    presentationOf,
    constraints,
    rules,
    forEach,
    choose,
    children: children.length === 0 ? undefined : children,
  };
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

function parseAlgorithm(element: XmlElement | undefined): DiagramAlgorithm | undefined {
  if (!element) return undefined;

  const params = getChildren(element, "dgm:param").map(parseAlgorithmParam);

  return {
    type: parseAlgorithmType(getAttr(element, "type")),
    params: params.length === 0 ? undefined : params,
  };
}

function parseAlgorithmParam(element: XmlElement): DiagramAlgorithmParam {
  const type = parseParameterId(getAttr(element, "type"));

  return {
    type,
    value: parseParameterValue(type, getAttr(element, "val")),
  };
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

function parseAxisType(value: string | undefined): DiagramAxisType | undefined {
  return isAxisType(value) ? value : undefined;
}

function parseAxisTypes(value: string | undefined): DiagramAxisTypes | undefined {
  if (!value) return undefined;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parsed = tokens.map(parseAxisType);
  if (parsed.some((token) => token === undefined)) return undefined;
  return parsed as DiagramAxisTypes;
}

function parseBooleans(value: string | undefined): DiagramBooleans | undefined {
  if (!value) return undefined;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parsed = tokens.map(parseBooleanToken);
  if (parsed.some((token) => token === undefined)) return undefined;
  return parsed as DiagramBooleans;
}

function parseBooleanToken(value: string): boolean | undefined {
  switch (value) {
    case "1":
    case "true":
      return true;
    case "0":
    case "false":
      return false;
    default:
      return undefined;
  }
}

function parseBoolOperator(value: string | undefined): DiagramBoolOperator | undefined {
  return isBoolOperator(value) ? value : undefined;
}

function isBoolOperator(value: string | undefined): value is DiagramBoolOperator {
  switch (value) {
    case "equ":
    case "gte":
    case "lte":
    case "none":
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

function parseConstraintType(value: string | undefined): DiagramConstraintType | undefined {
  return isConstraintType(value) ? value : undefined;
}

function isConstraintType(value: string | undefined): value is DiagramConstraintType {
  switch (value) {
    case "alignOff":
    case "b":
    case "begMarg":
    case "begPad":
    case "bendDist":
    case "bMarg":
    case "bOff":
    case "connDist":
    case "ctrX":
    case "ctrXOff":
    case "ctrY":
    case "ctrYOff":
    case "diam":
    case "endMarg":
    case "endPad":
    case "h":
    case "hArH":
    case "hOff":
    case "l":
    case "lMarg":
    case "lOff":
    case "none":
    case "primFontSz":
    case "pyraAcctRatio":
    case "r":
    case "rMarg":
    case "rOff":
    case "secFontSz":
    case "secSibSp":
    case "sibSp":
    case "sp":
    case "stemThick":
    case "t":
    case "tMarg":
    case "tOff":
    case "userA":
    case "userB":
    case "userC":
    case "userD":
    case "userE":
    case "userF":
    case "userG":
    case "userH":
    case "userI":
    case "userJ":
    case "userK":
    case "userL":
    case "userM":
    case "userN":
    case "userO":
    case "userP":
    case "userQ":
    case "userR":
    case "userS":
    case "userT":
    case "userU":
    case "userV":
    case "userW":
    case "userX":
    case "userY":
    case "userZ":
    case "w":
    case "wArH":
    case "wOff":
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

function parseElementTypes(value: string | undefined): DiagramElementTypes | undefined {
  if (!value) return undefined;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parsed = tokens.map(parseElementType);
  if (parsed.some((token) => token === undefined)) return undefined;
  return parsed as DiagramElementTypes;
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

function parseFunctionArgument(
  value: string | undefined
): DiagramFunctionArgument | undefined {
  return isVariableType(value) ? value : undefined;
}

function isVariableType(value: string | undefined): value is DiagramVariableType {
  switch (value) {
    case "animLvl":
    case "animOne":
    case "bulEnabled":
    case "chMax":
    case "chPref":
    case "dir":
    case "hierBranch":
    case "none":
    case "orgChart":
    case "resizeHandles":
      return true;
    default:
      return false;
  }
}

function parseFunctionOperator(
  value: string | undefined
): DiagramFunctionOperator | undefined {
  return isFunctionOperator(value) ? value : undefined;
}

function isFunctionOperator(value: string | undefined): value is DiagramFunctionOperator {
  switch (value) {
    case "equ":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "neq":
      return true;
    default:
      return false;
  }
}

function parseFunctionType(value: string | undefined): DiagramFunctionType | undefined {
  return isFunctionType(value) ? value : undefined;
}

function isFunctionType(value: string | undefined): value is DiagramFunctionType {
  switch (value) {
    case "cnt":
    case "depth":
    case "maxDepth":
    case "pos":
    case "posEven":
    case "posOdd":
    case "revPos":
    case "var":
      return true;
    default:
      return false;
  }
}

function parseFunctionValue(value: string | undefined): DiagramFunctionValue | undefined {
  if (value === undefined) return undefined;

  const animLvl = parseAnimLvlStr(value);
  if (animLvl) return animLvl;
  const animOne = parseAnimOneStr(value);
  if (animOne) return animOne;
  const direction = parseDiagramDirection(value);
  if (direction) return direction;
  const hierBranch = parseHierBranchStyle(value);
  if (hierBranch) return hierBranch;
  const resizeHandles = parseResizeHandlesStr(value);
  if (resizeHandles) return resizeHandles;

  if (value === "true") return true;
  if (value === "false") return false;

  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return undefined;
}

function parseIndex1(value: string | undefined): DiagramIndex1 | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return undefined;
  return parsed as DiagramIndex1;
}

function parseInts(value: string | undefined): DiagramInts | undefined {
  if (!value) return undefined;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parsed = tokens.map(parseIntToken);
  if (parsed.some((token) => token === undefined)) return undefined;
  return parsed as DiagramInts;
}

function parseIntToken(value: string): number | undefined {
  if (!/^-?\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
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

function parseConstraintRelationship(
  value: string | undefined
): DiagramConstraintRelationship | undefined {
  return isConstraintRelationship(value) ? value : undefined;
}

function isConstraintRelationship(
  value: string | undefined
): value is DiagramConstraintRelationship {
  switch (value) {
    case "ch":
    case "des":
    case "self":
      return true;
    default:
      return false;
  }
}

function parseChildOrderType(value: string | undefined): DiagramChildOrderType | undefined {
  return isChildOrderType(value) ? value : undefined;
}

function isChildOrderType(value: string | undefined): value is DiagramChildOrderType {
  switch (value) {
    case "b":
    case "t":
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

function isAxisType(value: string | undefined): value is DiagramAxisType {
  switch (value) {
    case "ancst":
    case "ancstOrSelf":
    case "ch":
    case "des":
    case "desOrSelf":
    case "follow":
    case "followSib":
    case "none":
    case "par":
    case "preced":
    case "precedSib":
    case "root":
    case "self":
      return true;
    default:
      return false;
  }
}

function parseAlgorithmType(value: string | undefined): DiagramAlgorithmType | undefined {
  return isAlgorithmType(value) ? value : undefined;
}

function isAlgorithmType(value: string | undefined): value is DiagramAlgorithmType {
  switch (value) {
    case "composite":
    case "conn":
    case "cycle":
    case "hierChild":
    case "hierRoot":
    case "lin":
    case "pyra":
    case "snake":
    case "sp":
    case "tx":
      return true;
    default:
      return false;
  }
}

function parseLayoutShapeType(value: string | undefined): DiagramLayoutShapeType | undefined {
  if (!value) return undefined;
  if (isOutputShapeType(value)) return value;
  return value;
}

function isOutputShapeType(value: string | undefined): value is DiagramOutputShapeType {
  switch (value) {
    case "conn":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseParameterId(value: string | undefined): DiagramParameterId | undefined {
  return isParameterId(value) ? value : undefined;
}

function isParameterId(value: string | undefined): value is DiagramParameterId {
  switch (value) {
    case "alignTx":
    case "ar":
    case "autoTxRot":
    case "begPts":
    case "begSty":
    case "bendPt":
    case "bkpt":
    case "bkPtFixedVal":
    case "chAlign":
    case "chDir":
    case "connRout":
    case "contDir":
    case "ctrShpMap":
    case "dim":
    case "dstNode":
    case "endPts":
    case "endSty":
    case "fallback":
    case "flowDir":
    case "grDir":
    case "hierAlign":
    case "horzAlign":
    case "linDir":
    case "lnSpAfChP":
    case "lnSpAfParP":
    case "lnSpCh":
    case "lnSpPar":
    case "nodeHorzAlign":
    case "nodeVertAlign":
    case "off":
    case "parTxLTRAlign":
    case "parTxRTLAlign":
    case "pyraAcctBkgdNode":
    case "pyraAcctPos":
    case "pyraAcctTxMar":
    case "pyraAcctTxNode":
    case "pyraLvlNode":
    case "rotPath":
    case "rtShortDist":
    case "secChAlign":
    case "secLinDir":
    case "shpTxLTRAlignCh":
    case "shpTxRTLAlignCh":
    case "spanAng":
    case "srcNode":
    case "stAng":
    case "stBulletLvl":
    case "stElem":
    case "txAnchorHorz":
    case "txAnchorHorzCh":
    case "txAnchorVert":
    case "txAnchorVertCh":
    case "txBlDir":
    case "txDir":
    case "vertAlign":
      return true;
    default:
      return false;
  }
}

function parseParameterValue(
  type: DiagramParameterId | undefined,
  value: string | undefined
): DiagramParameterValue | undefined {
  if (!type) return value;

  switch (type) {
    case "alignTx":
    case "parTxLTRAlign":
    case "parTxRTLAlign":
    case "shpTxLTRAlignCh":
    case "shpTxRTLAlignCh":
      return parseDiagramTextAlignment(value);
    case "horzAlign":
      return parseHorizontalAlignment(value);
    case "nodeHorzAlign":
      return parseNodeHorizontalAlignment(value);
    case "nodeVertAlign":
      return parseNodeVerticalAlignment(value);
    case "autoTxRot":
      return parseAutoTextRotation(value);
    case "begPts":
    case "endPts":
      return parseConnectorPoint(value);
    case "begSty":
    case "endSty":
      return parseArrowheadStyle(value);
    case "bendPt":
      return parseBendPoint(value);
    case "bkpt":
      return parseBreakpoint(value);
    case "chAlign":
      return parseChildAlignment(value);
    case "chDir":
      return parseChildDirection(value);
    case "connRout":
      return parseConnectorRouting(value);
    case "contDir":
      return parseContinueDirection(value);
    case "ctrShpMap":
      return parseCenterShapeMapping(value);
    case "dim":
      return parseConnectorDimension(value);
    case "fallback":
      return parseFallbackDimension(value);
    case "flowDir":
      return parseFlowDirection(value);
    case "grDir":
      return parseGrowDirection(value);
    case "hierAlign":
      return parseHierarchyAlignment(value);
    case "linDir":
      return parseLinearDirection(value);
    case "off":
      return parseOffset(value);
    case "pyraAcctPos":
      return parsePyramidAccentPosition(value);
    case "pyraAcctTxMar":
      return parsePyramidAccentTextMargin(value);
    case "rotPath":
      return parseRotationPath(value);
    case "ar":
    case "bkPtFixedVal":
    case "lnSpAfChP":
    case "lnSpAfParP":
    case "lnSpCh":
    case "lnSpPar":
    case "spanAng":
    case "stAng":
      return parseFloat64(value);
    case "stBulletLvl":
      return parseInt32(value);
    case "rtShortDist":
      return parseBoolean(value);
    case "secChAlign":
      return parseSecondaryChildAlignment(value);
    case "secLinDir":
      return parseSecondaryLinearDirection(value);
    case "stElem":
      return parseStartingElement(value);
    case "txAnchorHorz":
    case "txAnchorHorzCh":
      return parseTextAnchorHorizontal(value);
    case "txAnchorVert":
    case "txAnchorVertCh":
      return parseTextAnchorVertical(value);
    case "txBlDir":
      return parseTextBlockDirection(value);
    case "txDir":
      return parseTextDirection(value);
    case "vertAlign":
      return parseVerticalAlignment(value);
    default:
      return value;
  }
}

function parsePyramidAccentPosition(
  value: string | undefined
): DiagramPyramidAccentPosition | undefined {
  return isPyramidAccentPosition(value) ? value : undefined;
}

function isPyramidAccentPosition(
  value: string | undefined
): value is DiagramPyramidAccentPosition {
  switch (value) {
    case "aft":
    case "bef":
      return true;
    default:
      return false;
  }
}

function parsePyramidAccentTextMargin(
  value: string | undefined
): DiagramPyramidAccentTextMargin | undefined {
  return isPyramidAccentTextMargin(value) ? value : undefined;
}

function isPyramidAccentTextMargin(
  value: string | undefined
): value is DiagramPyramidAccentTextMargin {
  switch (value) {
    case "stack":
    case "step":
      return true;
    default:
      return false;
  }
}

function parseRotationPath(value: string | undefined): DiagramRotationPath | undefined {
  return isRotationPath(value) ? value : undefined;
}

function isRotationPath(value: string | undefined): value is DiagramRotationPath {
  switch (value) {
    case "alongPath":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseSecondaryChildAlignment(
  value: string | undefined
): DiagramSecondaryChildAlignment | undefined {
  return isSecondaryChildAlignment(value) ? value : undefined;
}

function isSecondaryChildAlignment(
  value: string | undefined
): value is DiagramSecondaryChildAlignment {
  switch (value) {
    case "b":
    case "l":
    case "none":
    case "r":
    case "t":
      return true;
    default:
      return false;
  }
}

function parseSecondaryLinearDirection(
  value: string | undefined
): DiagramSecondaryLinearDirection | undefined {
  return isSecondaryLinearDirection(value) ? value : undefined;
}

function isSecondaryLinearDirection(
  value: string | undefined
): value is DiagramSecondaryLinearDirection {
  switch (value) {
    case "fromB":
    case "fromL":
    case "fromR":
    case "fromT":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseStartingElement(value: string | undefined): DiagramStartingElement | undefined {
  return isStartingElement(value) ? value : undefined;
}

function isStartingElement(value: string | undefined): value is DiagramStartingElement {
  switch (value) {
    case "node":
    case "trans":
      return true;
    default:
      return false;
  }
}

function parseTextAnchorHorizontal(
  value: string | undefined
): DiagramTextAnchorHorizontal | undefined {
  return isTextAnchorHorizontal(value) ? value : undefined;
}

function isTextAnchorHorizontal(
  value: string | undefined
): value is DiagramTextAnchorHorizontal {
  switch (value) {
    case "ctr":
    case "none":
      return true;
    default:
      return false;
  }
}

function parseTextAnchorVertical(
  value: string | undefined
): DiagramTextAnchorVertical | undefined {
  return isTextAnchorVertical(value) ? value : undefined;
}

function isTextAnchorVertical(
  value: string | undefined
): value is DiagramTextAnchorVertical {
  switch (value) {
    case "b":
    case "mid":
    case "t":
      return true;
    default:
      return false;
  }
}

function parseTextBlockDirection(
  value: string | undefined
): DiagramTextBlockDirection | undefined {
  return isTextBlockDirection(value) ? value : undefined;
}

function isTextBlockDirection(
  value: string | undefined
): value is DiagramTextBlockDirection {
  switch (value) {
    case "horz":
    case "vert":
      return true;
    default:
      return false;
  }
}

function parseTextDirection(value: string | undefined): DiagramTextDirection | undefined {
  return isTextDirection(value) ? value : undefined;
}

function isTextDirection(value: string | undefined): value is DiagramTextDirection {
  switch (value) {
    case "fromB":
    case "fromT":
      return true;
    default:
      return false;
  }
}

function parseVerticalAlignment(value: string | undefined): DiagramVerticalAlignment | undefined {
  return isVerticalAlignment(value) ? value : undefined;
}

function isVerticalAlignment(value: string | undefined): value is DiagramVerticalAlignment {
  switch (value) {
    case "b":
    case "mid":
    case "none":
    case "t":
      return true;
    default:
      return false;
  }
}

function parseUnsignedInts(value: string | undefined): DiagramUnsignedInts | undefined {
  if (!value) return undefined;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parsed = tokens.map(parseInt32);
  if (parsed.some((token) => token === undefined)) return undefined;
  if (parsed.some((token) => (token as number) < 0)) return undefined;
  return parsed as DiagramUnsignedInts;
}

function parseLayoutShape(element: XmlElement | undefined): DiagramLayoutShape | undefined {
  if (!element) return undefined;

  const adjustments = parseAdjustList(getChild(element, "dgm:adjLst"));

  return {
    type: parseLayoutShapeType(getAttr(element, "type")),
    blipId: getAttr(element, "r:blip"),
    adjustments,
  };
}

function parseAdjustList(element: XmlElement | undefined): readonly DiagramAdjust[] | undefined {
  if (!element) return undefined;
  const adjustments = getChildren(element, "dgm:adj").map((adj) => ({
    index: parseIndex1(getAttr(adj, "idx")),
    value: getAttr(adj, "val"),
  }));
  if (adjustments.length === 0) return undefined;
  return adjustments;
}

function parsePresentationOf(element: XmlElement | undefined): DiagramPresentationOf | undefined {
  if (!element) return undefined;
  return {
    axis: parseAxisTypes(getAttr(element, "axis")),
    pointType: parseElementTypes(getAttr(element, "ptType")),
    count: parseUnsignedInts(getAttr(element, "cnt")),
    hideLastTransition: parseBooleans(getAttr(element, "hideLastTrans")),
    start: parseInts(getAttr(element, "st")),
    step: parseInts(getAttr(element, "step")),
  };
}

function parseConstraintList(element: XmlElement | undefined): readonly DiagramConstraint[] | undefined {
  if (!element) return undefined;
  const constraints = getChildren(element, "dgm:constr").map(parseConstraint);
  if (constraints.length === 0) return undefined;
  return constraints;
}

function parseConstraint(element: XmlElement): DiagramConstraint {
  return {
    type: parseConstraintType(getAttr(element, "type")),
    forRelationship: parseConstraintRelationship(getAttr(element, "for")),
    forName: getAttr(element, "forName"),
    referenceType: parseConstraintType(getAttr(element, "refType")),
    referenceForRelationship: parseConstraintRelationship(getAttr(element, "refFor")),
    referenceForName: getAttr(element, "refForName"),
    operator: parseBoolOperator(getAttr(element, "op")),
    value: getAttr(element, "val"),
    factor: getAttr(element, "fact"),
    max: getAttr(element, "max"),
    min: getAttr(element, "min"),
  };
}

function parseRuleList(element: XmlElement | undefined): readonly DiagramRule[] | undefined {
  if (!element) return undefined;
  const rules = getChildren(element, "dgm:rule").map(parseRule);
  if (rules.length === 0) return undefined;
  return rules;
}

function parseRule(element: XmlElement): DiagramRule {
  return {
    type: getAttr(element, "type"),
    value: getAttr(element, "val"),
    factor: getAttr(element, "fact"),
    max: getAttr(element, "max"),
    min: getAttr(element, "min"),
  };
}

function parseForEachList(elements: readonly XmlElement[]): readonly DiagramForEach[] | undefined {
  if (elements.length === 0) return undefined;
  const forEach = elements.map(parseForEach);
  if (forEach.length === 0) return undefined;
  return forEach;
}

function parseForEach(element: XmlElement): DiagramForEach {
  return {
    name: getAttr(element, "name"),
    axis: parseAxisTypes(getAttr(element, "axis")),
    pointType: parseElementTypes(getAttr(element, "ptType")),
    count: parseUnsignedInts(getAttr(element, "cnt")),
    hideLastTransition: parseBooleans(getAttr(element, "hideLastTrans")),
    start: parseInts(getAttr(element, "st")),
    step: parseInts(getAttr(element, "step")),
    content: parseLayoutContent(element),
  };
}

function parseChooseList(elements: readonly XmlElement[]): readonly DiagramChoose[] | undefined {
  if (elements.length === 0) return undefined;
  const choose = elements
    .map(parseChoose)
    .filter((value): value is DiagramChoose => value !== undefined);
  if (choose.length === 0) return undefined;
  return choose;
}

function parseChoose(element: XmlElement): DiagramChoose | undefined {
  const ifElement = getChild(element, "dgm:if");
  const elseElement = getChild(element, "dgm:else");

  if (!ifElement && !elseElement) return undefined;

  return {
    name: getAttr(element, "name"),
    if: ifElement ? parseIf(ifElement) : undefined,
    else: elseElement ? parseElse(elseElement) : undefined,
  };
}

function parseIf(element: XmlElement): DiagramIf {
  return {
    name: getAttr(element, "name"),
    function: parseFunctionType(getAttr(element, "func")),
    argument: parseFunctionArgument(getAttr(element, "arg")),
    operator: parseFunctionOperator(getAttr(element, "op")),
    value: parseFunctionValue(getAttr(element, "val")),
    ...parseLayoutContent(element),
  };
}

function parseElse(element: XmlElement): DiagramElse {
  return {
    name: getAttr(element, "name"),
    ...parseLayoutContent(element),
  };
}

function stripPrefix(name: string): string {
  const idx = name.indexOf(":");
  return idx === -1 ? name : name.slice(idx + 1);
}

function getAttrFromChild(
  parent: XmlElement,
  childName: string,
  attrName: string
): string | undefined {
  const child = getChild(parent, childName);
  return child ? getAttr(child, attrName) : undefined;
}
