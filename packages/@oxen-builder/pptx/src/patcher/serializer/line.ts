/** @file Line serializer for a:ln element */
import { createElement, type XmlElement } from "@oxen/xml";
import type { CustomDash, Line, LineEnd } from "@oxen-office/pptx/domain";
import { serializeFill } from "./fill";
import { ooxmlEmu, ooxmlPercent100k } from "@oxen-builder/core";































/** Serialize line properties to a:ln element */
export function serializeLine(line: Line): XmlElement {
  const attrs: Record<string, string> = {
    w: ooxmlEmu(line.width),
    cap: serializeLineCap(line.cap),
    cmpd: line.compound,
    algn: line.alignment,
  };

  const children: XmlElement[] = [
    serializeFill(line.fill),
    serializeDash(line.dash),
  ];

  if (line.headEnd) {
    children.push(serializeLineEnd("a:headEnd", line.headEnd));
  }
  if (line.tailEnd) {
    children.push(serializeLineEnd("a:tailEnd", line.tailEnd));
  }

  children.push(serializeLineJoin(line));

  return createElement("a:ln", attrs, children);
}

function serializeLineCap(cap: Line["cap"]): string {
  switch (cap) {
    case "flat":
      return "flat";
    case "round":
      return "rnd";
    case "square":
      return "sq";
  }
}

function serializeDash(dash: string | CustomDash): XmlElement {
  if (typeof dash === "string") {
    return createElement("a:prstDash", { val: dash });
  }

  return createElement(
    "a:custDash",
    {},
    dash.dashes.map((d) =>
      createElement("a:ds", {
        d: ooxmlPercent100k(d.dashLength),
        sp: ooxmlPercent100k(d.spaceLength),
      }),
    ),
  );
}

function serializeLineEnd(name: "a:headEnd" | "a:tailEnd", end: LineEnd): XmlElement {
  return createElement(name, {
    type: end.type,
    w: end.width,
    len: end.length,
  });
}

function serializeLineJoin(line: Line): XmlElement {
  switch (line.join) {
    case "bevel":
      return createElement("a:bevel");
    case "round":
      return createElement("a:round");
    case "miter": {
      const attrs: Record<string, string> = {};
      if (line.miterLimit !== undefined) {
        attrs.lim = String(Math.round((line.miterLimit / 100) * 100000));
      }
      return createElement("a:miter", attrs);
    }
  }
}
