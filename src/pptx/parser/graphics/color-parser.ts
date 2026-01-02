/**
 * @file Color parser
 *
 * Parses DrawingML color elements to Color domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

import type {
  Color,
  ColorSpec,
  ColorTransform,
  HslColor,
  PresetColor,
  SchemeColor,
  SrgbColor,
  SystemColor,
} from "../../domain/index";
import {
  findChild,
  getAttr,
  isXmlElement,
  type XmlElement,
} from "../../../xml/index";
import { getAngleAttr, getPercent100kAttr, parseSchemeColorValue } from "../primitive";

// =============================================================================
// Color Type Detection
// =============================================================================

/** Color element names */
const COLOR_ELEMENT_NAMES = [
  "a:srgbClr",
  "a:schemeClr",
  "a:sysClr",
  "a:prstClr",
  "a:hslClr",
  "a:scrgbClr",
] as const;

/**
 * Find color element within a parent
 */
export function findColorElement(parent: XmlElement): XmlElement | undefined {
  return findChild(parent, (child) =>
    COLOR_ELEMENT_NAMES.includes(child.name as typeof COLOR_ELEMENT_NAMES[number])
  );
}

// =============================================================================
// Color Spec Parsing
// =============================================================================

/**
 * Parse sRGB color
 * @see ECMA-376 Part 1, Section 20.1.2.3.32
 *
 * ```xml
 * <a:srgbClr val="FF0000"/>
 * ```
 */
function parseSrgbColor(element: XmlElement): SrgbColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {return undefined;}
  return { type: "srgb", value: val.toUpperCase() };
}

/**
 * Parse scheme color
 * @see ECMA-376 Part 1, Section 20.1.2.3.29
 *
 * ```xml
 * <a:schemeClr val="accent1"/>
 * ```
 */
function parseSchemeColor(element: XmlElement): SchemeColor | undefined {
  const val = parseSchemeColorValue(getAttr(element, "val"));
  if (!val) {return undefined;}
  return { type: "scheme", value: val };
}

/**
 * Parse system color
 * @see ECMA-376 Part 1, Section 20.1.2.3.33
 *
 * ```xml
 * <a:sysClr val="windowText" lastClr="000000"/>
 * ```
 */
function parseSystemColor(element: XmlElement): SystemColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {return undefined;}
  const lastClr = getAttr(element, "lastClr");
  return {
    type: "system",
    value: val,
    lastColor: lastClr,
  };
}

/**
 * Parse preset color
 * @see ECMA-376 Part 1, Section 20.1.2.3.22
 *
 * ```xml
 * <a:prstClr val="red"/>
 * ```
 */
function parsePresetColor(element: XmlElement): PresetColor | undefined {
  const val = getAttr(element, "val");
  if (!val) {return undefined;}
  return { type: "preset", value: val };
}

/**
 * Parse HSL color
 * @see ECMA-376 Part 1, Section 20.1.2.3.13
 *
 * ```xml
 * <a:hslClr hue="0" sat="100000" lum="50000"/>
 * ```
 */
function parseHslColor(element: XmlElement): HslColor | undefined {
  const hue = getAngleAttr(element, "hue");
  const sat = getPercent100kAttr(element, "sat");
  const lum = getPercent100kAttr(element, "lum");
  if (hue === undefined || sat === undefined || lum === undefined) {return undefined;}
  return { type: "hsl", hue, saturation: sat, luminance: lum };
}

/**
 * Parse color specification from element
 */
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
      // scRGB - convert to sRGB (simplified)
      // TODO: proper scRGB conversion
      return { type: "srgb", value: "000000" };
    default:
      return undefined;
  }
}

// =============================================================================
// Color Transform Parsing
// =============================================================================

/** Mutable builder type for ColorTransform */
type ColorTransformBuilder = {
  -readonly [K in keyof ColorTransform]?: ColorTransform[K];
};

/**
 * Parse color transforms from children
 */
function parseColorTransforms(element: XmlElement): ColorTransform | undefined {
  const transformState: { transform: ColorTransformBuilder; hasTransform: boolean } = {
    transform: {},
    hasTransform: false,
  };

  for (const child of element.children) {
    if (!isXmlElement(child)) {continue;}

    switch (child.name) {
      case "a:alpha":
        transformState.transform.alpha = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:alphaMod":
        transformState.transform.alphaMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:alphaOff":
        transformState.transform.alphaOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:hue":
        transformState.transform.hue = getAngleAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:hueMod":
        transformState.transform.hueMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:hueOff":
        transformState.transform.hueOff = getAngleAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:sat":
        transformState.transform.sat = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:satMod":
        transformState.transform.satMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:satOff":
        transformState.transform.satOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:lum":
        transformState.transform.lum = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:lumMod":
        transformState.transform.lumMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:lumOff":
        transformState.transform.lumOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:gamma":
        transformState.transform.gamma = true;
        transformState.hasTransform = true;
        break;
      case "a:invGamma":
        transformState.transform.invGamma = true;
        transformState.hasTransform = true;
        break;
      case "a:green":
        transformState.transform.green = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:greenMod":
        transformState.transform.greenMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:greenOff":
        transformState.transform.greenOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:redMod":
        transformState.transform.redMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:redOff":
        transformState.transform.redOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:blueMod":
        transformState.transform.blueMod = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:blueOff":
        transformState.transform.blueOff = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:shade":
        transformState.transform.shade = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:tint":
        transformState.transform.tint = getPercent100kAttr(child, "val");
        transformState.hasTransform = true;
        break;
      case "a:comp":
        transformState.transform.comp = true;
        transformState.hasTransform = true;
        break;
      case "a:inv":
        transformState.transform.inv = true;
        transformState.hasTransform = true;
        break;
      case "a:gray":
        transformState.transform.gray = true;
        transformState.hasTransform = true;
        break;
    }
  }

  return transformState.hasTransform ? (transformState.transform as ColorTransform) : undefined;
}

// =============================================================================
// Main Color Parsing
// =============================================================================

/**
 * Parse a color element to Color domain object
 *
 * Handles:
 * - a:srgbClr - sRGB color
 * - a:schemeClr - Theme color reference
 * - a:sysClr - System color
 * - a:prstClr - Preset color name
 * - a:hslClr - HSL color
 * - a:scrgbClr - scRGB color
 *
 * @example
 * ```typescript
 * const solidFill = getChild(spPr, "a:solidFill");
 * const colorEl = findColorElement(solidFill);
 * const color = parseColor(colorEl);
 * ```
 */
export function parseColor(element: XmlElement | undefined): Color | undefined {
  if (!element) {return undefined;}

  const spec = parseColorSpec(element);
  if (!spec) {return undefined;}

  const transform = parseColorTransforms(element);

  return { spec, transform };
}

/**
 * Parse color from parent element (finds color child automatically)
 */
export function parseColorFromParent(parent: XmlElement | undefined): Color | undefined {
  if (!parent) {return undefined;}
  const colorEl = findColorElement(parent);
  return parseColor(colorEl);
}

// Note: Color resolution functions (resolveColor, etc.) have been moved to core/color-resolver.ts
// Import them from there directly
