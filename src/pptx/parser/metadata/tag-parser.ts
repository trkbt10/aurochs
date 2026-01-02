/**
 * @file Programmable tag parser
 *
 * @see ECMA-376 Part 1, Section 19.3.3 (Programmable Tags)
 */

import type { ProgrammableTag, ProgrammableTagList } from "../../domain/index";
import { getChildren, type XmlElement } from "../../../xml/index";

/**
 * Parse programmable tag list (p:tagLst).
 */
export function parseTagList(element: XmlElement): ProgrammableTagList {
  const tags = getChildren(element, "p:tag").map((tag): ProgrammableTag => ({
    name: tag.attrs["name"] ?? "",
    value: tag.attrs["val"],
  }));

  return { tags };
}
