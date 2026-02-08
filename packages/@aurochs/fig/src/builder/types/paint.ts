/**
 * @file Paint and Stroke type definitions
 */

import type { Color } from "./color";

export type Paint = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
};

export type Stroke = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
};
