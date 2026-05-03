/** @file Kiwi-metadata based visibility rule for debug canvas lists. */

import type { FigNode } from "@aurochs/fig/types";

/** Return true when a CANVAS should be shown to users. */
export function isUserVisibleCanvasNode(canvas: FigNode): boolean {
  return canvas.visible !== false && canvas.internalOnly !== true;
}
