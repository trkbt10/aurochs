/**
 * @file Theme parsing functions
 *
 * Parses theme-related XML elements (a:theme) into domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import type { XmlElement, XmlDocument } from "@oxen/xml";
import { getAttr, getChild, getChildren, getByPath } from "@oxen/xml";
import type { FontSpec, FontScheme, ColorScheme, ColorMap, FormatScheme, Theme, ObjectDefaults, CustomColor, ExtraColorScheme, RawMasterTextStyles } from "../../domain";

// =============================================================================
// Font Scheme Parsing
// =============================================================================

/**
 * Extract font spec from font element (a:majorFont or a:minorFont).
 */
function extractFontSpec(fontElement: XmlElement | undefined): FontSpec {
  if (fontElement === undefined) {
    return { latin: undefined, eastAsian: undefined, complexScript: undefined };
  }

  const latin = getChild(fontElement, "a:latin");
  const ea = getChild(fontElement, "a:ea");
  const cs = getChild(fontElement, "a:cs");

  return {
    latin: latin?.attrs?.typeface,
    eastAsian: ea?.attrs?.typeface,
    complexScript: cs?.attrs?.typeface,
  };
}

/**
 * Parse FontScheme from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
export function parseFontScheme(themeContent: XmlDocument | null): FontScheme {
  if (themeContent === null) {
    return {
      majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
      minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
    };
  }

  const fontScheme = getByPath(themeContent, [
    "a:theme",
    "a:themeElements",
    "a:fontScheme",
  ]);

  const majorFont = fontScheme !== undefined ? getChild(fontScheme, "a:majorFont") : undefined;
  const minorFont = fontScheme !== undefined ? getChild(fontScheme, "a:minorFont") : undefined;

  return {
    majorFont: extractFontSpec(majorFont),
    minorFont: extractFontSpec(minorFont),
  };
}

// =============================================================================
// Color Scheme Parsing
// =============================================================================

/**
 * Collect colors from a:clrScheme element.
 */
function collectColorScheme(clrScheme: XmlElement | undefined): ColorScheme {
  const colors: Record<string, string> = {};
  if (clrScheme === undefined) {return colors;}

  // Color scheme has children like a:dk1, a:lt1, a:accent1, etc.
  for (const child of clrScheme.children) {
    if (typeof child === "object" && "name" in child && "children" in child) {
      const colorElement = child as XmlElement;
      const colorName = colorElement.name.replace("a:", "");

      // Get color value from srgbClr or sysClr
      const srgbClr = getChild(colorElement, "a:srgbClr");
      if (srgbClr !== undefined) {
        colors[colorName] = srgbClr.attrs?.val ?? "";
      } else {
        const sysClr = getChild(colorElement, "a:sysClr");
        if (sysClr !== undefined) {
          colors[colorName] = sysClr.attrs?.lastClr ?? "";
        }
      }
    }
  }

  return colors;
}

/**
 * Parse ColorScheme from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (a:clrScheme)
 */
export function parseColorScheme(themeContent: XmlDocument | null): ColorScheme {
  if (themeContent === null) {
    return {};
  }

  const clrScheme = getByPath(themeContent, [
    "a:theme",
    "a:themeElements",
    "a:clrScheme",
  ]);
  return collectColorScheme(clrScheme);
}

// =============================================================================
// Color Map Parsing
// =============================================================================

/**
 * Collect color mappings from a:clrMap element.
 */
function collectColorMap(clrMap: XmlElement | undefined): ColorMap {
  const mapping: Record<string, string> = {};
  if (clrMap === undefined) {return mapping;}
  for (const [key, value] of Object.entries(clrMap.attrs)) {
    mapping[key] = value;
  }
  return mapping;
}

/**
 * Parse ColorMap from color map element.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */
export function parseColorMap(clrMapElement: XmlElement | undefined): ColorMap {
  return collectColorMap(clrMapElement);
}

// =============================================================================
// Format Scheme Parsing
// =============================================================================

/**
 * Parse FormatScheme from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
 */
export function parseFormatScheme(themeContent: XmlDocument | null): FormatScheme {
  if (themeContent === null) {
    return { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] };
  }

  const fmtScheme = getByPath(themeContent, [
    "a:theme",
    "a:themeElements",
    "a:fmtScheme",
  ]);

  if (fmtScheme === undefined) {
    return { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] };
  }

  const lnStyleLst = getChild(fmtScheme, "a:lnStyleLst");
  const fillStyleLst = getChild(fmtScheme, "a:fillStyleLst");
  const effectStyleLst = getChild(fmtScheme, "a:effectStyleLst");
  const bgFillStyleLst = getChild(fmtScheme, "a:bgFillStyleLst");

  return {
    lineStyles: lnStyleLst !== undefined ? getChildren(lnStyleLst, "a:ln") : [],
    fillStyles: fillStyleLst !== undefined
      ? fillStyleLst.children.filter(
          (c): c is XmlElement => typeof c === "object" && "name" in c
        )
      : [],
    effectStyles: effectStyleLst !== undefined
      ? getChildren(effectStyleLst, "a:effectStyle")
      : [],
    bgFillStyles: bgFillStyleLst !== undefined
      ? bgFillStyleLst.children.filter(
          (c): c is XmlElement => typeof c === "object" && "name" in c
        )
      : [],
  };
}

// =============================================================================
// Object Defaults Parsing
// =============================================================================

/**
 * Parse ObjectDefaults from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.7 (a:objectDefaults)
 */
export function parseObjectDefaults(themeContent: XmlDocument | null): ObjectDefaults {
  if (themeContent === null) {
    return {};
  }

  const objectDefaults = getByPath(themeContent, [
    "a:theme",
    "a:themeElements",
    "a:objectDefaults",
  ]);

  if (objectDefaults === undefined) {
    return {};
  }

  return {
    lineDefault: getChild(objectDefaults, "a:lnDef"),
    shapeDefault: getChild(objectDefaults, "a:spDef"),
    textDefault: getChild(objectDefaults, "a:txDef"),
  };
}

// =============================================================================
// Custom Colors Parsing
// =============================================================================

/**
 * Parse custom colors from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.3 (a:custClrLst)
 */
export function parseCustomColorList(themeContent: XmlDocument | null): readonly CustomColor[] {
  if (themeContent === null) {
    return [];
  }

  const custClrLst =
    getByPath(themeContent, ["a:theme", "a:themeElements", "a:custClrLst"]) ??
    getByPath(themeContent, ["a:theme", "a:custClrLst"]);

  if (custClrLst === undefined) {
    return [];
  }

  const customColors: CustomColor[] = [];

  for (const child of custClrLst.children) {
    if (typeof child !== "object" || !("name" in child)) {continue;}
    const custClr = child as XmlElement;
    if (custClr.name !== "a:custClr") {continue;}

    const name = custClr.attrs?.name;
    const srgbClr = getChild(custClr, "a:srgbClr");
    if (srgbClr !== undefined) {
      customColors.push({
        name,
        color: srgbClr.attrs?.val,
        type: "srgb",
      });
      continue;
    }

    const sysClr = getChild(custClr, "a:sysClr");
    if (sysClr !== undefined) {
      customColors.push({
        name,
        color: sysClr.attrs?.lastClr,
        type: "system",
        systemColor: sysClr.attrs?.val,
      });
    }
  }

  return customColors;
}

// =============================================================================
// Extra Color Schemes Parsing
// =============================================================================

/**
 * Parse extra color schemes from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.5 (a:extraClrSchemeLst)
 */
export function parseExtraColorSchemes(themeContent: XmlDocument | null): readonly ExtraColorScheme[] {
  if (themeContent === null) {
    return [];
  }

  const extraClrSchemeLst = getByPath(themeContent, [
    "a:theme",
    "a:extraClrSchemeLst",
  ]);

  if (extraClrSchemeLst === undefined) {
    return [];
  }

  const schemes: ExtraColorScheme[] = [];
  for (const extra of getChildren(extraClrSchemeLst, "a:extraClrScheme")) {
    const clrScheme = getChild(extra, "a:clrScheme");
    const clrMap = getChild(extra, "a:clrMap");
    if (!clrScheme || !clrMap) {continue;}

    schemes.push({
      name: getAttr(clrScheme, "name"),
      colorScheme: collectColorScheme(clrScheme),
      colorMap: collectColorMap(clrMap),
    });
  }

  return schemes;
}

// =============================================================================
// Theme Parsing
// =============================================================================

/**
 * Parse complete Theme from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
export function parseTheme(
  themeContent: XmlDocument | null,
  themeOverrides: readonly XmlDocument[] = [],
): Theme {
  return {
    fontScheme: parseFontScheme(themeContent),
    colorScheme: parseColorScheme(themeContent),
    formatScheme: parseFormatScheme(themeContent),
    customColors: parseCustomColorList(themeContent),
    extraColorSchemes: parseExtraColorSchemes(themeContent),
    themeElements: getByPath(themeContent, ["a:theme", "a:themeElements"]),
    themeManager: getByPath(themeContent, ["a:theme", "a:themeManager"]),
    themeOverrides,
    objectDefaults: parseObjectDefaults(themeContent),
  };
}

// =============================================================================
// Master Text Styles Parsing
// =============================================================================

/**
 * Parse MasterTextStyles from slide master text styles element.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */
export function parseMasterTextStyles(
  txStyles: XmlElement | undefined,
): RawMasterTextStyles {
  if (txStyles === undefined) {
    return {
      titleStyle: undefined,
      bodyStyle: undefined,
      otherStyle: undefined,
    };
  }

  return {
    titleStyle: getChild(txStyles, "p:titleStyle"),
    bodyStyle: getChild(txStyles, "p:bodyStyle"),
    otherStyle: getChild(txStyles, "p:otherStyle"),
  };
}
