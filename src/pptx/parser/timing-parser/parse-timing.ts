/**
 * @file Timing parser - main parse function
 *
 * Parses PresentationML timing elements (p:timing) to Animation domain objects.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { getChild, type XmlElement } from "../../../xml";
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
