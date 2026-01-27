/**
 * @file Shape creation bounds types
 *
 * Shared bounds type for creation flows (click/drag placement).
 */

import type { Pixels } from "@oxen/ooxml/domain/units";

export type ShapeBounds = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};
