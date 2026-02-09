/**
 * @file Layout patcher tests (Phase 9)
 */

import { createElement, getChild, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import type { ShapeChange } from "../core/shape-differ";
import { patchLayoutPlaceholders, patchLayoutShapes } from "./layout-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function createTransform(
  overrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = {},
): Transform {
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

// =============================================================================
// Additional Coverage Tests for patchLayoutPlaceholders
// =============================================================================

describe("patchLayoutPlaceholders (edge cases)", () => {
  it("throws when layoutXml is falsy", () => {
    expect(() => patchLayoutPlaceholders(null as never, [])).toThrow(
      "patchLayoutPlaceholders requires layoutXml.",
    );
  });

  it("throws when changes is falsy", () => {
    const layoutXml = createLayoutXml();
    expect(() => patchLayoutPlaceholders(layoutXml, null as never)).toThrow(
      "patchLayoutPlaceholders requires changes.",
    );
  });

  it("throws when p:cSld is missing", () => {
    const docXml = doc(createElement("p:sldLayout"));
    expect(() =>
      patchLayoutPlaceholders(docXml, [
        {
          placeholder: { type: "ctrTitle" },
          transform: createTransform(),
        },
      ]),
    ).toThrow("patchLayoutPlaceholders: missing p:cSld.");
  });

  it("throws when p:spTree is missing", () => {
    const docXml = doc(createElement("p:sldLayout", {}, [createElement("p:cSld")]));
    expect(() =>
      patchLayoutPlaceholders(docXml, [
        {
          placeholder: { type: "ctrTitle" },
          transform: createTransform(),
        },
      ]),
    ).toThrow("patchLayoutPlaceholders: missing p:spTree.");
  });

  it("throws when placeholder is not found", () => {
    const layoutXml = createLayoutXml();
    expect(() =>
      patchLayoutPlaceholders(layoutXml, [
        {
          placeholder: { type: "body" },
          transform: createTransform(),
        },
      ]),
    ).toThrow("patchLayoutPlaceholders: placeholder not found (type=body, idx=undefined)");
  });

  it("throws when idx is undefined and multiple placeholders match the same type", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "3", name: "Body 2" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    expect(() =>
      patchLayoutPlaceholders(layoutXml, [
        {
          placeholder: { type: "body" },
          transform: createTransform({ x: 10 }),
        },
      ]),
    ).toThrow(
      "patchLayoutPlaceholders: ambiguous placeholder (type=body); provide idx to disambiguate",
    );
  });

  it("throws when idx is specified but multiple placeholders match", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Body 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "3", name: "Body 2" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    expect(() =>
      patchLayoutPlaceholders(layoutXml, [
        {
          placeholder: { type: "body", idx: 1 },
          transform: createTransform({ x: 10 }),
        },
      ]),
    ).toThrow(
      "patchLayoutPlaceholders: multiple placeholders matched (type=body, idx=1)",
    );
  });

  it("matches placeholder by type and idx", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Body 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "3", name: "Body 2" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "2" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "body", idx: 2 },
        transform: createTransform({ x: 96, y: 48 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    // Second sp should be updated
    const shapes = spTree.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    );
    const secondSpPr = getChild(shapes[1], "p:spPr")!;
    const xfrm = getChild(secondSpPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");

    // First sp should be unchanged
    const firstSpPr = getChild(shapes[0], "p:spPr")!;
    const firstXfrm = getChild(firstSpPr, "a:xfrm")!;
    const firstOff = getChild(firstXfrm, "a:off")!;
    expect(firstOff.attrs.x).toBe("0");
  });

  it("applies multiple placeholder changes sequentially", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "3", name: "Subtitle 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "subTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 10, y: 20 }),
      },
      {
        placeholder: { type: "subTitle" },
        transform: createTransform({ x: 30, y: 40 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const shapes = spTree.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    );

    const titleOff = getChild(getChild(getChild(shapes[0], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(titleOff.attrs.x).toBe("95250");

    const subtitleOff = getChild(getChild(getChild(shapes[1], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(subtitleOff.attrs.x).toBe("285750");
  });

  it("skips non-shape nodes in spTree", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:nvGrpSpPr", {}, [
              createElement("p:cNvPr", { id: "1", name: "" }),
              createElement("p:cNvGrpSpPr"),
              createElement("p:nvPr"),
            ]),
            createElement("p:grpSpPr"),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = spTree.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    )[0];
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("patches placeholder inside a group shape", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:grpSp", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "10", name: "Group 10" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr"),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                  createElement("p:cNvSpPr"),
                  createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
                ]),
                createElement("p:spPr", {}, [
                  createElement("a:xfrm", {}, [
                    createElement("a:off", { x: "0", y: "0" }),
                    createElement("a:ext", { cx: "100", cy: "100" }),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96, y: 48 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const grpSp = getChild(spTree, "p:grpSp")!;
    const sp = getChild(grpSp, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");
  });

  it("patches placeholder on a group shape that is itself a placeholder", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:grpSp", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "10", name: "Group PH" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body" })]),
              ]),
              createElement("p:grpSpPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                  createElement("a:chOff", { x: "0", y: "0" }),
                  createElement("a:chExt", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "body" },
        transform: createTransform({ x: 96, y: 48, width: 192, height: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const grpSp = getChild(spTree, "p:grpSp")!;
    const grpSpPr = getChild(grpSp, "p:grpSpPr")!;
    const xfrm = getChild(grpSpPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");
  });

  it("patches placeholder on a p:graphicFrame via p:xfrm", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:graphicFrame", {}, [
              createElement("p:nvGraphicFramePr", {}, [
                createElement("p:cNvPr", { id: "5", name: "Table 1" }),
                createElement("p:cNvGraphicFramePr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "tbl" })]),
              ]),
              createElement("p:xfrm", {}, [
                createElement("a:off", { x: "0", y: "0" }),
                createElement("a:ext", { cx: "100", cy: "100" }),
              ]),
              createElement("a:graphic"),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "tbl" },
        transform: createTransform({ x: 96, y: 48 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const gf = getChild(spTree, "p:graphicFrame")!;
    const xfrm = getChild(gf, "p:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("patches placeholder on a p:cxnSp via p:spPr", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:cxnSp", {}, [
              createElement("p:nvCxnSpPr", {}, [
                createElement("p:cNvPr", { id: "7", name: "Connector 1" }),
                createElement("p:cNvCxnSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "body" },
        transform: createTransform({ x: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const cxnSp = getChild(spTree, "p:cxnSp")!;
    const spPr = getChild(cxnSp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("patches placeholder on a p:pic via p:spPr", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:pic", {}, [
              createElement("p:nvPicPr", {}, [
                createElement("p:cNvPr", { id: "8", name: "Picture 1" }),
                createElement("p:cNvPicPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "pic" })]),
              ]),
              createElement("p:blipFill", {}, [createElement("a:blip", { "r:embed": "rId1" })]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "pic" },
        transform: createTransform({ x: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const pic = getChild(spTree, "p:pic")!;
    const spPr = getChild(pic, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("returns shape unchanged when spPr is missing for placeholder", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              // No p:spPr at all
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = getChild(spTree, "p:sp")!;
    // Shape is unchanged since spPr is missing
    expect(getChild(sp, "p:spPr")).toBeUndefined();
  });

  it("creates a:xfrm when missing from p:spPr for placeholder", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96, y: 48 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = getChild(spTree, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    expect(xfrm).toBeDefined();
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
    expect(off.attrs.y).toBe("457200");
  });

  it("ignores shapes without nvPr (non-placeholder)", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "99", name: "No PH" }),
                createElement("p:cNvSpPr"),
                // No p:nvPr at all
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96 }),
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const shapes = spTree.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    );
    // Second shape should be patched
    const secondSpPr = getChild(shapes[1], "p:spPr")!;
    const xfrm = getChild(secondSpPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("returns empty changes list without error", () => {
    const layoutXml = createLayoutXml();
    const updated = patchLayoutPlaceholders(layoutXml, []);
    expect(updated).toEqual(layoutXml);
  });

  it("does not match when ph has no type attribute and none is missing from nv", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    // Try to match "body" - should not match "ctrTitle"
    expect(() =>
      patchLayoutPlaceholders(layoutXml, [
        { placeholder: { type: "body" }, transform: createTransform() },
      ]),
    ).toThrow("patchLayoutPlaceholders: placeholder not found (type=body, idx=undefined)");
  });

  it("ignores shapes without p:ph element in nvPr", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "99", name: "No PH" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr"), // Has nvPr but no p:ph child
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      { placeholder: { type: "ctrTitle" }, transform: createTransform({ x: 96 }) },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const shapes = spTree.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    );
    // First shape is unchanged (no placeholder)
    const firstOff = getChild(getChild(getChild(shapes[0], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(firstOff.attrs.x).toBe("0");
    // Second shape is patched
    const secondOff = getChild(getChild(getChild(shapes[1], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(secondOff.attrs.x).toBe("914400");
  });

  it("ignores non-placeholder shapes inside a group", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:grpSp", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "10", name: "Group 10" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"), // Group is not a placeholder
              ]),
              createElement("p:grpSpPr"),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "99", name: "No PH" }),
                  createElement("p:cNvSpPr"),
                  createElement("p:nvPr"), // shape without placeholder inside group
                ]),
                createElement("p:spPr", {}, [
                  createElement("a:xfrm", {}, [
                    createElement("a:off", { x: "0", y: "0" }),
                    createElement("a:ext", { cx: "100", cy: "100" }),
                  ]),
                ]),
              ]),
              createElement("p:sp", {}, [
                createElement("p:nvSpPr", {}, [
                  createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                  createElement("p:cNvSpPr"),
                  createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
                ]),
                createElement("p:spPr", {}, [
                  createElement("a:xfrm", {}, [
                    createElement("a:off", { x: "0", y: "0" }),
                    createElement("a:ext", { cx: "100", cy: "100" }),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      { placeholder: { type: "ctrTitle" }, transform: createTransform({ x: 96 }) },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const grpSp = getChild(spTree, "p:grpSp")!;
    const shapes = grpSp.children.filter(
      (c): c is XmlElement => c.type === "element" && c.name === "p:sp",
    );
    // First shape in group is unchanged (no placeholder)
    const firstOff = getChild(getChild(getChild(shapes[0], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(firstOff.attrs.x).toBe("0");
    // Second shape in group is patched
    const secondOff = getChild(getChild(getChild(shapes[1], "p:spPr")!, "a:xfrm")!, "a:off")!;
    expect(secondOff.attrs.x).toBe("914400");
  });

  it("skips group that is a placeholder of a different type", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:grpSp", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "10", name: "Group PH" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "body" })]),
              ]),
              createElement("p:grpSpPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                  createElement("a:chOff", { x: "0", y: "0" }),
                  createElement("a:chExt", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    // Search for ctrTitle, not body. The group ph with type=body should not match.
    const updated = patchLayoutPlaceholders(layoutXml, [
      { placeholder: { type: "ctrTitle" }, transform: createTransform({ x: 96 }) },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    // Group should be unchanged
    const grpSp = getChild(spTree, "p:grpSp")!;
    const grpSpPr = getChild(grpSp, "p:grpSpPr")!;
    const grpXfrm = getChild(grpSpPr, "a:xfrm")!;
    const grpOff = getChild(grpXfrm, "a:off")!;
    expect(grpOff.attrs.x).toBe("0");
    // Shape should be patched
    const sp = getChild(spTree, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("returns null from parsePlaceholderRef when nv element is missing", () => {
    // A p:grpSp without p:nvGrpSpPr child
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:grpSp", {}, [
              // Missing p:nvGrpSpPr entirely
              createElement("p:grpSpPr"),
            ]),
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    const updated = patchLayoutPlaceholders(layoutXml, [
      { placeholder: { type: "ctrTitle" }, transform: createTransform({ x: 96 }) },
    ]);

    const root = updated.children[0] as XmlElement;
    const cSld = getChild(root, "p:cSld")!;
    const spTree = getChild(cSld, "p:spTree")!;
    const sp = getChild(spTree, "p:sp")!;
    const spPr = getChild(sp, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe("914400");
  });

  it("handles placeholder idx parsing with non-numeric idx", () => {
    const layoutXml = doc(
      createElement("p:sldLayout", {}, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [
            createElement("p:sp", {}, [
              createElement("p:nvSpPr", {}, [
                createElement("p:cNvPr", { id: "2", name: "Title 1" }),
                createElement("p:cNvSpPr"),
                createElement("p:nvPr", {}, [createElement("p:ph", { type: "ctrTitle", idx: "notanumber" })]),
              ]),
              createElement("p:spPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "100", cy: "100" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );

    // Should match since idx is undefined when not a finite number, and placeholder change has no idx
    const updated = patchLayoutPlaceholders(layoutXml, [
      {
        placeholder: { type: "ctrTitle" },
        transform: createTransform({ x: 96 }),
      },
    ]);

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
