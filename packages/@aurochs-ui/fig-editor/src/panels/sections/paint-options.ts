/** @file Shared paint editor options. */

import type { FigImageScaleMode } from "@aurochs/fig/types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

export const imageScaleModeOptions: readonly SelectOption<FigImageScaleMode>[] = [
  { value: "FILL", label: "Fill" },
  { value: "FIT", label: "Fit" },
  { value: "CROP", label: "Crop" },
  { value: "TILE", label: "Tile" },
  { value: "STRETCH", label: "Stretch" },
];
