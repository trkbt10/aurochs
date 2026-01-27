/**
 * @file Content part (p:contentPart) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.14 (contentPart)
 */

import { getAttr, type XmlElement } from "@oxen/xml";
import type { ContentPartShape } from "../../domain";
import { parseBlackWhiteMode } from "../primitive";

/**
 * Parse content part shape (p:contentPart).
 */
export function parseContentPartShape(element: XmlElement): ContentPartShape | undefined {
  const id = getAttr(element, "r:id");
  if (!id) {
    return undefined;
  }
  const bwMode = parseBlackWhiteMode(getAttr(element, "bwMode"));
  return {
    type: "contentPart",
    contentPart: {
      id,
      bwMode,
    },
  };
}
