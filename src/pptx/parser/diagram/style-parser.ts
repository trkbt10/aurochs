/**
 * @file Diagram style definition parser
 *
 * Parses DiagramML style definitions (dgm:styleDef).
 */
/* eslint-disable curly, jsdoc/require-jsdoc -- diagram parser uses guard clauses and helper mappings */

import type {
  DiagramCategory,
  DiagramStyleDefinition,
  DiagramStyleDefinitionHeader,
  DiagramStyleDefinitionHeaderList,
  DiagramStyleLabel,
} from "../../domain/diagram";
import type { Fill, Rotation3d, Scene3d, Shape3d } from "../../domain/index";
import type { Color } from "../../domain/color";
import type { BevelPresetType } from "../../domain/shape";
import type {
  LightRigDirection,
  LightRigType,
  PresetCameraType,
  PresetMaterialType,
} from "../../domain/types";
import type { XmlDocument, XmlElement } from "../../../xml/index";
import { getAttr, getByPath, getChild, getChildren, isXmlElement } from "../../../xml/index";
import { getAngleAttr, getEmuAttr, getIntAttr, getPercent100kAttr } from "../primitive";
import { parseTextBody } from "../text/text-parser";
import { parseShapeStyle } from "../shape-parser/style";
import { parseColorFromParent } from "../graphics/color-parser";

/**
 * Parse diagram style definition from XML document.
 */
export function parseDiagramStyleDefinition(
  doc: XmlDocument
): DiagramStyleDefinition | undefined {
  const styleDef = getByPath(doc, ["dgm:styleDef"]);
  if (!styleDef || !isXmlElement(styleDef)) return undefined;

  const title = getAttrFromChild(styleDef, "dgm:title", "val");
  const description = getAttrFromChild(styleDef, "dgm:desc", "val");
  const categories = parseCategoryList(getChild(styleDef, "dgm:catLst"));
  const scene3d = parseDiagramScene3d(getChild(styleDef, "dgm:scene3d"));
  const styleLabels = parseStyleLabels(getChildren(styleDef, "dgm:styleLbl"));

  return {
    uniqueId: getAttr(styleDef, "uniqueId"),
    title,
    description,
    categories,
    scene3d,
    styleLabels,
  };
}

export function parseDiagramStyleDefinitionHeader(
  doc: XmlDocument
): DiagramStyleDefinitionHeader | undefined {
  const header = getByPath(doc, ["dgm:styleDefHdr"]);
  if (!header || !isXmlElement(header)) return undefined;
  return parseStyleDefinitionHeader(header);
}

export function parseDiagramStyleDefinitionHeaderList(
  doc: XmlDocument
): DiagramStyleDefinitionHeaderList | undefined {
  const headerList = getByPath(doc, ["dgm:styleDefHdrLst"]);
  if (!headerList || !isXmlElement(headerList)) return undefined;

  const headers = getChildren(headerList, "dgm:styleDefHdr")
    .map(parseStyleDefinitionHeader)
    .filter((header): header is DiagramStyleDefinitionHeader => header !== undefined);

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

function parseStyleLabels(elements: readonly XmlElement[]): readonly DiagramStyleLabel[] | undefined {
  if (elements.length === 0) return undefined;
  const labels = elements.map(parseStyleLabel).filter((label) => label !== undefined);
  if (labels.length === 0) return undefined;
  return labels;
}

function parseStyleDefinitionHeader(
  element: XmlElement
): DiagramStyleDefinitionHeader | undefined {
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
    minimumVersion: getAttr(element, "minVer"),
    resourceId: getIntAttr(element, "resId"),
  };
}

function parseStyleLabel(element: XmlElement): DiagramStyleLabel | undefined {
  const name = getAttr(element, "name");
  const scene3d = parseDiagramScene3d(getChild(element, "dgm:scene3d"));
  const shape3d = parseDiagramShape3d(getChild(element, "dgm:sp3d"));
  const textProperties = parseTextBody(getChild(element, "dgm:txPr"));
  const style = parseShapeStyle(getChild(element, "dgm:style"));

  if (!name && !scene3d && !shape3d && !textProperties && !style) return undefined;

  return {
    name,
    scene3d,
    shape3d,
    textProperties,
    style,
  };
}

function parseDiagramScene3d(element: XmlElement | undefined): Scene3d | undefined {
  if (!element) return undefined;

  const cameraEl = getChild(element, "a:camera");
  const lightRigEl = getChild(element, "a:lightRig");
  if (!cameraEl || !lightRigEl) return undefined;

  const cameraPreset = parsePresetCameraType(getAttr(cameraEl, "prst"));
  const lightRig = parseLightRigType(getAttr(lightRigEl, "rig"));
  const lightDir = parseLightRigDirection(getAttr(lightRigEl, "dir"));
  if (!cameraPreset || !lightRig || !lightDir) return undefined;

  const cameraRotation = parseRotation(getChild(cameraEl, "a:rot"));
  const lightRotation = parseRotation(getChild(lightRigEl, "a:rot"));

  const flatTx = getChild(element, "a:flatTx");
  const flatTextZ = flatTx ? getEmuAttr(flatTx, "z") : undefined;

  return {
    camera: {
      preset: cameraPreset,
      fov: getAngleAttr(cameraEl, "fov"),
      zoom: getPercent100kAttr(cameraEl, "zoom"),
      rotation: cameraRotation,
    },
    lightRig: {
      rig: lightRig,
      direction: lightDir,
      rotation: lightRotation,
    },
    flatTextZ,
  };
}

function parseRotation(element: XmlElement | undefined): Rotation3d | undefined {
  if (!element) return undefined;
  const latitude = getAngleAttr(element, "lat");
  const longitude = getAngleAttr(element, "lon");
  const revolution = getAngleAttr(element, "rev");
  if (latitude === undefined || longitude === undefined || revolution === undefined) {
    return undefined;
  }
  return { latitude, longitude, revolution };
}

function parseDiagramShape3d(element: XmlElement | undefined): Shape3d | undefined {
  if (!element) return undefined;

  const extrusionColor = toSolidFill(parseColorFromParent(getChild(element, "a:extrusionClr")));
  const contourColor = toSolidFill(parseColorFromParent(getChild(element, "a:contourClr")));

  const bevel = parseBevel(getChild(element, "a:bevelT"))
    ?? parseBevel(getChild(element, "a:bevelB"));

  return {
    z: getEmuAttr(element, "z"),
    extrusionHeight: getEmuAttr(element, "extrusionH"),
    contourWidth: getEmuAttr(element, "contourW"),
    preset: parsePresetMaterialType(getAttr(element, "prstMaterial")),
    extrusionColor,
    contourColor,
    bevel,
  };
}

function parseBevel(element: XmlElement | undefined): Shape3d["bevel"] | undefined {
  if (!element) return undefined;
  const width = getEmuAttr(element, "w");
  const height = getEmuAttr(element, "h");
  const preset = getAttr(element, "prst");
  if (!width || !height || !isBevelPresetType(preset)) return undefined;
  return {
    width,
    height,
    preset,
  };
}

function toSolidFill(color: Color | undefined): Fill | undefined {
  if (!color) return undefined;
  return { type: "solidFill", color };
}

function isBevelPresetType(value: string | undefined): value is BevelPresetType {
  switch (value) {
    case "angle":
    case "artDeco":
    case "circle":
    case "convex":
    case "coolSlant":
    case "cross":
    case "divot":
    case "hardEdge":
    case "relaxedInset":
    case "riblet":
    case "slope":
    case "softRound":
      return true;
    default:
      return false;
  }
}

function isPresetMaterialType(value: string | undefined): value is PresetMaterialType {
  switch (value) {
    case "clear":
    case "dkEdge":
    case "flat":
    case "legacyMatte":
    case "legacyMetal":
    case "legacyPlastic":
    case "legacyWireframe":
    case "matte":
    case "metal":
    case "plastic":
    case "powder":
    case "softEdge":
    case "softmetal":
    case "translucentPowder":
    case "warmMatte":
      return true;
    default:
      return false;
  }
}

function parsePresetMaterialType(value: string | undefined): PresetMaterialType | undefined {
  return isPresetMaterialType(value) ? value : undefined;
}

function getAttrFromChild(
  parent: XmlElement,
  childName: string,
  attrName: string
): string | undefined {
  const child = getChild(parent, childName);
  return child ? getAttr(child, attrName) : undefined;
}

function parsePresetCameraType(value: string | undefined): PresetCameraType | undefined {
  return isPresetCameraType(value) ? value : undefined;
}

function parseLightRigType(value: string | undefined): LightRigType | undefined {
  return isLightRigType(value) ? value : undefined;
}

function parseLightRigDirection(value: string | undefined): LightRigDirection | undefined {
  return isLightRigDirection(value) ? value : undefined;
}

function isPresetCameraType(value: string | undefined): value is PresetCameraType {
  switch (value) {
    case "isometricBottomDown":
    case "isometricBottomUp":
    case "isometricLeftDown":
    case "isometricLeftUp":
    case "isometricOffAxis1Left":
    case "isometricOffAxis1Right":
    case "isometricOffAxis1Top":
    case "isometricOffAxis2Left":
    case "isometricOffAxis2Right":
    case "isometricOffAxis2Top":
    case "isometricOffAxis3Bottom":
    case "isometricOffAxis3Left":
    case "isometricOffAxis3Right":
    case "isometricOffAxis4Bottom":
    case "isometricOffAxis4Left":
    case "isometricOffAxis4Right":
    case "isometricRightDown":
    case "isometricRightUp":
    case "isometricTopDown":
    case "isometricTopUp":
    case "legacyObliqueBottom":
    case "legacyObliqueBottomLeft":
    case "legacyObliqueBottomRight":
    case "legacyObliqueFront":
    case "legacyObliqueLeft":
    case "legacyObliqueRight":
    case "legacyObliqueTop":
    case "legacyObliqueTopLeft":
    case "legacyObliqueTopRight":
    case "legacyPerspectiveBottom":
    case "legacyPerspectiveBottomLeft":
    case "legacyPerspectiveBottomRight":
    case "legacyPerspectiveFront":
    case "legacyPerspectiveLeft":
    case "legacyPerspectiveRight":
    case "legacyPerspectiveTop":
    case "legacyPerspectiveTopLeft":
    case "legacyPerspectiveTopRight":
    case "obliqueBottom":
    case "obliqueBottomLeft":
    case "obliqueBottomRight":
    case "obliqueLeft":
    case "obliqueRight":
    case "obliqueTop":
    case "obliqueTopLeft":
    case "obliqueTopRight":
    case "orthographicFront":
    case "perspectiveAbove":
    case "perspectiveAboveLeftFacing":
    case "perspectiveAboveRightFacing":
    case "perspectiveBelow":
    case "perspectiveContrastingLeftFacing":
    case "perspectiveContrastingRightFacing":
    case "perspectiveFront":
    case "perspectiveHeroicExtremeLeftFacing":
    case "perspectiveHeroicExtremeRightFacing":
    case "perspectiveHeroicLeftFacing":
    case "perspectiveHeroicRightFacing":
    case "perspectiveLeft":
    case "perspectiveRelaxed":
    case "perspectiveRelaxedModerately":
    case "perspectiveRight":
      return true;
    default:
      return false;
  }
}

function isLightRigType(value: string | undefined): value is LightRigType {
  switch (value) {
    case "balanced":
    case "brightRoom":
    case "chilly":
    case "contrasting":
    case "flat":
    case "flood":
    case "freezing":
    case "glow":
    case "harsh":
    case "legacyFlat1":
    case "legacyFlat2":
    case "legacyFlat3":
    case "legacyFlat4":
    case "legacyHarsh1":
    case "legacyHarsh2":
    case "legacyHarsh3":
    case "legacyHarsh4":
    case "legacyNormal1":
    case "legacyNormal2":
    case "legacyNormal3":
    case "legacyNormal4":
    case "morning":
    case "soft":
    case "sunrise":
    case "sunset":
    case "threePt":
    case "twoPt":
      return true;
    default:
      return false;
  }
}

function isLightRigDirection(value: string | undefined): value is LightRigDirection {
  switch (value) {
    case "b":
    case "bl":
    case "br":
    case "l":
    case "r":
    case "t":
    case "tl":
    case "tr":
      return true;
    default:
      return false;
  }
}
