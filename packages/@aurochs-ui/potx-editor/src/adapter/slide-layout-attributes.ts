/**
 * @file Map theme layout list entries to SlideLayoutAttributes for shared `SlideLayoutEditor`
 */

import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { LayoutListEntry } from "../context/types";

export function layoutListEntryToSlideLayoutAttributes(entry: LayoutListEntry): SlideLayoutAttributes {
  return {
    type: entry.type,
    name: entry.name,
    matchingName: entry.matchingName,
    showMasterShapes: entry.showMasterShapes,
    preserve: entry.preserve,
    userDrawn: entry.userDrawn,
  };
}
