/**
 * @file Effect data types
 */

import type { Color } from "../types";
import type { EffectType, BlendMode } from "../../constants";

export type BaseEffectData = {
  readonly type: { value: number; name: EffectType };
  readonly visible: boolean;
};

export type ShadowEffectData = BaseEffectData & {
  readonly color: Color;
  readonly offset: { x: number; y: number };
  readonly radius: number;
  readonly spread?: number;
  readonly blendMode?: { value: number; name: BlendMode };
  readonly showShadowBehindNode?: boolean;
};

export type BlurEffectData = BaseEffectData & {
  readonly radius: number;
};

export type EffectData = ShadowEffectData | BlurEffectData;
