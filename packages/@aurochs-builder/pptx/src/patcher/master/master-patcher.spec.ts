/**
 * @file Master patcher tests (Phase 9)
 */

import { createElement, getChild, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type { ShapeChange } from "../core/shape-differ";
import type { ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import { patchBodyStyle, patchDefaultTextStyle, patchMasterShapes, patchTitleStyle } from "./master-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function createTransform(
  overrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  }> = {},
): Transform {
  const defaults = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
  return {
    x: px(defaults.x),
    y: px(defaults.y),
    width: px(defaults.width),
    height: px(defaults.height),
    rotation: deg(defaults.rotation),
    flipH: defaults.flipH,
    flipV: defaults.flipV,
  };
}

function createMasterXml(
  options: Partial<{
    shape: XmlElement;
    titleStyle: XmlElement;
    bodyStyle: XmlElement;
    otherStyle: XmlElement;
  }> = {},
): XmlDocument {
  const shape =
    options.shape ??
    createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "1", name: "Shape 1" }),
        createElement("p:cNvSpPr", {}),
        createElement("p:nvPr", {}),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "952500", cy: "952500" }),
        ]),
      ]),
    ]);

  const titleStyle =
    options.titleStyle ??
    createElement("p:titleStyle", {}, [
      createElement("a:lvl1pPr", { marL: "342900" }, [createElement("a:buChar", { char: "•" })]),
    ]);

  const bodyStyle =
    options.bodyStyle ?? createElement("p:bodyStyle", {}, [createElement("a:lvl1pPr", { marL: "123" }, [])]);

  const otherStyle = options.otherStyle ?? createElement("p:otherStyle", {}, [createElement("a:lvl1pPr", {}, [])]);

  return doc(
    createElement("p:sldMaster", {}, [
      createElement("p:cSld", {}, [createElement("p:spTree", {}, [shape])]),
      createElement("p:txStyles", {}, [titleStyle, bodyStyle, otherStyle]),
    ]),
  );
}

describe("patchMasterShapes", () => {
  it("updates master shape transform via ShapeChange[]", () => {
    const masterXml = createMasterXml();

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "1",
        shapeType: "sp",
        changes: [
          {
            property: "transform",
            oldValue: createTransform({ x: 0, y: 0, width: 100, height: 100 }),
            newValue: createTransform({ x: 96, y: 48, width: 192, height: 96, rotation: 0 }),
          },
        ],
      },
    ];

    const updated = patchMasterShapes(masterXml, changes);
    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const shape = getChild(spTree, "p:sp")!;
    const spPr = getChild(shape, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    const ext = getChild(xfrm, "a:ext")!;

    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");
    expect(ext.attrs.cx).toBe("1828800");
    expect(ext.attrs.cy).toBe("914400");
  });
});

describe("patchTitleStyle / patchBodyStyle", () => {
  it("patches titleStyle non-destructively (preserves marL + buChar when not specified)", () => {
    const masterXml = createMasterXml();

    const updated = patchTitleStyle(masterXml, {
      level1: { paragraphProperties: { alignment: "center" } },
    });

    const root = updated.children[0] as XmlElement;
    const txStyles = getChild(root, "p:txStyles")!;
    const titleStyle = getChild(txStyles, "p:titleStyle")!;
    const lvl1 = getChild(titleStyle, "a:lvl1pPr")!;

    expect(lvl1.attrs.algn).toBe("ctr");
    expect(lvl1.attrs.marL).toBe("342900");
    expect(getChild(lvl1, "a:buChar")).not.toBeUndefined();
  });

  it("patches bodyStyle and can replace bullet group when bulletStyle is provided", () => {
    const masterXml = createMasterXml({
      bodyStyle: createElement("p:bodyStyle", {}, [
        createElement("a:lvl1pPr", {}, [createElement("a:buChar", { char: "•" })]),
      ]),
    });

    const updated = patchBodyStyle(masterXml, {
      level1: {
        paragraphProperties: {
          bulletStyle: {
            bullet: { type: "none" },
            colorFollowText: true,
            sizeFollowText: true,
            fontFollowText: true,
          },
        },
      },
    });

    const root = updated.children[0] as XmlElement;
    const txStyles = getChild(root, "p:txStyles")!;
    const bodyStyle = getChild(txStyles, "p:bodyStyle")!;
    const lvl1 = getChild(bodyStyle, "a:lvl1pPr")!;

    expect(getChild(lvl1, "a:buChar")).toBeUndefined();
    expect(getChild(lvl1, "a:buNone")).not.toBeUndefined();
  });
});

describe("patchDefaultTextStyle", () => {
  it("patches a:lvlNpPr across title/body/other styles", () => {
    const masterXml = createMasterXml();
    const stylePatch: ParagraphProperties = { marginLeft: px(200) };

    const updated = patchDefaultTextStyle(masterXml, 2, stylePatch);

    const root = updated.children[0] as XmlElement;
    const txStyles = getChild(root, "p:txStyles")!;
    const titleStyle = getChild(txStyles, "p:titleStyle")!;
    const bodyStyle = getChild(txStyles, "p:bodyStyle")!;
    const otherStyle = getChild(txStyles, "p:otherStyle")!;

    expect(getChild(titleStyle, "a:lvl2pPr")?.attrs.marL).toBe("1905000");
    expect(getChild(bodyStyle, "a:lvl2pPr")?.attrs.marL).toBe("1905000");
    expect(getChild(otherStyle, "a:lvl2pPr")?.attrs.marL).toBe("1905000");
  });
});
