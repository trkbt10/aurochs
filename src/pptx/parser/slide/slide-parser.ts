/**
 * @file Slide parser
 *
 * Parses PresentationML slide elements to Slide domain objects.
 *
 * @see ECMA-376 Part 1, Section 19.3 - Presentation ML
 */

import type {
  Background,
  ColorMapOverride,
  ColorMapping,
  CustomerData,
  HandoutMaster,
  NotesMaster,
  Slide,
  SlideLayout,
  SlideLayoutId,
  SlideLayoutType,
  SlideMaster,
  SlideTransition,
  TransitionType,
} from "../../domain/index";
import {
  getAttr,
  getByPath,
  getChild,
  getChildren,
  type XmlDocument,
  type XmlElement,
} from "../../../xml/index";
import { parseFillFromParent } from "../graphics/fill-parser";
import { parseShapeTree } from "../shape-parser/index";
import { processAlternateContent } from "../shape-parser/alternate-content";
import { getBoolAttr, getBoolAttrOr, parseSlideLayoutId } from "../primitive";
import type { ParseContext } from "../context";
import { parseTextStyleLevels } from "../text/text-style-levels";

// =============================================================================
// Background Parsing
// =============================================================================

/**
 * Parse background (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.1
 */
export function parseBackground(element: XmlElement | undefined): Background | undefined {
  if (!element) {
    return undefined;
  }

  // Check for background properties
  const bgPr = getChild(element, "p:bgPr");
  if (bgPr) {
    const fill = parseFillFromParent(bgPr);
    if (fill) {
      return {
        fill,
        shadeToTitle: getBoolAttr(bgPr, "shadeToTitle"),
      };
    }
  }

  // Check for background reference (uses theme)
  const bgRef = getChild(element, "p:bgRef");
  if (bgRef) {
    // bgRef refers to theme fill - requires context
    // For now, try to get fill directly
    const fill = parseFillFromParent(bgRef);
    if (fill) {
      return { fill };
    }
  }

  return undefined;
}

// =============================================================================
// Transition Parsing
// =============================================================================

/**
 * Parse slide transition
 *
 * TODO: mc:AlternateContent NOT HANDLED for transitions.
 * Transitions may use mc:AlternateContent with Requires="p14" for Office 2010+ features.
 * Example:
 * ```xml
 * <mc:AlternateContent>
 *   <mc:Choice Requires="p14">
 *     <p:transition spd="med" p14:dur="700"><p:fade/></p:transition>
 *   </mc:Choice>
 *   <mc:Fallback>
 *     <p:transition spd="med"><p:fade/></p:transition>
 *   </mc:Fallback>
 * </mc:AlternateContent>
 * ```
 * The caller (parseSlide) should check for mc:AlternateContent wrapping p:transition
 * and use shape-parser.ts's isChoiceSupported() pattern.
 * See: issues/ecma376-mc-alternateContent-compliance.md
 *
 * @see ECMA-376 Part 1, Section 19.5
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 */
export function parseTransition(element: XmlElement | undefined): SlideTransition | undefined {
  if (!element) {
    return undefined;
  }

  // Find transition type by checking for various transition elements
  const type = findTransitionType(element);

  const spd = getAttr(element, "spd");
  const duration = spd === "slow" ? 2000 : spd === "med" ? 1000 : 500;

  return {
    type,
    duration,
    advanceOnClick: getBoolAttrOr(element, "advClick", true),
    advanceAfter: getAdvanceAfter(element),
    sound: parseTransitionSound(element),
  };
}

function getTransitionElement(parent: XmlElement | undefined): XmlElement | undefined {
  if (!parent) {
    return undefined;
  }

  const transition = getChild(parent, "p:transition");
  if (transition) {
    return transition;
  }

  const alternateContent = getChild(parent, "mc:AlternateContent");
  if (!alternateContent) {
    return undefined;
  }

  return processAlternateContent(alternateContent, "p:transition");
}

function parseTransitionSound(element: XmlElement): SlideTransition["sound"] {
  const sndAc = getChild(element, "p:sndAc");
  if (!sndAc) {
    return undefined;
  }

  const stSnd = getChild(sndAc, "p:stSnd");
  if (!stSnd) {
    return undefined;
  }

  const snd = getChild(stSnd, "p:snd");
  if (!snd) {
    return undefined;
  }

  const resourceId = getAttr(snd, "r:embed");
  if (!resourceId) {
    return undefined;
  }

  return {
    resourceId,
    name: getAttr(snd, "name"),
    loop: getBoolAttr(stSnd, "loop"),
  };
}

/**
 * Check if string is valid transition type
 */
function isTransitionType(value: string): value is TransitionType {
  const types: TransitionType[] = [
    "blinds", "checker", "circle", "comb", "cover", "cut", "diamond",
    "dissolve", "fade", "newsflash", "plus", "pull", "push", "random",
    "randomBar", "split", "strips", "wedge", "wheel", "wipe", "zoom", "none",
  ];
  return types.includes(value as TransitionType);
}

function findTransitionType(element: XmlElement): TransitionType {
  for (const child of element.children) {
    if (typeof child !== "object" || !("type" in child)) {
      continue;
    }
    const el = child as XmlElement;
    if (el.type !== "element") {
      continue;
    }
    if (!el.name.startsWith("p:")) {
      continue;
    }
    const transType = el.name.substring(2) as TransitionType;
    if (isTransitionType(transType)) {
      return transType;
    }
  }

  return "none";
}

/**
 * Get advance after time in ms
 */
function getAdvanceAfter(element: XmlElement): number | undefined {
  const advTm = getAttr(element, "advTm");
  if (!advTm) {
    return undefined;
  }
  return parseInt(advTm, 10);
}

// =============================================================================
// Color Map Override Parsing
// =============================================================================

/**
 * Parse color mapping
 */
function parseColorMapping(element: XmlElement): ColorMapping {
  return {
    bg1: getAttr(element, "bg1"),
    tx1: getAttr(element, "tx1"),
    bg2: getAttr(element, "bg2"),
    tx2: getAttr(element, "tx2"),
    accent1: getAttr(element, "accent1"),
    accent2: getAttr(element, "accent2"),
    accent3: getAttr(element, "accent3"),
    accent4: getAttr(element, "accent4"),
    accent5: getAttr(element, "accent5"),
    accent6: getAttr(element, "accent6"),
    hlink: getAttr(element, "hlink"),
    folHlink: getAttr(element, "folHlink"),
  };
}

/**
 * Parse color map override
 * @see ECMA-376 Part 1, Section 19.3.1.6
 */
export function parseColorMapOverride(element: XmlElement | undefined): ColorMapOverride | undefined {
  if (!element) {
    return undefined;
  }

  // Check for master color mapping (no override)
  if (getChild(element, "a:masterClrMapping")) {
    return { type: "none" };
  }

  // Check for override color mapping
  const overrideClrMapping = getChild(element, "a:overrideClrMapping");
  if (overrideClrMapping) {
    return {
      type: "override",
      mappings: parseColorMapping(overrideClrMapping),
    };
  }

  return undefined;
}

// =============================================================================
// Main Slide Parsing
// =============================================================================

/**
 * Parse customer data list (p:custDataLst).
 * @see ECMA-376 Part 1, Section 19.3.1.18
 */
export function parseCustomerDataList(element: XmlElement | undefined): CustomerData[] | undefined {
  if (!element) {
    return undefined;
  }
  const entries = getChildren(element, "p:custData")
    .map((custData) => custData.attrs["r:id"])
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((rId) => ({ rId }));
  return entries.length > 0 ? entries : undefined;
}

/**
 * Parse slide document to Slide domain object
 *
 * When a ParseContext is provided, shape properties are resolved with
 * placeholder inheritance (slide → layout → master).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.38
 */
export function parseSlide(
  content: XmlDocument | undefined,
  context?: ParseContext,
): Slide | undefined {
  if (!content) {
    return undefined;
  }

  const sld = getByPath(content, ["p:sld"]);
  if (!sld) {
    return undefined;
  }

  const cSld = getChild(sld, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  const spTree = getChild(cSld, "p:spTree");
  const bg = getChild(cSld, "p:bg");
  const custDataLst = getChild(cSld, "p:custDataLst");
  const clrMapOvr = getChild(sld, "p:clrMapOvr");
  const transition = getTransitionElement(sld);

  // Pass contexts for shape and text style inheritance resolution
  const placeholderCtx = context?.placeholderContext;
  const masterStylesInfo = context?.masterStylesInfo;
  const formatScheme = context?.formatScheme;

  return {
    background: parseBackground(bg),
    shapes: parseShapeTree(spTree, placeholderCtx, masterStylesInfo, formatScheme),
    colorMapOverride: parseColorMapOverride(clrMapOvr),
    customerData: parseCustomerDataList(custDataLst),
    transition: parseTransition(transition),
    showMasterShapes: getBoolAttr(sld, "showMasterSp"),
    showMasterPhAnim: getBoolAttr(sld, "showMasterPhAnim"),
  };
}

/**
 * Parse slide layout document
 * @see ECMA-376 Part 1, Section 19.3.1.39
 */
export function parseSlideLayout(
  content: XmlDocument | undefined,
  _context?: ParseContext,
): SlideLayout | undefined {
  void _context;
  if (!content) {
    return undefined;
  }

  const sldLayout = getByPath(content, ["p:sldLayout"]);
  if (!sldLayout) {
    return undefined;
  }

  const cSld = getChild(sldLayout, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  const spTree = getChild(cSld, "p:spTree");
  const bg = getChild(cSld, "p:bg");
  const custDataLst = getChild(cSld, "p:custDataLst");
  const clrMapOvr = getChild(sldLayout, "p:clrMapOvr");
  const transition = getTransitionElement(sldLayout);

  return {
    type: (getAttr(sldLayout, "type") as SlideLayoutType) ?? "blank",
    name: getAttr(cSld, "name"),
    matchingName: getAttr(sldLayout, "matchingName"),
    background: parseBackground(bg),
    shapes: parseShapeTree(spTree),
    colorMapOverride: parseColorMapOverride(clrMapOvr),
    customerData: parseCustomerDataList(custDataLst),
    transition: parseTransition(transition),
    showMasterShapes: getBoolAttr(sldLayout, "showMasterSp"),
    showMasterPhAnim: getBoolAttr(sldLayout, "showMasterPhAnim"),
    preserve: getBoolAttr(sldLayout, "preserve"),
    userDrawn: getBoolAttr(sldLayout, "userDrawn"),
  };
}

/**
 * Parse slide layout ID list (p:sldLayoutIdLst)
 * @see ECMA-376 Part 1, Sections 19.3.1.40-19.3.1.41
 */
export function parseSlideLayoutIdList(element: XmlElement): SlideLayoutId[] {
  const layoutIds = getChildren(element, "p:sldLayoutId");
  return layoutIds.map((layoutId) => ({
    id: parseSlideLayoutId(getAttr(layoutId, "id")) ?? 0,
    rId: layoutId.attrs["r:id"] ?? "",
  }));
}

/**
 * Parse slide master document
 * @see ECMA-376 Part 1, Section 19.3.1.41
 */
export function parseSlideMaster(
  content: XmlDocument | undefined,
  _context?: ParseContext,
): SlideMaster | undefined {
  void _context;
  if (!content) {
    return undefined;
  }

  const sldMaster = getByPath(content, ["p:sldMaster"]);
  if (!sldMaster) {
    return undefined;
  }

  const cSld = getChild(sldMaster, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  const spTree = getChild(cSld, "p:spTree");
  const bg = getChild(cSld, "p:bg");
  const custDataLst = getChild(cSld, "p:custDataLst");
  const clrMap = getChild(sldMaster, "p:clrMap");
  const sldLayoutIdLst = getChild(sldMaster, "p:sldLayoutIdLst");
  const transition = getTransitionElement(sldMaster);

  return {
    background: parseBackground(bg),
    shapes: parseShapeTree(spTree),
    colorMap: clrMap ? parseColorMapping(clrMap) : {},
    slideLayoutIds: sldLayoutIdLst ? parseSlideLayoutIdList(sldLayoutIdLst) : undefined,
    customerData: parseCustomerDataList(custDataLst),
    transition: parseTransition(transition),
    preserve: getBoolAttr(sldMaster, "preserve"),
  };
}

/**
 * Parse handout master document
 * @see ECMA-376 Part 1, Section 19.3.1.24
 */
export function parseHandoutMaster(
  content: XmlDocument | undefined,
  _context?: ParseContext,
): HandoutMaster | undefined {
  void _context;
  if (!content) {
    return undefined;
  }

  const handoutMaster = getByPath(content, ["p:handoutMaster"]);
  if (!handoutMaster) {
    return undefined;
  }

  const cSld = getChild(handoutMaster, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  const spTree = getChild(cSld, "p:spTree");
  const bg = getChild(cSld, "p:bg");
  const custDataLst = getChild(cSld, "p:custDataLst");
  const clrMap = getChild(handoutMaster, "p:clrMap");

  return {
    background: parseBackground(bg),
    shapes: parseShapeTree(spTree),
    colorMap: clrMap ? parseColorMapping(clrMap) : {},
    customerData: parseCustomerDataList(custDataLst),
    preserve: getBoolAttr(handoutMaster, "preserve"),
  };
}

/**
 * Parse notes master document
 * @see ECMA-376 Part 1, Section 19.3.1.27
 */
export function parseNotesMaster(
  content: XmlDocument | undefined,
  _context?: ParseContext,
): NotesMaster | undefined {
  void _context;
  if (!content) {
    return undefined;
  }

  const notesMaster = getByPath(content, ["p:notesMaster"]);
  if (!notesMaster) {
    return undefined;
  }

  const cSld = getChild(notesMaster, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  const spTree = getChild(cSld, "p:spTree");
  const bg = getChild(cSld, "p:bg");
  const custDataLst = getChild(cSld, "p:custDataLst");
  const clrMap = getChild(notesMaster, "p:clrMap");
  const notesStyle = getChild(notesMaster, "p:notesStyle");

  return {
    background: parseBackground(bg),
    shapes: parseShapeTree(spTree),
    colorMap: clrMap ? parseColorMapping(clrMap) : {},
    customerData: parseCustomerDataList(custDataLst),
    notesStyle: parseTextStyleLevels(notesStyle),
    preserve: getBoolAttr(notesMaster, "preserve"),
  };
}
