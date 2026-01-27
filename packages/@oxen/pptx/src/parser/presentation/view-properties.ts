/**
 * @file View properties parser for ECMA-376 p:viewPr element
 *
 * Parses viewProps.xml to ViewProperties domain objects.
 *
 * @see ECMA-376 Part 1, Section 19.2.2 (View Properties)
 */
/* eslint-disable jsdoc/require-jsdoc -- parsers are straightforward and repetitive */

import type { XmlElement } from "@oxen/xml";
import { getChild, getChildren } from "@oxen/xml";
import type {
  CommonSlideViewProperties,
  CommonViewProperties,
  Direction,
  GridSpacing,
  Guide,
  GuideList,
  NormalViewPortion,
  NormalViewProperties,
  NotesTextViewProperties,
  NotesViewProperties,
  OutlineViewProperties,
  OutlineViewSlide,
  OutlineViewSlideList,
  SplitterBarState,
  SlideViewProperties,
  SorterViewProperties,
  ViewOrigin,
  ViewProperties,
  ViewType,
  ViewScale,
  ViewScaleRatio,
} from "../../domain/view";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a boolean attribute when present.
 *
 * Per ECMA-376, boolean values can be "true", "false", "1", or "0".
 *
 * @param value - The attribute value
 * @returns Parsed boolean or undefined when attribute missing
 */
function parseOptionalBooleanAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "1" || value === "true";
}

/**
 * Parse an integer attribute when present.
 *
 * @param value - The attribute value
 * @returns Parsed integer or undefined when attribute missing/invalid
 */
function parseOptionalIntAttr(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function parseChild<T>(
  parent: XmlElement,
  name: string,
  parser: (element: XmlElement) => T,
): T | undefined {
  const child = getChild(parent, name);
  if (!child) {
    return undefined;
  }
  return parser(child);
}

// =============================================================================
// Basic Element Parsers
// =============================================================================

function parseScaleRatio(element: XmlElement | undefined): ViewScaleRatio | undefined {
  if (!element) {
    return undefined;
  }
  const n = parseOptionalIntAttr(element.attrs["n"]);
  const d = parseOptionalIntAttr(element.attrs["d"]);
  if (n === undefined || d === undefined || d === 0) {
    return undefined;
  }
  return { n, d, value: n / d };
}

function parseScale(element: XmlElement | undefined): ViewScale | undefined {
  if (!element) {
    return undefined;
  }
  const sx = parseScaleRatio(getChild(element, "a:sx"));
  const sy = parseScaleRatio(getChild(element, "a:sy"));
  if (!sx || !sy) {
    return undefined;
  }
  return { x: sx, y: sy };
}

function parseOrigin(element: XmlElement | undefined): ViewOrigin | undefined {
  if (!element) {
    return undefined;
  }
  const x = parseOptionalIntAttr(element.attrs["x"]);
  const y = parseOptionalIntAttr(element.attrs["y"]);
  if (x === undefined || y === undefined) {
    return undefined;
  }
  return { x, y };
}

function parseViewType(value: string | undefined): ViewType | undefined {
  switch (value) {
    case "handoutView":
    case "notesMasterView":
    case "notesView":
    case "outlineView":
    case "sldMasterView":
    case "sldSorterView":
    case "sldThumbnailView":
    case "sldView":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Common View Properties
// =============================================================================

export function parseCommonViewProperties(element: XmlElement): CommonViewProperties {
  return {
    varScale: parseOptionalBooleanAttr(element.attrs["varScale"]),
    scale: parseScale(getChild(element, "p:scale")),
    origin: parseOrigin(getChild(element, "p:origin")),
  };
}

// =============================================================================
// Guide List
// =============================================================================

export function parseGuide(element: XmlElement): Guide {
  const orient = element.attrs["orient"];
  const direction = orient === "horz" || orient === "vert" ? orient : undefined;

  return {
    orient: direction,
    pos: parseOptionalIntAttr(element.attrs["pos"]),
  };
}

export function parseGuideList(element: XmlElement): GuideList {
  return {
    guides: getChildren(element, "p:guide").map(parseGuide),
  };
}

// =============================================================================
// Common Slide View Properties
// =============================================================================

export function parseCommonSlideViewProperties(element: XmlElement): CommonSlideViewProperties {
  return {
    showGuides: parseOptionalBooleanAttr(element.attrs["showGuides"]),
    snapToGrid: parseOptionalBooleanAttr(element.attrs["snapToGrid"]),
    snapToObjects: parseOptionalBooleanAttr(element.attrs["snapToObjects"]),
    commonView: parseChild(element, "p:cViewPr", parseCommonViewProperties),
    guideList: parseChild(element, "p:guideLst", parseGuideList),
  };
}

// =============================================================================
// Normal View Properties
// =============================================================================

export function parseNormalViewPortion(element: XmlElement): NormalViewPortion {
  return {
    autoAdjust: parseOptionalBooleanAttr(element.attrs["autoAdjust"]),
    size: parseOptionalIntAttr(element.attrs["sz"]),
  };
}

export function parseNormalViewProperties(element: XmlElement): NormalViewProperties {
  const horzBarState = element.attrs["horzBarState"] as SplitterBarState | undefined;
  const vertBarState = element.attrs["vertBarState"] as SplitterBarState | undefined;

  return {
    horzBarState,
    vertBarState,
    preferSingleView: parseOptionalBooleanAttr(element.attrs["preferSingleView"]),
    showOutlineIcons: parseOptionalBooleanAttr(element.attrs["showOutlineIcons"]),
    snapVertSplitter: parseOptionalBooleanAttr(element.attrs["snapVertSplitter"]),
    restoredLeft: parseChild(element, "p:restoredLeft", parseNormalViewPortion),
    restoredTop: parseChild(element, "p:restoredTop", parseNormalViewPortion),
  };
}

// =============================================================================
// Outline View Properties
// =============================================================================

export function parseOutlineViewSlide(element: XmlElement): OutlineViewSlide {
  return {
    rId: element.attrs["r:id"] ?? "",
    collapse: parseOptionalBooleanAttr(element.attrs["collapse"]),
  };
}

export function parseOutlineViewSlideList(element: XmlElement): OutlineViewSlideList {
  return {
    slides: getChildren(element, "p:sld").map(parseOutlineViewSlide),
  };
}

export function parseOutlineViewProperties(element: XmlElement): OutlineViewProperties {
  const cViewPr = getChild(element, "p:cViewPr");
  const sldLst = getChild(element, "p:sldLst");

  return {
    commonView: cViewPr ? parseCommonViewProperties(cViewPr) : undefined,
    slideList: sldLst ? parseOutlineViewSlideList(sldLst) : undefined,
  };
}

// =============================================================================
// Notes Text / Notes View Properties
// =============================================================================

export function parseNotesTextViewProperties(element: XmlElement): NotesTextViewProperties {
  const cViewPr = getChild(element, "p:cViewPr");
  return {
    commonView: cViewPr ? parseCommonViewProperties(cViewPr) : undefined,
  };
}

export function parseNotesViewProperties(element: XmlElement): NotesViewProperties {
  const cViewPr = getChild(element, "p:cViewPr");
  return {
    commonView: cViewPr ? parseCommonViewProperties(cViewPr) : undefined,
  };
}

// =============================================================================
// Slide / Sorter View Properties
// =============================================================================

export function parseSlideViewProperties(element: XmlElement): SlideViewProperties {
  const cSldViewPr = getChild(element, "p:cSldViewPr");
  return {
    commonSlideView: cSldViewPr ? parseCommonSlideViewProperties(cSldViewPr) : undefined,
  };
}

export function parseSorterViewProperties(element: XmlElement): SorterViewProperties {
  const cViewPr = getChild(element, "p:cViewPr");
  return {
    commonView: cViewPr ? parseCommonViewProperties(cViewPr) : undefined,
    showFormatting: parseOptionalBooleanAttr(element.attrs["showFormatting"]),
  };
}

// =============================================================================
// Grid Spacing
// =============================================================================

export function parseGridSpacing(element: XmlElement): GridSpacing {
  return {
    cx: parseOptionalIntAttr(element.attrs["cx"]),
    cy: parseOptionalIntAttr(element.attrs["cy"]),
  };
}

// =============================================================================
// View Properties
// =============================================================================

/**
 * Parse p:viewPr (presentation-wide view properties).
 *
 * @param element - The p:viewPr element
 * @returns Parsed view properties
 *
 * @see ECMA-376 Part 1, Section 19.2.2.18
 */
export function parseViewProperties(element: XmlElement): ViewProperties {
  const normalViewPr = getChild(element, "p:normalViewPr");
  const slideViewPr = getChild(element, "p:slideViewPr");
  const outlineViewPr = getChild(element, "p:outlineViewPr");
  const notesTextViewPr = getChild(element, "p:notesTextViewPr");
  const notesViewPr = getChild(element, "p:notesViewPr");
  const sorterViewPr = getChild(element, "p:sorterViewPr");
  const gridSpacing = getChild(element, "p:gridSpacing");

  return {
    lastView: parseViewType(element.attrs["lastView"]),
    showComments: parseOptionalBooleanAttr(element.attrs["showComments"]),
    normalView: normalViewPr ? parseNormalViewProperties(normalViewPr) : undefined,
    slideView: slideViewPr ? parseSlideViewProperties(slideViewPr) : undefined,
    outlineView: outlineViewPr ? parseOutlineViewProperties(outlineViewPr) : undefined,
    notesTextView: notesTextViewPr ? parseNotesTextViewProperties(notesTextViewPr) : undefined,
    notesView: notesViewPr ? parseNotesViewProperties(notesViewPr) : undefined,
    sorterView: sorterViewPr ? parseSorterViewProperties(sorterViewPr) : undefined,
    gridSpacing: gridSpacing ? parseGridSpacing(gridSpacing) : undefined,
  };
}
