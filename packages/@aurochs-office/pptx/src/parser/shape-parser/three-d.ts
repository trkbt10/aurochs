/**
 * @file 3D shape parsing
 *
 * Parses DrawingML 3D elements (a:scene3d, a:sp3d).
 *
 * @see ECMA-376 Part 1, Section 20.1.5
 */
/* eslint-disable jsdoc/require-jsdoc -- helper guards follow spec enums */

import { getAttr, getChild, type XmlElement } from "@aurochs/xml";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type {
  Scene3d,
  Shape3d,
  Rotation3d,
  Bevel3d,
  BevelPresetType,
  LightRigDirection,
  LightRigType,
  PresetCameraType,
  PresetMaterialType,
} from "../../domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { getAngleAttr, getEmuAttr, getPercent100kAttr } from "../primitive";
import { parseColorFromParent } from "../graphics/color-parser";

function toSolidFill(color: Color | undefined): SolidFill | undefined {
  if (!color) {
    return undefined;
  }
  return { type: "solidFill", color };
}

function parseRotation(element: XmlElement | undefined): Rotation3d | undefined {
  if (!element) {
    return undefined;
  }
  const latitude = getAngleAttr(element, "lat");
  const longitude = getAngleAttr(element, "lon");
  const revolution = getAngleAttr(element, "rev");
  if (latitude === undefined || longitude === undefined || revolution === undefined) {
    return undefined;
  }
  return { latitude, longitude, revolution };
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

/**
 * Default bevel width/height: 76200 EMU = 6pt
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
const DEFAULT_BEVEL_SIZE_EMU = 76200;
const DEFAULT_BEVEL_SIZE_PX = (DEFAULT_BEVEL_SIZE_EMU / 914400) * 96; // ~8px

/**
 * Parse bevel element with ECMA-376 defaults applied.
 *
 * ECMA-376 defaults:
 * - w: 76200 EMU (6pt)
 * - h: 76200 EMU (6pt)
 * - prst: "circle"
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1
 */
function parseBevel(element: XmlElement | undefined): Bevel3d | undefined {
  if (!element) {
    return undefined;
  }
  // Apply ECMA-376 defaults: w=76200, h=76200, prst="circle"
  const width = getEmuAttr(element, "w") ?? px(DEFAULT_BEVEL_SIZE_PX);
  const height = getEmuAttr(element, "h") ?? px(DEFAULT_BEVEL_SIZE_PX);
  const presetAttr = getAttr(element, "prst");
  const preset: BevelPresetType = isBevelPresetType(presetAttr) ? presetAttr : "circle";

  return { width, height, preset };
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
export function parseScene3d(spPr: XmlElement | undefined): Scene3d | undefined {
  if (!spPr) {
    return undefined;
  }
  const scene3d = getChild(spPr, "a:scene3d");
  if (!scene3d) {
    return undefined;
  }

  const cameraEl = getChild(scene3d, "a:camera");
  const lightRigEl = getChild(scene3d, "a:lightRig");
  if (!cameraEl || !lightRigEl) {
    return undefined;
  }

  const cameraPreset = parsePresetCameraType(getAttr(cameraEl, "prst"));
  const lightRig = parseLightRigType(getAttr(lightRigEl, "rig"));
  const lightDir = parseLightRigDirection(getAttr(lightRigEl, "dir"));
  if (!cameraPreset || !lightRig || !lightDir) {
    return undefined;
  }

  const cameraRotation = parseRotation(getChild(cameraEl, "a:rot"));
  const lightRotation = parseRotation(getChild(lightRigEl, "a:rot"));

  const flatTx = getChild(scene3d, "a:flatTx");
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

/**
 * Parse sp3d (3D shape properties) element.
 *
 * ECMA-376 defaults:
 * - z: 0
 * - extrusionH: 0
 * - contourW: 0
 * - prstMaterial: "warmMatte"
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export function parseShape3d(spPr: XmlElement | undefined): Shape3d | undefined {
  if (!spPr) {
    return undefined;
  }
  const sp3d = getChild(spPr, "a:sp3d");
  if (!sp3d) {
    return undefined;
  }

  const extrusionColor = toSolidFill(parseColorFromParent(getChild(sp3d, "a:extrusionClr")));
  const contourColor = toSolidFill(parseColorFromParent(getChild(sp3d, "a:contourClr")));

  // Parse both bevelT and bevelB per ECMA-376
  const bevelTop = parseBevel(getChild(sp3d, "a:bevelT"));
  const bevelBottom = parseBevel(getChild(sp3d, "a:bevelB"));

  // Apply ECMA-376 default: prstMaterial="warmMatte"
  const materialAttr = getAttr(sp3d, "prstMaterial");
  const material: PresetMaterialType = isPresetMaterialType(materialAttr) ? materialAttr : "warmMatte";

  return {
    z: getEmuAttr(sp3d, "z"),
    extrusionHeight: getEmuAttr(sp3d, "extrusionH"),
    contourWidth: getEmuAttr(sp3d, "contourW"),
    preset: material,
    extrusionColor,
    contourColor,
    bevelTop,
    bevelBottom,
  };
}
