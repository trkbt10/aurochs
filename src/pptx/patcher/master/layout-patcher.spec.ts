/**
 * @file Layout patcher tests (Phase 9)
 */

import type { XmlDocument, XmlElement } from "../../../xml";
import { getChild } from "../../../xml";
import { deg, px } from "../../domain/types";
import type { Transform } from "../../domain/geometry";
import type { ShapeChange } from "../core/shape-differ";
import { createElement } from "../core/xml-mutator";
import { patchLayoutPlaceholders, patchLayoutShapes } from "./layout-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function createTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
}> = {}): Transform {
  return {
    x: px(overrides.x ?? 0),
    y: px(overrides.y ?? 0),
    width: px(overrides.width ?? 100),
    height: px(overrides.height ?? 100),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
}

function createLayoutXml(): XmlDocument {
  return doc(
    createElement("p:sldLayout", {}, [
      createElement("p:cSld", {}, [
        createElement("p:spTree", {}, [
          createElement("p:sp", {}, [
            createElement("p:nvSpPr", {}, [
              createElement("p:cNvPr", { id: "2", name: "Title 1" }),
              createElement("p:cNvSpPr", {}),
              createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
            ]),
            createElement("p:spPr", {}, [
              createElement("a:xfrm", {}, [
                createElement("a:off", { x: "0", y: "0" }),
                createElement("a:ext", { cx: "952500", cy: "952500" }),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  );
}

describe("patchLayoutPlaceholders", () => {
  it("updates placeholder position + size", () => {
    const layoutXml = createLayoutXml();
    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96, y: 48, width: 192, height: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = getChild(spTree, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    const ext = getChild(xfrm, "a:ext")!;

    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");
    expect(ext.attrs.cx).toBe("1828800");
    expect(ext.attrs.cy).toBe("914400");
  });
});

describe("patchLayoutShapes", () => {
  it("delegates to patchSlideXml for layout shape changes", () => {
    const layoutXml = createLayoutXml();

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "2",
        shapeType: "sp",
        changes: [
          {
            property: "transform",
            oldValue: createTransform({ x: 0, y: 0, width: 100, height: 100 }),
            newValue: createTransform({ x: 96, y: 48, width: 192, height: 96 }),
          },
        ],
      },
    ];

    const updated = patchLayoutShapes(layoutXml, changes);
    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = getChild(spTree, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;

    expect(off.attrs.x).toBe("914400");
  });
});

