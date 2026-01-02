/**
 * @file Text style levels parser
 *
 * Parses list style levels (a:defPPr, a:lvl1pPr..a:lvl9pPr) into domain structures.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (lstStyle)
 */

import type { TextLevelStyle, TextStyleLevels } from "../../domain/index";
import { getChild, type XmlElement } from "../../../xml/index";
import { parseParagraphProperties, parseRunProperties } from "./text-parser";

function parseTextLevelStyle(level: XmlElement | undefined): TextLevelStyle | undefined {
  if (!level) {return undefined;}

  return {
    paragraphProperties: parseParagraphProperties(level),
    defaultRunProperties: parseRunProperties(getChild(level, "a:defRPr")),
  };
}

/**
 * Parse text style levels (a:defPPr, a:lvl1pPr..a:lvl9pPr).
 */
export function parseTextStyleLevels(element: XmlElement | undefined): TextStyleLevels | undefined {
  if (!element) {return undefined;}

  const defaultStyle = parseTextLevelStyle(getChild(element, "a:defPPr"));
  const level1 = parseTextLevelStyle(getChild(element, "a:lvl1pPr"));
  const level2 = parseTextLevelStyle(getChild(element, "a:lvl2pPr"));
  const level3 = parseTextLevelStyle(getChild(element, "a:lvl3pPr"));
  const level4 = parseTextLevelStyle(getChild(element, "a:lvl4pPr"));
  const level5 = parseTextLevelStyle(getChild(element, "a:lvl5pPr"));
  const level6 = parseTextLevelStyle(getChild(element, "a:lvl6pPr"));
  const level7 = parseTextLevelStyle(getChild(element, "a:lvl7pPr"));
  const level8 = parseTextLevelStyle(getChild(element, "a:lvl8pPr"));
  const level9 = parseTextLevelStyle(getChild(element, "a:lvl9pPr"));

  const hasAnyLevel = [
    defaultStyle,
    level1,
    level2,
    level3,
    level4,
    level5,
    level6,
    level7,
    level8,
    level9,
  ].some((level) => level !== undefined);

  if (!hasAnyLevel) {return undefined;}

  return {
    defaultStyle,
    level1,
    level2,
    level3,
    level4,
    level5,
    level6,
    level7,
    level8,
    level9,
  };
}
