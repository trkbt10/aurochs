/**
 * @file Table cell 3D parser
 *
 * Parses DrawingML a:cell3D elements for table cells and table styles.
 */

import type { Cell3d } from "../domain/table/types";
import type { LightRigDirection, LightRigType, PresetMaterialType } from "../domain/types";
import { getAttr, getChild, type XmlElement } from "@oxen/xml";
import { getEmuAttr } from "./primitive";

type BevelPresetType =
  | "angle"
  | "artDeco"
  | "circle"
  | "convex"
  | "coolSlant"
  | "cross"
  | "divot"
  | "hardEdge"
  | "relaxedInset"
  | "riblet"
  | "slope"
  | "softRound";

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

function parseBevel(element: XmlElement | undefined): Cell3d["bevel"] | undefined {
  if (!element) {return undefined;}
  const width = getEmuAttr(element, "w");
  const height = getEmuAttr(element, "h");
  const preset = getAttr(element, "prst");
  if (width === undefined || height === undefined) {return undefined;}
  if (!isBevelPresetType(preset)) {return undefined;}
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

function parsePresetMaterialType(value: string | undefined): PresetMaterialType | undefined {
  return isPresetMaterialType(value) ? value : undefined;
}

function isLightRigType(value: string | undefined): value is LightRigType {
  switch (value) {
    case "legacyFlat1":
    case "legacyFlat2":
    case "legacyFlat3":
    case "legacyFlat4":
    case "legacyNormal1":
    case "legacyNormal2":
    case "legacyNormal3":
    case "legacyNormal4":
    case "legacyHarsh1":
    case "legacyHarsh2":
    case "legacyHarsh3":
    case "legacyHarsh4":
    case "threePt":
    case "balanced":
    case "soft":
    case "harsh":
    case "flood":
    case "contrasting":
    case "morning":
    case "sunrise":
    case "sunset":
    case "chilly":
    case "freezing":
    case "flat":
    case "twoPt":
    case "glow":
    case "brightRoom":
      return true;
    default:
      return false;
  }
}

function isLightRigDirection(value: string | undefined): value is LightRigDirection {
  switch (value) {
    case "tl":
    case "t":
    case "tr":
    case "l":
    case "r":
    case "bl":
    case "b":
    case "br":
      return true;
    default:
      return false;
  }
}

function parseLightRig(element: XmlElement | undefined): Cell3d["lightRig"] | undefined {
  if (!element) {return undefined;}
  const rig = getAttr(element, "rig");
  const direction = getAttr(element, "dir");
  if (!isLightRigType(rig) || !isLightRigDirection(direction)) {
    return undefined;
  }
  return { rig, direction };
}

/**
 * Parse cell 3D properties (a:cell3D).
 */
export function parseCell3d(element: XmlElement | undefined): Cell3d | undefined {
  if (!element) {return undefined;}

  const bevel = parseBevel(getChild(element, "a:bevel"));
  const lightRig = parseLightRig(getChild(element, "a:lightRig"));
  const preset = parsePresetMaterialType(getAttr(element, "prstMaterial"));

  if (!bevel && !lightRig && !preset) {
    return undefined;
  }

  return {
    bevel,
    lightRig,
    preset,
  };
}
