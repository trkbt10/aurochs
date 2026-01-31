/**
 * @file Color serializer
 */

import { createElement, type XmlElement } from "@oxen/xml";
import type { Color, ColorTransform } from "@oxen-office/ooxml/domain/color";
import { ooxmlAngleUnits, ooxmlPercent100k } from "@oxen-builder/core";































/** Serialize a color to its XML element representation */
export function serializeColor(color: Color): XmlElement {
  const children = serializeColorTransform(color.transform);

  switch (color.spec.type) {
    case "srgb":
      return createElement(
        "a:srgbClr",
        { val: color.spec.value.toUpperCase() },
        children,
      );
    case "scheme":
      return createElement(
        "a:schemeClr",
        { val: color.spec.value },
        children,
      );
    case "system": {
      const attrs: Record<string, string> = { val: color.spec.value };
      if (color.spec.lastColor) {
        attrs.lastClr = color.spec.lastColor.toUpperCase();
      }
      return createElement("a:sysClr", attrs, children);
    }
    case "preset":
      return createElement(
        "a:prstClr",
        { val: color.spec.value },
        children,
      );
    case "hsl":
      return createElement(
        "a:hslClr",
        {
          hue: ooxmlAngleUnits(color.spec.hue),
          sat: ooxmlPercent100k(color.spec.saturation),
          lum: ooxmlPercent100k(color.spec.luminance),
        },
        children,
      );
    case "scrgb":
      return createElement(
        "a:scrgbClr",
        {
          r: ooxmlPercent100k(color.spec.red),
          g: ooxmlPercent100k(color.spec.green),
          b: ooxmlPercent100k(color.spec.blue),
        },
        children,
      );
  }
}

function serializeColorTransform(transform: ColorTransform | undefined): XmlElement[] {
  if (!transform) {
    return [];
  }

  const children: XmlElement[] = [];

  if (transform.alpha !== undefined) {
    children.push(createElement("a:alpha", { val: ooxmlPercent100k(transform.alpha) }));
  }
  if (transform.alphaMod !== undefined) {
    children.push(createElement("a:alphaMod", { val: ooxmlPercent100k(transform.alphaMod) }));
  }
  if (transform.alphaOff !== undefined) {
    children.push(createElement("a:alphaOff", { val: ooxmlPercent100k(transform.alphaOff) }));
  }
  if (transform.hue !== undefined) {
    children.push(createElement("a:hue", { val: ooxmlAngleUnits(transform.hue) }));
  }
  if (transform.hueMod !== undefined) {
    children.push(createElement("a:hueMod", { val: ooxmlPercent100k(transform.hueMod) }));
  }
  if (transform.hueOff !== undefined) {
    children.push(createElement("a:hueOff", { val: ooxmlAngleUnits(transform.hueOff) }));
  }
  if (transform.sat !== undefined) {
    children.push(createElement("a:sat", { val: ooxmlPercent100k(transform.sat) }));
  }
  if (transform.satMod !== undefined) {
    children.push(createElement("a:satMod", { val: ooxmlPercent100k(transform.satMod) }));
  }
  if (transform.satOff !== undefined) {
    children.push(createElement("a:satOff", { val: ooxmlPercent100k(transform.satOff) }));
  }
  if (transform.lum !== undefined) {
    children.push(createElement("a:lum", { val: ooxmlPercent100k(transform.lum) }));
  }
  if (transform.lumMod !== undefined) {
    children.push(createElement("a:lumMod", { val: ooxmlPercent100k(transform.lumMod) }));
  }
  if (transform.lumOff !== undefined) {
    children.push(createElement("a:lumOff", { val: ooxmlPercent100k(transform.lumOff) }));
  }
  if (transform.gamma) {
    children.push(createElement("a:gamma"));
  }
  if (transform.invGamma) {
    children.push(createElement("a:invGamma"));
  }
  if (transform.green !== undefined) {
    children.push(createElement("a:green", { val: ooxmlPercent100k(transform.green) }));
  }
  if (transform.greenMod !== undefined) {
    children.push(createElement("a:greenMod", { val: ooxmlPercent100k(transform.greenMod) }));
  }
  if (transform.greenOff !== undefined) {
    children.push(createElement("a:greenOff", { val: ooxmlPercent100k(transform.greenOff) }));
  }
  if (transform.redMod !== undefined) {
    children.push(createElement("a:redMod", { val: ooxmlPercent100k(transform.redMod) }));
  }
  if (transform.redOff !== undefined) {
    children.push(createElement("a:redOff", { val: ooxmlPercent100k(transform.redOff) }));
  }
  if (transform.blueMod !== undefined) {
    children.push(createElement("a:blueMod", { val: ooxmlPercent100k(transform.blueMod) }));
  }
  if (transform.blueOff !== undefined) {
    children.push(createElement("a:blueOff", { val: ooxmlPercent100k(transform.blueOff) }));
  }
  if (transform.shade !== undefined) {
    children.push(createElement("a:shade", { val: ooxmlPercent100k(transform.shade) }));
  }
  if (transform.tint !== undefined) {
    children.push(createElement("a:tint", { val: ooxmlPercent100k(transform.tint) }));
  }
  if (transform.comp) {
    children.push(createElement("a:comp"));
  }
  if (transform.inv) {
    children.push(createElement("a:inv"));
  }
  if (transform.gray) {
    children.push(createElement("a:gray"));
  }

  return children;
}
