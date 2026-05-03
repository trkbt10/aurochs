/** @file Resolve editor interaction policy from the active tool. */

import { isCreationIntent, isSelectionTransformIntent, type FigUserIntent } from "../../context/fig-editor/user-intent";
import type { CanvasTargetMode } from "./target-resolution";

export type CanvasInteractionPolicy = {
  readonly targetMode: CanvasTargetMode;
  readonly pathEditingEnabled: boolean;
  readonly shapeCreationEnabled: boolean;
  readonly marqueeEnabled: boolean;
  readonly selectionChromeInteractive: boolean;
};

/** Returns the single interaction policy consumed by canvas hit testing and selection chrome. */
export function resolveCanvasInteractionPolicy(intent: FigUserIntent): CanvasInteractionPolicy {
  if (intent.kind === "path-edit") {
    return {
      targetMode: "path-edit",
      pathEditingEnabled: true,
      shapeCreationEnabled: false,
      marqueeEnabled: false,
      selectionChromeInteractive: false,
    };
  }

  if (intent.kind === "text-edit") {
    return {
      targetMode: "select",
      pathEditingEnabled: false,
      shapeCreationEnabled: false,
      marqueeEnabled: false,
      selectionChromeInteractive: false,
    };
  }

  const shapeCreationEnabled = isCreationIntent(intent) || intent.kind === "create-drag";
  const marqueeEnabled = intent.kind === "select" || intent.kind === "marquee";
  return {
    targetMode: "select",
    pathEditingEnabled: false,
    shapeCreationEnabled,
    marqueeEnabled,
    selectionChromeInteractive: !shapeCreationEnabled && !isSelectionTransformIntent(intent),
  };
}
