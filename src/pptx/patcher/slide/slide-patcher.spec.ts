/**
 * @file Slide Patcher Tests
 */

import type { XmlDocument, XmlElement } from "../../../xml";
import { isXmlElement, getChild } from "../../../xml";
import type { ShapeChange } from "../core/shape-differ";
import type { Transform } from "../../domain/geometry";
import { EMU_PER_PIXEL } from "../../domain";
import { px, deg } from "../../domain/types";
import type { SpShape } from "../../domain/shape";
import type { TextBody } from "../../domain/text";
import { parseShapeTree } from "../../parser/shape-parser";
import { patchSlideXml, getSpTree, hasShapes } from "./slide-patcher";
import { createElement, findShapeById } from "../core/xml-mutator";

// =============================================================================
// Test Helpers
// =============================================================================

function createSlideDocument(shapes: XmlElement[]): XmlDocument {
  const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
  const grpSpPr = createElement("p:grpSpPr");
  const spTree = createElement("p:spTree", {}, [nvGrpSpPr, grpSpPr, ...shapes]);
  const cSld = createElement("p:cSld", {}, [spTree]);
  const root = createElement("p:sld", {}, [cSld]);
  return { children: [root] };
}

function createShapeElement(id: string, x = 0, y = 0, width = 100, height = 100): XmlElement {
  return createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id, name: `Shape ${id}` }),
      createElement("p:cNvSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:spPr", {}, [
      createElement("a:xfrm", {}, [
        createElement("a:off", { x: String(x), y: String(y) }),
        createElement("a:ext", { cx: String(width), cy: String(height) }),
      ]),
    ]),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr"),
      createElement("a:lstStyle"),
      createElement("a:p"),
    ]),
  ]);
}

function createShapeElementWithSpPrChildren(id: string, spPrChildren: XmlElement[]): XmlElement {
  return createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id, name: `Shape ${id}` }),
      createElement("p:cNvSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:spPr", {}, [
      createElement("a:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      ...spPrChildren,
    ]),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr"),
      createElement("a:lstStyle"),
      createElement("a:p"),
    ]),
  ]);
}

function createGroupElement(id: string, children: XmlElement[] = []): XmlElement {
  return createElement("p:grpSp", {}, [
    createElement("p:nvGrpSpPr", {}, [
      createElement("p:cNvPr", { id, name: `Group ${id}` }),
      createElement("p:cNvGrpSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:grpSpPr", {}, [
      createElement("a:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "0", cy: "0" }),
        createElement("a:chOff", { x: "0", y: "0" }),
        createElement("a:chExt", { cx: "0", cy: "0" }),
      ]),
    ]),
    ...children,
  ]);
}

function createDomainSpShape(id: string, x = 0): SpShape {
  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: createTransform({ x }),
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
    },
  };
}

function createTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}> = {}): Transform {
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

function pxToEmuString(valuePx: number): string {
  return String(Math.round(valuePx * EMU_PER_PIXEL));
}

function getShapeById(doc: XmlDocument, id: string): XmlElement | null {
  const spTree = getSpTree(doc);
  if (!spTree) return null;
  return findShapeById(spTree, id);
}

function getXfrmFromShape(shape: XmlElement): XmlElement | null {
  const spPr = getChild(shape, "p:spPr");
  if (!spPr) return null;
  return getChild(spPr, "a:xfrm") ?? null;
}

// =============================================================================
// patchSlideXml Tests
// =============================================================================

describe("patchSlideXml", () => {
  describe("shape addition", () => {
    it("adds a shape to the slide", () => {
      const doc = createSlideDocument([createShapeElement("2")]);
      const changes: ShapeChange[] = [{ type: "added", shape: createDomainSpShape("3", 50) }];

      const result = patchSlideXml(doc, changes);
      expect(getShapeById(result, "3")).not.toBeNull();

      const parsed = parseShapeTree(getSpTree(result) ?? undefined);
      const added = parsed.find((s): s is Extract<typeof s, { type: "sp" }> => s.type === "sp" && s.nonVisual.id === "3");
      expect(added?.properties.transform?.x).toBe(px(50));
    });

    it("round-trips added shape textBody through parser", () => {
      const doc = createSlideDocument([]);
      const textBody: TextBody = {
        bodyProperties: {},
        paragraphs: [
          {
            properties: {},
            runs: [{ type: "text", text: "Hello" }],
          },
        ],
      };
      const shape = { ...createDomainSpShape("3", 0), textBody };
      const changes: ShapeChange[] = [{ type: "added", shape }];

      const result = patchSlideXml(doc, changes);
      const parsed = parseShapeTree(getSpTree(result) ?? undefined);
      const added = parsed.find((s): s is Extract<typeof s, { type: "sp" }> => s.type === "sp" && s.nonVisual.id === "3");
      const run = added?.textBody?.paragraphs[0]?.runs[0];
      expect(run && run.type === "text" ? run.text : undefined).toBe("Hello");
    });

    it("inserts a shape after a specific id", () => {
      const doc = createSlideDocument([createShapeElement("2"), createShapeElement("3")]);
      const changes: ShapeChange[] = [{ type: "added", shape: createDomainSpShape("4"), afterId: "2" }];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result)!;
      const ids = spTree.children
        .filter((c): c is XmlElement => isXmlElement(c) && c.name === "p:sp")
        .map((sp) => getChild(getChild(sp, "p:nvSpPr")!, "p:cNvPr")!.attrs.id);
      expect(ids).toEqual(["2", "4", "3"]);
    });

    it("adds a shape inside a group when parentId is provided", () => {
      const group = createGroupElement("10", [createShapeElement("2")]);
      const doc = createSlideDocument([group]);
      const changes: ShapeChange[] = [
        { type: "added", shape: createDomainSpShape("3"), parentId: "10", afterId: "2" },
      ];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result)!;
      const updatedGroup = findShapeById(spTree, "10");
      expect(updatedGroup).not.toBeNull();

      const hasChild3 = updatedGroup && updatedGroup.name === "p:grpSp"
        ? updatedGroup.children.some((c) =>
            isXmlElement(c) &&
            c.name === "p:sp" &&
            getChild(getChild(c, "p:nvSpPr")!, "p:cNvPr")!.attrs.id === "3")
        : false;
      expect(hasChild3).toBe(true);
    });
  });

  describe("shape removal", () => {
    it("removes a shape from the slide", () => {
      const shape1 = createShapeElement("2");
      const shape2 = createShapeElement("3");
      const doc = createSlideDocument([shape1, shape2]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "2" },
      ];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result);

      expect(spTree).not.toBeNull();
      // Should have nvGrpSpPr, grpSpPr, and one shape (id=3)
      const shapes = spTree!.children.filter(
        (c) => isXmlElement(c) && c.name === "p:sp",
      );
      expect(shapes).toHaveLength(1);
      expect(getShapeById(result, "2")).toBeNull();
      expect(getShapeById(result, "3")).not.toBeNull();
    });

    it("does nothing when shape not found", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "999" },
      ];

      const result = patchSlideXml(doc, changes);
      expect(getShapeById(result, "2")).not.toBeNull();
    });
  });

  describe("transform modification", () => {
    it("updates position in a:xfrm", () => {
      const shape = createShapeElement("2", 0, 0);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ x: 0, y: 0 }),
              newValue: createTransform({ x: 500, y: 300 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      expect(modifiedShape).not.toBeNull();

      const xfrm = getXfrmFromShape(modifiedShape!);
      expect(xfrm).not.toBeNull();

      const off = getChild(xfrm!, "a:off");
      expect(off?.attrs.x).toBe(pxToEmuString(500));
      expect(off?.attrs.y).toBe(pxToEmuString(300));
    });

    it("updates size in a:xfrm", () => {
      const shape = createShapeElement("2", 0, 0, 100, 100);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ width: 100, height: 100 }),
              newValue: createTransform({ width: 200, height: 150 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      const ext = getChild(xfrm!, "a:ext");
      expect(ext?.attrs.cx).toBe(pxToEmuString(200));
      expect(ext?.attrs.cy).toBe(pxToEmuString(150));
    });

    it("adds rotation attribute when non-zero", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ rotation: 0 }),
              newValue: createTransform({ rotation: 45 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      // 45 degrees = 45 * 60000 = 2700000
      expect(xfrm?.attrs.rot).toBe("2700000");
    });

    it("does not add rotation attribute when zero", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ x: 10 }), // No rotation
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      expect(xfrm?.attrs.rot).toBeUndefined();
    });

    it("adds flip attributes when true", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ flipH: true, flipV: true }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const xfrm = getXfrmFromShape(modifiedShape!);

      expect(xfrm?.attrs.flipH).toBe("1");
      expect(xfrm?.attrs.flipV).toBe("1");
    });
  });

  describe("fill modification", () => {
    it("replaces existing fill element in p:spPr", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "fill",
              oldValue: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
              newValue: { type: "noFill" },
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      expect(spPr).toBeDefined();

      expect(getChild(spPr!, "a:noFill")).toBeDefined();
      expect(getChild(spPr!, "a:solidFill")).toBeUndefined();
    });

    it("removes fill elements when newValue is undefined", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "fill",
              oldValue: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
              newValue: undefined,
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      expect(getChild(spPr!, "a:solidFill")).toBeUndefined();
      expect(getChild(spPr!, "a:noFill")).toBeUndefined();
    });
  });

  describe("line modification", () => {
    it("replaces existing a:ln element in p:spPr", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:ln", { w: "12700" }, [
          createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
        ]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "line",
              oldValue: undefined,
              newValue: {
                width: px(2),
                cap: "round",
                compound: "dbl",
                alignment: "ctr",
                fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
                dash: "dash",
                join: "round",
              },
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      const ln = getChild(spPr!, "a:ln");
      expect(ln).toBeDefined();
      expect(ln?.attrs.w).toBe(pxToEmuString(2));
      expect(ln?.attrs.cap).toBe("rnd");
      expect(getChild(getChild(ln!, "a:solidFill")!, "a:srgbClr")?.attrs.val).toBe("FF0000");
      expect(getChild(ln!, "a:prstDash")?.attrs.val).toBe("dash");
    });

    it("removes a:ln when newValue is undefined", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:ln", { w: "12700" }, [
          createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
        ]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "line",
              oldValue: undefined,
              newValue: undefined,
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      expect(getChild(spPr!, "a:ln")).toBeUndefined();
    });
  });

  describe("textBody modification", () => {
    it("patches p:txBody paragraphs while preserving existing a:bodyPr", () => {
      const shape = createElement("p:sp", {}, [
        createElement("p:nvSpPr", {}, [
          createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
          createElement("p:cNvSpPr"),
          createElement("p:nvPr"),
        ]),
        createElement("p:spPr", {}, [
          createElement("a:xfrm", {}, [
            createElement("a:off", { x: "0", y: "0" }),
            createElement("a:ext", { cx: "100", cy: "100" }),
          ]),
        ]),
        createElement("p:txBody", {}, [
          createElement("a:bodyPr", { wrap: "none", anchor: "ctr" }),
          createElement("a:lstStyle"),
          createElement("a:p"),
          createElement("a:extLst"),
        ]),
      ]);

      const doc = createSlideDocument([shape]);
      const nextTextBody: TextBody = {
        bodyProperties: { wrapping: "square", anchor: "top" },
        paragraphs: [
          {
            properties: {},
            runs: [{ type: "text", text: "Changed", properties: { bold: true } }],
          },
        ],
      };

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            { property: "textBody", oldValue: undefined, newValue: nextTextBody },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2")!;
      const txBody = getChild(modifiedShape, "p:txBody")!;

      expect(getChild(txBody, "a:extLst")).toBeDefined();
      const bodyPr = getChild(txBody, "a:bodyPr")!;
      expect(bodyPr.attrs.wrap).toBe("none");
      expect(bodyPr.attrs.anchor).toBe("ctr");

      const p = getChild(txBody, "a:p")!;
      const r = getChild(p, "a:r")!;
      const rPr = getChild(r, "a:rPr")!;
      expect(rPr.attrs.b).toBe("1");
      const t = getChild(r, "a:t")!;
      expect(t.children[0] && !isXmlElement(t.children[0]) ? t.children[0].value : "").toBe("Changed");
    });
  });

  describe("effects modification", () => {
    it("replaces existing a:effectLst", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:effectLst", {}, [
          createElement("a:outerShdw", { blurRad: "0", dist: "0", dir: "0" }, [
            createElement("a:srgbClr", { val: "000000" }),
          ]),
        ]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "effects",
              oldValue: undefined,
              newValue: {
                glow: {
                  color: { spec: { type: "srgb", value: "00FF00" } },
                  radius: px(3),
                },
              },
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      const effectLst = getChild(spPr!, "a:effectLst");
      expect(effectLst).toBeDefined();
      expect(getChild(effectLst!, "a:glow")).toBeDefined();
      expect(getChild(effectLst!, "a:outerShdw")).toBeUndefined();
    });

    it("removes effects when newValue is undefined", () => {
      const shape = createShapeElementWithSpPrChildren("2", [
        createElement("a:effectLst", {}, [
          createElement("a:glow", { rad: "0" }, [
            createElement("a:srgbClr", { val: "00FF00" }),
          ]),
        ]),
      ]);
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "effects",
              oldValue: undefined,
              newValue: undefined,
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      const modifiedShape = getShapeById(result, "2");
      const spPr = getChild(modifiedShape!, "p:spPr");
      expect(getChild(spPr!, "a:effectLst")).toBeUndefined();
      expect(getChild(spPr!, "a:effectDag")).toBeUndefined();
    });
  });

  describe("multiple changes", () => {
    it("applies multiple changes in order", () => {
      const shape1 = createShapeElement("2", 0, 0);
      const shape2 = createShapeElement("3", 100, 100);
      const shape3 = createShapeElement("4", 200, 200);
      const doc = createSlideDocument([shape1, shape2, shape3]);

      const changes: ShapeChange[] = [
        { type: "removed", shapeId: "2" },
        {
          type: "modified",
          shapeId: "3",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform({ x: 100 }),
              newValue: createTransform({ x: 999 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);

      // Shape 2 should be removed
      expect(getShapeById(result, "2")).toBeNull();

      // Shape 3 should be modified
      const modifiedShape = getShapeById(result, "3");
      const xfrm = getXfrmFromShape(modifiedShape!);
      const off = getChild(xfrm!, "a:off");
      expect(off?.attrs.x).toBe(pxToEmuString(999));

      // Shape 4 should be unchanged
      const unchangedShape = getShapeById(result, "4");
      expect(unchangedShape).not.toBeNull();
    });
  });

  describe("empty changes", () => {
    it("returns document unchanged when no changes", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const result = patchSlideXml(doc, []);

      expect(result).toEqual(doc);
    });
  });
});

describe("patchSlideXml (blipFill)", () => {
  function createPicElementWithEmbed(id: string, rId: string): XmlElement {
    return createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id, name: `Picture ${id}` }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": rId }),
        createElement("a:stretch", {}, [createElement("a:fillRect")]),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
  }

  function createPicElementWithLink(id: string, rId: string): XmlElement {
    return createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id, name: `Picture ${id}` }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:link": rId }),
        createElement("a:stretch", {}, [createElement("a:fillRect")]),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
  }

  it("updates a:blip r:embed in p:pic/p:blipFill", () => {
    const doc = createSlideDocument([createPicElementWithEmbed("10", "rId1")]);
    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [{ property: "blipFill", oldValue: { resourceId: "rId1" }, newValue: { resourceId: "rId9" } }],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const pic = getShapeById(result, "10")!;
    const blip = getChild(getChild(pic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId9");
  });

  it("updates a:blip r:link when embed is not present", () => {
    const doc = createSlideDocument([createPicElementWithLink("11", "rId2")]);
    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "11",
        shapeType: "pic",
        changes: [{ property: "blipFill", oldValue: { resourceId: "rId2" }, newValue: { resourceId: "rId8" } }],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const pic = getShapeById(result, "11")!;
    const blip = getChild(getChild(pic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:link"]).toBe("rId8");
  });

  it("throws when new blipFill uses data: resourceId", () => {
    const doc = createSlideDocument([createPicElementWithEmbed("12", "rId1")]);
    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "12",
        shapeType: "pic",
        changes: [{ property: "blipFill", oldValue: { resourceId: "rId1" }, newValue: { resourceId: "data:image/png;base64,AA==" } }],
      },
    ];

    expect(() => patchSlideXml(doc, changes)).toThrow("applyBlipFillChange: data: resourceId requires Phase 7 media embedding");
  });
});


// =============================================================================
// Utility Function Tests
// =============================================================================

describe("getSpTree", () => {
  it("returns spTree from slide document", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    const spTree = getSpTree(doc);

    expect(spTree).not.toBeNull();
    expect(spTree?.name).toBe("p:spTree");
  });

  it("returns null for empty document", () => {
    const doc: XmlDocument = { children: [] };

    const spTree = getSpTree(doc);

    expect(spTree).toBeNull();
  });

  it("returns null when cSld is missing", () => {
    const root = createElement("p:sld");
    const doc: XmlDocument = { children: [root] };

    const spTree = getSpTree(doc);

    expect(spTree).toBeNull();
  });
});

describe("hasShapes", () => {
  it("returns true when slide has shapes", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    expect(hasShapes(doc)).toBe(true);
  });

  it("returns false when slide has no shapes", () => {
    const doc = createSlideDocument([]);

    expect(hasShapes(doc)).toBe(false);
  });

  it("returns false for empty document", () => {
    const doc: XmlDocument = { children: [] };

    expect(hasShapes(doc)).toBe(false);
  });
});
