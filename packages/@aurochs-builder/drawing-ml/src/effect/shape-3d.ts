/**
 * @file 3D shape property builders for DrawingML
 */

import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { Shape3dSpec, BevelSpec } from "../types";

/**
 * 3D bevel domain type
 */
export type Bevel3d = {
  readonly preset: string;
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * 3D shape domain type
 */
export type Shape3d = {
  readonly bevelTop?: Bevel3d;
  readonly bevelBottom?: Bevel3d;
  readonly preset?: string;
  readonly extrusionHeight?: Pixels;
};

/**
 * Build 3D bevel from spec
 */
export function buildBevel(spec: BevelSpec): Bevel3d {
  return {
    preset: spec.preset ?? "circle",
    width: px(spec.width ?? 8),
    height: px(spec.height ?? 8),
  };
}

/**
 * Build 3D shape properties from spec
 */
export function buildShape3d(spec: Shape3dSpec): Shape3d {
  return {
    ...(spec.bevelTop && { bevelTop: buildBevel(spec.bevelTop) }),
    ...(spec.bevelBottom && { bevelBottom: buildBevel(spec.bevelBottom) }),
    ...(spec.material && { preset: spec.material }),
    ...(spec.extrusionHeight !== undefined && { extrusionHeight: px(spec.extrusionHeight) }),
  };
}
