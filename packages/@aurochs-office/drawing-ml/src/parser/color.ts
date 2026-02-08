/**
 * @file DrawingML color parser
 *
 * Parses DrawingML color elements to Color domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

import type {
  Color,
  ColorSpec,
  ColorTransform,
  HslColor,
  PresetColor,
  SchemeColor,
  ScrgbColor,
  SrgbColor,
  SystemColor,
} from "../domain/color";
import { findChild, getAttr, isXmlElement, type XmlElement } from "@aurochs/xml";
import { getAngleAttr, getPercent100kAttr, parseSchemeColorValue } from "./primitive";

// =============================================================================
// Color Type Detection
// =============================================================================

const COLOR_ELEMENT_NAMES = ["a:srgbClr", "a:schemeClr", "a:sysClr", "a:prstClr", "a:hslClr", "a:scrgbClr"] as const;

/** Find the first color element child (srgbClr, schemeClr, etc.) in a parent element. */
export function findColorElement(parent: XmlElement): XmlElement | undefined {
  return findChild(parent, (child) => COLOR_ELEMENT_NAMES.includes(child.name as (typeof COLOR_ELEMENT_NAMES)[number]));
}

// =============================================================================
// Color Spec Parsing
// =============================================================================

function parseSrgbColor(element: XmlElement): SrgbColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {
    return undefined;
  }
  return { type: "srgb", value: val.toUpperCase() };
}

function parseSchemeColor(element: XmlElement): SchemeColor | undefined {
  const val = parseSchemeColorValue(getAttr(element, "val"));
  if (!val) {
    return undefined;
  }
  return { type: "scheme", value: val };
}

function parseSystemColor(element: XmlElement): SystemColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {
    return undefined;
  }
  const lastClr = getAttr(element, "lastClr");
  return {
    type: "system",
    value: val,
    lastColor: lastClr,
  };
}

function parsePresetColor(element: XmlElement): PresetColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {
    return undefined;
  }
  return { type: "preset", value: val };
}

function parseHslColor(element: XmlElement): HslColor | undefined {
  const hue = getAngleAttr(element, "hue");
  const sat = getPercent100kAttr(element, "sat");
  const lum = getPercent100kAttr(element, "lum");
  if (hue === undefined || sat === undefined || lum === undefined) {
    return undefined;
  }
  return { type: "hsl", hue, saturation: sat, luminance: lum };
}

function parseScrgbColor(element: XmlElement): ScrgbColor | undefined {
  const r = getPercent100kAttr(element, "r");
  const g = getPercent100kAttr(element, "g");
  const b = getPercent100kAttr(element, "b");
  if (r === undefined || g === undefined || b === undefined) {
    return undefined;
  }
  return { type: "scrgb", red: r, green: g, blue: b };
}

function parseColorSpec(element: XmlElement): ColorSpec | undefined {
  switch (element.name) {
    case "a:srgbClr":
      return parseSrgbColor(element);
    case "a:schemeClr":
      return parseSchemeColor(element);
    case "a:sysClr":
      return parseSystemColor(element);
    case "a:prstClr":
      return parsePresetColor(element);
    case "a:hslClr":
      return parseHslColor(element);
    case "a:scrgbClr":
      return parseScrgbColor(element);
    default:
      return undefined;
  }
}

// =============================================================================
// Color Transform Parsing
// =============================================================================

type ColorTransformBuilder = {
  -readonly [K in keyof ColorTransform]?: ColorTransform[K];
};

function parseColorTransforms(element: XmlElement): ColorTransform | undefined {
  const state: { transform: ColorTransformBuilder; hasTransform: boolean } = {
    transform: {},
    hasTransform: false,
  };

  for (const child of element.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    switch (child.name) {
      case "a:alpha":
        state.transform.alpha = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:alphaMod":
        state.transform.alphaMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:alphaOff":
        state.transform.alphaOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:hue":
        state.transform.hue = getAngleAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:hueMod":
        state.transform.hueMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:hueOff":
        state.transform.hueOff = getAngleAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:sat":
        state.transform.sat = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:satMod":
        state.transform.satMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:satOff":
        state.transform.satOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:lum":
        state.transform.lum = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:lumMod":
        state.transform.lumMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:lumOff":
        state.transform.lumOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:red":
        state.transform.red = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:redMod":
        state.transform.redMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:redOff":
        state.transform.redOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:green":
        state.transform.green = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:greenMod":
        state.transform.greenMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:greenOff":
        state.transform.greenOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:blue":
        state.transform.blue = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:blueMod":
        state.transform.blueMod = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:blueOff":
        state.transform.blueOff = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:gamma":
        state.transform.gamma = true;
        state.hasTransform = true;
        break;
      case "a:inv":
        state.transform.inv = true;
        state.hasTransform = true;
        break;
      case "a:invGamma":
        state.transform.invGamma = true;
        state.hasTransform = true;
        break;
      case "a:shade":
        state.transform.shade = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:tint":
        state.transform.tint = getPercent100kAttr(child, "val");
        state.hasTransform = true;
        break;
      case "a:comp":
        state.transform.comp = true;
        state.hasTransform = true;
        break;
      case "a:gray":
        state.transform.gray = true;
        state.hasTransform = true;
        break;
    }
  }

  return state.hasTransform ? (state.transform as ColorTransform) : undefined;
}

// =============================================================================
// Main Color Parsing
// =============================================================================

/** Parse a color element into a Color domain object with optional transforms. */
export function parseColor(element: XmlElement | undefined): Color | undefined {
  if (!element) {
    return undefined;
  }

  const spec = parseColorSpec(element);
  if (!spec) {
    return undefined;
  }

  const transform = parseColorTransforms(element);

  return { spec, transform };
}

/** Find and parse a color element from a parent element. */
export function parseColorFromParent(parent: XmlElement | undefined): Color | undefined {
  if (!parent) {
    return undefined;
  }
  const colorEl = findColorElement(parent);
  return parseColor(colorEl);
}
