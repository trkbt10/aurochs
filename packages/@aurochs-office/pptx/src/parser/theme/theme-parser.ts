/**
 * @file Theme parsing functions
 *
 * Parses theme-related XML elements (a:theme) into domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import type { XmlElement, XmlDocument } from "@aurochs/xml";
import { getAttr, getChild, getChildren, getByPath } from "@aurochs/xml";
import type { ColorMap, ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme, FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type {
  CustomColor,
  ExtraColorScheme,
  ExtractedTheme,
  FormatScheme,
  ObjectDefaults,
  ObjectDefaultProperties,
  Theme,
  ThemeExtractionInput,
} from "../../domain/index";
import type { MasterTextStyles } from "../../domain/text-style";
import { parseSlideMaster } from "../slide/slide-parser";
import { parseShapeProperties } from "../shape-parser/properties";
import { parseBodyProperties } from "../text/text-parser";
import { parseTextStyleLevels } from "../text/text-style-levels";
import { parseFill } from "../graphics/fill-parser";
import { parseLine } from "../graphics/line-parser";
import { parseEffects } from "../graphics/effects-parser";

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

  const fontScheme = getByPath(themeContent, ["a:theme", "a:themeElements", "a:fontScheme"]);

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
  if (clrScheme === undefined) {
    return colors;
  }

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

  const clrScheme = getByPath(themeContent, ["a:theme", "a:themeElements", "a:clrScheme"]);
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
  if (clrMap === undefined) {
    return mapping;
  }
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

function filterElementChildren(children: ReadonlyArray<unknown>): XmlElement[] {
  return children.filter(
    (child): child is XmlElement => typeof child === "object" && child !== null && "name" in child,
  );
}

/**
 * Parse FormatScheme from theme content.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
 */
export function parseFormatScheme(themeContent: XmlDocument | null): FormatScheme {
  if (themeContent === null) {
    return { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] };
  }

  const fmtScheme = getByPath(themeContent, ["a:theme", "a:themeElements", "a:fmtScheme"]);

  if (fmtScheme === undefined) {
    return { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] };
  }

  const lnStyleLst = getChild(fmtScheme, "a:lnStyleLst");
  const fillStyleLst = getChild(fmtScheme, "a:fillStyleLst");
  const effectStyleLst = getChild(fmtScheme, "a:effectStyleLst");
  const bgFillStyleLst = getChild(fmtScheme, "a:bgFillStyleLst");

  const lineElements = lnStyleLst !== undefined ? getChildren(lnStyleLst, "a:ln") : [];
  const fillElements = fillStyleLst !== undefined ? filterElementChildren(fillStyleLst.children) : [];
  const effectElements = effectStyleLst !== undefined ? getChildren(effectStyleLst, "a:effectStyle") : [];
  const bgFillElements = bgFillStyleLst !== undefined ? filterElementChildren(bgFillStyleLst.children) : [];

  return {
    lineStyles: lineElements.map((el) => parseLine(el)).filter((l): l is NonNullable<typeof l> => l !== undefined),
    fillStyles: fillElements.map((el) => parseFill(el)).filter((f): f is NonNullable<typeof f> => f !== undefined),
    effectStyles: effectElements.map((el) => parseEffects(el)),
    bgFillStyles: bgFillElements.map((el) => parseFill(el)).filter((f): f is NonNullable<typeof f> => f !== undefined),
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

  const objectDefaults = getByPath(themeContent, ["a:theme", "a:themeElements", "a:objectDefaults"]);

  if (objectDefaults === undefined) {
    return {};
  }

  return {
    lineDefault: parseObjectDefaultElement(getChild(objectDefaults, "a:lnDef")),
    shapeDefault: parseObjectDefaultElement(getChild(objectDefaults, "a:spDef")),
    textDefault: parseObjectDefaultElement(getChild(objectDefaults, "a:txDef")),
  };
}

/** Parse a single object default element (a:spDef/a:lnDef/a:txDef) into domain type. */
function parseObjectDefaultElement(el: XmlElement | undefined): ObjectDefaultProperties | undefined {
  if (!el) { return undefined; }
  const spPr = getChild(el, "a:spPr");
  const bodyPr = getChild(el, "a:bodyPr");
  const lstStyle = getChild(el, "a:lstStyle");
  const props: ObjectDefaultProperties = {
    shapeProperties: parseShapeProperties(spPr),
    bodyProperties: bodyPr ? parseBodyProperties(bodyPr) : undefined,
    textStyleLevels: parseTextStyleLevels(lstStyle),
  };
  // Return undefined if empty
  if (!props.shapeProperties && !props.bodyProperties && !props.textStyleLevels) { return undefined; }
  return props;
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
    if (typeof child !== "object" || !("name" in child)) {
      continue;
    }
    const custClr = child as XmlElement;
    if (custClr.name !== "a:custClr") {
      continue;
    }

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

  const extraClrSchemeLst = getByPath(themeContent, ["a:theme", "a:extraClrSchemeLst"]);

  if (extraClrSchemeLst === undefined) {
    return [];
  }

  const schemes: ExtraColorScheme[] = [];
  for (const extra of getChildren(extraClrSchemeLst, "a:extraClrScheme")) {
    const clrScheme = getChild(extra, "a:clrScheme");
    const clrMap = getChild(extra, "a:clrMap");
    if (!clrScheme || !clrMap) {
      continue;
    }

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
export function parseTheme(themeContent: XmlDocument | null, themeOverrides: readonly XmlDocument[] = []): Theme {
  return {
    fontScheme: parseFontScheme(themeContent),
    colorScheme: parseColorScheme(themeContent),
    formatScheme: parseFormatScheme(themeContent),
    customColors: parseCustomColorList(themeContent),
    extraColorSchemes: parseExtraColorSchemes(themeContent),
    themeOverrides,
    objectDefaults: parseObjectDefaults(themeContent),
  };
}

// =============================================================================
// Theme Extraction (assembles all theme-related data from raw XML)
// =============================================================================

const EMPTY_MASTER_TEXT_STYLES: MasterTextStyles = {};

/**
 * Extract complete theme data from raw XML documents.
 *
 * This is the SoT entry point for assembling all theme-related data
 * from a presentation's XML parts. Consumers (app layer, editors)
 * should use this instead of calling individual parse functions.
 *
 * @param input - Raw XML documents (theme, master)
 * @returns Complete ExtractedTheme or undefined if no theme
 */
export function extractThemeData(input: ThemeExtractionInput): ExtractedTheme | undefined {
  if (input.theme === null) { return undefined; }

  const theme = parseTheme(input.theme, input.themeOverrides);

  const themeRoot = getByPath(input.theme, ["a:theme"]);
  const themeName = themeRoot ? (getAttr(themeRoot, "name") ?? "") : "";

  // Parse slide master as domain type (SoT for colorMap, textStyles, background)
  const parsedMaster = input.master ? parseSlideMaster(input.master, theme.formatScheme) : undefined;
  const colorMap = parsedMaster?.colorMap ?? parseColorMap(undefined);
  const masterTextStyles = parsedMaster?.textStyles ?? EMPTY_MASTER_TEXT_STYLES;
  const masterBackground = parsedMaster?.background;

  return { themeName, theme, colorMap, masterTextStyles, masterBackground };
}
