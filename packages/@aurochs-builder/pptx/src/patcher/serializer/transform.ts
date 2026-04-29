/**
 * @file Transform serializer
 *
 * Converts Transform domain objects back into OOXML xfrm elements.
 *
 * @see docs/plans/pptx-export/phase-3-transform-serializer.md
 */

import type { Transform } from "@aurochs-office/drawing-ml/domain/geometry";
import { EMU_PER_PIXEL } from "@aurochs-office/ooxml/domain/ooxml-units";
import { createElement, isXmlElement, type XmlElement, type XmlNode } from "@aurochs/xml";

const ANGLE_UNITS_PER_DEGREE = 60000;

function pixelsToEmuString(valuePx: number): string {
  return String(Math.round(valuePx * EMU_PER_PIXEL));
}

function degreesToAngleUnitsString(valueDeg: number): string {
  return String(Math.round(valueDeg * ANGLE_UNITS_PER_DEGREE));
}

/**
 * Collapse 360°·k (geometric identity rotations) to 0° while
 * preserving the sign of any other rotation. ECMA-376 ST_Angle
 * accepts negative values, so existing behaviour for `rot="-2700000"`
 * is kept intact; only exact multiples of 360° (which serialise to
 * `rot="21600000"` and friends, outside ST_PositiveFixedAngle's
 * [0, 21600000) range) are folded to 0.
 */
function normalizeRotation(valueDeg: number): number {
  if (!Number.isFinite(valueDeg)) {return 0;}
  if (valueDeg !== 0 && valueDeg % 360 === 0) {return 0;}
  return valueDeg;
}

function buildOffElement(transform: Transform): XmlElement {
  return createElement("a:off", {
    x: pixelsToEmuString(Number(transform.x)),
    y: pixelsToEmuString(Number(transform.y)),
  });
}

function buildExtElement(transform: Transform): XmlElement {
  return createElement("a:ext", {
    cx: pixelsToEmuString(Number(transform.width)),
    cy: pixelsToEmuString(Number(transform.height)),
  });
}

function buildTransformAttrs(transform: Transform): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Rotation (in 60000ths of a degree). Wrap into [0, 360) — PowerPoint
  // treats 360° identically to 0° but ECMA-376 ST_PositiveFixedAngle
  // is a half-open range [0, 21600000), so emitting exactly 360° is
  // technically out of range. 0 is the normal form; non-zero values
  // become the modulo-21600000 equivalent.
  const normalized = normalizeRotation(Number(transform.rotation));
  if (normalized !== 0) {
    attrs.rot = degreesToAngleUnitsString(normalized);
  }

  // Flip attributes (only write when true)
  if (transform.flipH) {
    attrs.flipH = "1";
  }
  if (transform.flipV) {
    attrs.flipV = "1";
  }

  return attrs;
}

/**
 * Transform を a:xfrm 要素に変換する
 *
 * @example
 * 入力: { x: 96px, y: 48px, width: 192px, height: 96px, rotation: 45deg }
 * 出力:
 * <a:xfrm rot="2700000">
 *   <a:off x="914400" y="457200"/>
 *   <a:ext cx="1828800" cy="914400"/>
 * </a:xfrm>
 */
export function serializeTransform(transform: Transform): XmlElement {
  return createElement("a:xfrm", buildTransformAttrs(transform), [
    buildOffElement(transform),
    buildExtElement(transform),
  ]);
}

/**
 * 既存の xfrm 要素を Transform で更新する。
 *
 * - 既存要素の flipH/flipV などの属性を保持しつつ更新
 * - chOff/chExt（グループ用）や extLst などの子要素を保持
 * - a:off / a:ext のみを差し替える
 */
export function patchTransformElement(existingXfrm: XmlElement, transform: Transform): XmlElement {
  const attrs: Record<string, string> = { ...existingXfrm.attrs };

  // Rotation: set when non-zero, otherwise remove to match writer behavior.
  // Normalize to [0, 360) so 360° (== 21600000 angle units, out-of-range
  // in ST_PositiveFixedAngle) is written as no rotation.
  const normalized = normalizeRotation(Number(transform.rotation));
  if (normalized !== 0) {
    attrs.rot = degreesToAngleUnitsString(normalized);
  } else {
    delete attrs.rot;
  }

  // Flip: preserve existing when not explicitly true.
  if (transform.flipH) {
    attrs.flipH = "1";
  }
  if (transform.flipV) {
    attrs.flipV = "1";
  }

  const preservedChildren: XmlNode[] = existingXfrm.children.filter((child) => {
    if (!isXmlElement(child)) {
      return true;
    }
    return child.name !== "a:off" && child.name !== "a:ext";
  });

  return createElement(existingXfrm.name, attrs, [
    buildOffElement(transform),
    buildExtElement(transform),
    ...preservedChildren,
  ]);
}
