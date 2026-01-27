/**
 * @file Timing parser - main parse function
 *
 * Parses PresentationML timing elements (p:timing) to Animation domain objects.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { getChild, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import type { Timing } from "../../domain/animation";
import { parseRootTimeNode } from "./time-node";
import { parseBuildList } from "./build-list";

/**
 * Parse timing element from slide.
 * @see ECMA-376 Part 1, Section 19.5.87 (p:timing)
 */
export function parseTiming(timingElement: XmlElement | undefined): Timing | undefined {
  if (!timingElement) {
    return undefined;
  }

  const tnLst = getChild(timingElement, "p:tnLst");
  const bldLst = getChild(timingElement, "p:bldLst");

  // Parse root time node (usually first p:par in tnLst)
  const rootTimeNode = parseRootTimeNode(tnLst);

  // Parse build list
  const buildList = bldLst ? parseBuildList(bldLst) : undefined;

  if (!rootTimeNode && !buildList) {
    return undefined;
  }

  return {
    rootTimeNode,
    buildList,
  };
}

/**
 * Find and extract timing element from slide content (p:sld > p:timing).
 *
 * @param slideContent - Parsed slide XmlDocument (p:sld element)
 * @returns p:timing element if present, undefined otherwise
 */
export function findTimingElement(slideContent: XmlDocument): XmlElement | undefined {
  for (const child of slideContent.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    // p:sld > p:timing
    const timing = getChild(child, "p:timing");
    if (timing) {
      return timing;
    }
  }
  return undefined;
}

/**
 * Extract timing data from slide content.
 *
 * Convenience function that combines findTimingElement and parseTiming.
 *
 * @param slideContent - Parsed slide XmlDocument (p:sld element)
 * @returns Parsed Timing object if slide has animations, undefined otherwise
 *
 * @example
 * ```typescript
 * const slide = presentation.getSlide(1);
 * const timing = parseSlideTimingData(slide.content);
 * if (timing) {
 *   // Slide has animations
 * }
 * ```
 */
export function parseSlideTimingData(slideContent: XmlDocument): Timing | undefined {
  const timingEl = findTimingElement(slideContent);
  return parseTiming(timingEl);
}
