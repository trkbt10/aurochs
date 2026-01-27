/**
 * @file Slide transition parser
 *
 * Parses slide transition data from slide content XML.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Transitions)
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import type { SlideTransition } from "../../domain";
import { getByPath } from "@oxen/xml";
import { parseTransition, getTransitionElement } from "./slide-parser";

/**
 * Parse slide transition data from slide content XML.
 *
 * @param content - The slide content XML document (p:sld)
 * @returns SlideTransition if the slide has a transition, undefined otherwise
 */
export function parseSlideTransitionData(content: XmlDocument | undefined): SlideTransition | undefined {
  if (!content) {
    return undefined;
  }

  const sld = getByPath(content, ["p:sld"]);
  if (!sld) {
    return undefined;
  }

  const transitionElement = getTransitionElement(sld as XmlElement);
  return parseTransition(transitionElement);
}
