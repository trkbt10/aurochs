/**
 * @file Transform serializer
 *
 * Converts Transform domain objects back into OOXML xfrm elements.
 *
 * @see docs/plans/pptx-export/phase-3-transform-serializer.md
 */

import type { Transform } from "../../domain/geometry";
import { EMU_PER_PIXEL } from "../../domain";
import { createElement, isXmlElement, type XmlElement, type XmlNode } from "@oxen/xml";

const ANGLE_UNITS_PER_DEGREE = 60000;

function pixelsToEmuString(valuePx: number): string {
  return String(Math.round(valuePx * EMU_PER_PIXEL));
}

function degreesToAngleUnitsString(valueDeg: number): string {
  return String(Math.round(valueDeg * ANGLE_UNITS_PER_DEGREE));
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

  // Rotation (in 60000ths of a degree)
  if (Number(transform.rotation) !== 0) {
    attrs.rot = degreesToAngleUnitsString(Number(transform.rotation));
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
export function patchTransformElement(
  existingXfrm: XmlElement,
  transform: Transform,
): XmlElement {
  const attrs: Record<string, string> = { ...existingXfrm.attrs };

  // Rotation: set when non-zero, otherwise remove to match writer behavior.
  if (Number(transform.rotation) !== 0) {
    attrs.rot = degreesToAngleUnitsString(Number(transform.rotation));
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

