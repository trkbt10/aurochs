/**
 * @file Layer placement types for editor layouts
 *
 * Defines how each editor layer is placed (grid, drawer, or hidden).
 * Shared between layout schema builders and the PresentationEditor layer builder.
 */

import type { DrawerBehavior, WindowPosition } from "react-panel-layout";

export type LayerPlacement =
  | {
      readonly type: "grid";
      readonly gridArea: string;
      readonly scrollable?: boolean;
    }
  | {
      readonly type: "drawer";
      readonly drawer: DrawerBehavior;
      readonly width?: string | number;
      readonly height?: string | number;
      readonly position?: WindowPosition;
      readonly zIndex?: number;
      readonly scrollable?: boolean;
    }
  | {
      readonly type: "hidden";
    };

export type LayerPlacements = {
  readonly thumbnails: LayerPlacement;
  readonly inspector: LayerPlacement;
};

