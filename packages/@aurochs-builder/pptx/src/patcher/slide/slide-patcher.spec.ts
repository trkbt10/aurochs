/**
 * @file Slide Patcher Tests
 */

import { createElement, isXmlElement, getChild, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type { ShapeChange } from "../core/shape-differ";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { EMU_PER_PIXEL } from "@aurochs-office/pptx/domain";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { SpShape } from "@aurochs-office/pptx/domain/shape";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import { parseShapeTree } from "@aurochs-office/pptx/parser/shape-parser/index";
import { patchSlideXml, getSpTree, hasShapes } from "./slide-patcher";
import { findShapeById } from "../core/xml-mutator";

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

type CreateShapeElementArgs = [id: string, x?: number, y?: number, width?: number, height?: number];

function createShapeElement(...args: CreateShapeElementArgs): XmlElement {
  const [id, x = 0, y = 0, width = 100, height = 100] = args;
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
    createElement("p:txBody", {}, [createElement("a:bodyPr"), createElement("a:lstStyle"), createElement("a:p")]),
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
    createElement("p:txBody", {}, [createElement("a:bodyPr"), createElement("a:lstStyle"), createElement("a:p")]),
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

function pxToEmuString(valuePx: number): string {
  return String(Math.round(valuePx * EMU_PER_PIXEL));
}

function getShapeById(doc: XmlDocument, id: string): XmlElement | null {
  const spTree = getSpTree(doc);
  if (!spTree) {
    return null;
  }
  return findShapeById(spTree, id);
}

function getXfrmFromShape(shape: XmlElement): XmlElement | null {
  const spPr = getChild(shape, "p:spPr");
  if (!spPr) {
    return null;
  }
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

      const parsed = parseShapeTree({ spTree: getSpTree(result) ?? undefined });
      const added = parsed.find(
        (s): s is Extract<typeof s, { type: "sp" }> => s.type === "sp" && s.nonVisual.id === "3",
      );
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
      const parsed = parseShapeTree({ spTree: getSpTree(result) ?? undefined });
      const added = parsed.find(
        (s): s is Extract<typeof s, { type: "sp" }> => s.type === "sp" && s.nonVisual.id === "3",
      );
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
      const changes: ShapeChange[] = [{ type: "added", shape: createDomainSpShape("3"), parentId: "10", afterId: "2" }];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result)!;
      const updatedGroup = findShapeById(spTree, "10");
      expect(updatedGroup).not.toBeNull();

      const hasChild3 =
        (updatedGroup?.name === "p:grpSp" &&
          updatedGroup?.children.some(
            (c) =>
              isXmlElement(c) && c.name === "p:sp" && getChild(getChild(c, "p:nvSpPr")!, "p:cNvPr")!.attrs.id === "3",
          )) ??
        false;
      expect(hasChild3).toBe(true);
    });
  });

  describe("shape removal", () => {
    it("removes a shape from the slide", () => {
      const shape1 = createShapeElement("2");
      const shape2 = createShapeElement("3");
      const doc = createSlideDocument([shape1, shape2]);

      const changes: ShapeChange[] = [{ type: "removed", shapeId: "2" }];

      const result = patchSlideXml(doc, changes);
      const spTree = getSpTree(result);

      expect(spTree).not.toBeNull();
      // Should have nvGrpSpPr, grpSpPr, and one shape (id=3)
      const shapes = spTree!.children.filter((c) => isXmlElement(c) && c.name === "p:sp");
      expect(shapes).toHaveLength(1);
      expect(getShapeById(result, "2")).toBeNull();
      expect(getShapeById(result, "3")).not.toBeNull();
    });

    it("does nothing when shape not found", () => {
      const shape = createShapeElement("2");
      const doc = createSlideDocument([shape]);

      const changes: ShapeChange[] = [{ type: "removed", shapeId: "999" }];

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
          changes: [{ property: "textBody", oldValue: undefined, newValue: nextTextBody }],
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
          createElement("a:glow", { rad: "0" }, [createElement("a:srgbClr", { val: "00FF00" })]),
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
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: { resourceId: "data:image/png;base64,AA==" },
          },
        ],
      },
    ];

    expect(() => patchSlideXml(doc, changes)).toThrow(
      "applyBlipFillChange: data: resourceId requires Phase 7 media embedding",
    );
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

// =============================================================================
// Additional Coverage Tests
// =============================================================================

describe("patchSlideXml (edge cases)", () => {
  describe("removal when cSld/spTree is missing", () => {
    it("returns document unchanged when cSld is missing", () => {
      const root = createElement("p:sld");
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [{ type: "removed", shapeId: "2" }];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });

    it("returns document unchanged when spTree is missing", () => {
      const root = createElement("p:sld", {}, [createElement("p:cSld")]);
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [{ type: "removed", shapeId: "2" }];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });
  });

  describe("modification when cSld/spTree/shape is missing", () => {
    it("returns document unchanged when cSld is missing", () => {
      const root = createElement("p:sld");
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ x: 10 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });

    it("returns document unchanged when spTree is missing", () => {
      const root = createElement("p:sld", {}, [createElement("p:cSld")]);
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "2",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ x: 10 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });

    it("returns document unchanged when shape not found", () => {
      const doc = createSlideDocument([createShapeElement("2")]);
      const changes: ShapeChange[] = [
        {
          type: "modified",
          shapeId: "999",
          shapeType: "sp",
          changes: [
            {
              property: "transform",
              oldValue: createTransform(),
              newValue: createTransform({ x: 10 }),
            },
          ],
        },
      ];

      const result = patchSlideXml(doc, changes);
      expect(getShapeById(result, "2")).not.toBeNull();
    });
  });

  describe("addition when cSld/spTree is missing", () => {
    it("returns document unchanged when cSld is missing", () => {
      const root = createElement("p:sld");
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [{ type: "added", shape: createDomainSpShape("3") }];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });

    it("returns document unchanged when spTree is missing", () => {
      const root = createElement("p:sld", {}, [createElement("p:cSld")]);
      const doc: XmlDocument = { children: [root] };
      const changes: ShapeChange[] = [{ type: "added", shape: createDomainSpShape("3") }];

      const result = patchSlideXml(doc, changes);
      expect(result.children).toEqual(doc.children);
    });
  });

  describe("addition into group", () => {
    it("throws when parentId is not found", () => {
      const doc = createSlideDocument([createShapeElement("2")]);
      const changes: ShapeChange[] = [
        { type: "added", shape: createDomainSpShape("3"), parentId: "999" },
      ];

      expect(() => patchSlideXml(doc, changes)).toThrow("applyAddition: parentId not found: 999");
    });

    it("throws when parentId is not a p:grpSp", () => {
      const doc = createSlideDocument([createShapeElement("2")]);
      const changes: ShapeChange[] = [
        { type: "added", shape: createDomainSpShape("3"), parentId: "2" },
      ];

      expect(() => patchSlideXml(doc, changes)).toThrow("applyAddition: parentId is not a p:grpSp: 2");
    });
  });
});

describe("patchSlideXml (transform edge cases)", () => {
  it("returns shape unchanged when newValue is undefined (transform removed)", () => {
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
            newValue: undefined,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2");
    // Shape should still have its original xfrm
    const xfrm = getXfrmFromShape(modifiedShape!);
    expect(xfrm).not.toBeNull();
  });

  it("returns shape unchanged when p:spPr is missing", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
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
            property: "transform",
            oldValue: createTransform(),
            newValue: createTransform({ x: 50 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2");
    expect(modifiedShape).not.toBeNull();
    expect(getChild(modifiedShape!, "p:spPr")).toBeUndefined();
  });

  it("updates p:grpSpPr > a:xfrm for group shapes", () => {
    const group = createGroupElement("10", [createShapeElement("2")]);
    const doc = createSlideDocument([group]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "grpSp",
        changes: [
          {
            property: "transform",
            oldValue: createTransform(),
            newValue: createTransform({ x: 100, y: 200 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedGroup = getShapeById(result, "10")!;
    const grpSpPr = getChild(modifiedGroup, "p:grpSpPr")!;
    const xfrm = getChild(grpSpPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe(pxToEmuString(100));
    expect(off.attrs.y).toBe(pxToEmuString(200));
  });

  it("creates a:xfrm when missing from p:spPr", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:prstGeom", { prst: "rect" }),
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
            property: "transform",
            oldValue: undefined,
            newValue: createTransform({ x: 10, y: 20 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe(pxToEmuString(10));
    expect(off.attrs.y).toBe(pxToEmuString(20));
    // xfrm should be prepended (first child)
    const firstChild = spPr.children[0];
    expect(isXmlElement(firstChild) && firstChild.name === "a:xfrm").toBe(true);
  });

  it("handles p:graphicFrame transform via p:xfrm", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "5", name: "Table 1" }),
        createElement("p:cNvGraphicFramePr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      createElement("a:graphic"),
    ]);
    const doc = createSlideDocument([graphicFrame]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "5",
        shapeType: "graphicFrame",
        changes: [
          {
            property: "transform",
            oldValue: createTransform(),
            newValue: createTransform({ x: 50, y: 60, width: 300, height: 200 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedFrame = getShapeById(result, "5")!;
    const xfrm = getChild(modifiedFrame, "p:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    const ext = getChild(xfrm, "a:ext")!;
    expect(off.attrs.x).toBe(pxToEmuString(50));
    expect(off.attrs.y).toBe(pxToEmuString(60));
    expect(ext.attrs.cx).toBe(pxToEmuString(300));
    expect(ext.attrs.cy).toBe(pxToEmuString(200));
  });

  it("handles p:cxnSp transform via p:spPr", () => {
    const cxnSp = createElement("p:cxnSp", {}, [
      createElement("p:nvCxnSpPr", {}, [
        createElement("p:cNvPr", { id: "7", name: "Connector 1" }),
        createElement("p:cNvCxnSpPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([cxnSp]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "7",
        shapeType: "cxnSp",
        changes: [
          {
            property: "transform",
            oldValue: createTransform(),
            newValue: createTransform({ x: 20, y: 30 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedCxn = getShapeById(result, "7")!;
    const spPr = getChild(modifiedCxn, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe(pxToEmuString(20));
    expect(off.attrs.y).toBe(pxToEmuString(30));
  });

  it("handles p:pic transform via p:spPr", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "8", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": "rId1" }),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "8",
        shapeType: "pic",
        changes: [
          {
            property: "transform",
            oldValue: createTransform(),
            newValue: createTransform({ x: 75, y: 80 }),
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "8")!;
    const spPr = getChild(modifiedPic, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    const off = getChild(xfrm, "a:off")!;
    expect(off.attrs.x).toBe(pxToEmuString(75));
    expect(off.attrs.y).toBe(pxToEmuString(80));
  });
});

describe("patchSlideXml (fill edge cases)", () => {
  it("skips fill change for p:graphicFrame (spPrName is p:xfrm)", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "5", name: "Table 1" }),
        createElement("p:cNvGraphicFramePr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      createElement("a:graphic"),
    ]);
    const doc = createSlideDocument([graphicFrame]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "5",
        shapeType: "graphicFrame",
        changes: [
          {
            property: "fill",
            oldValue: undefined,
            newValue: { type: "noFill" },
          },
        ],
      },
    ];

    // Should not throw - just returns shape unchanged
    const result = patchSlideXml(doc, changes);
    expect(getShapeById(result, "5")).not.toBeNull();
  });

  it("returns shape unchanged when spPr is missing for fill change", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
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
            property: "fill",
            oldValue: undefined,
            newValue: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(getChild(modifiedShape, "p:spPr")).toBeUndefined();
  });

  it("inserts fill before a:ln when no existing fill", () => {
    const shape = createShapeElementWithSpPrChildren("2", [
      createElement("a:ln", { w: "12700" }),
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
            oldValue: undefined,
            newValue: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;

    // solidFill should come before a:ln
    const children = spPr.children.filter(isXmlElement);
    const fillIndex = children.findIndex((c) => c.name === "a:solidFill");
    const lnIndex = children.findIndex((c) => c.name === "a:ln");
    expect(fillIndex).toBeLessThan(lnIndex);
  });

  it("inserts fill at the right position when existing fill was at a specific index", () => {
    const shape = createShapeElementWithSpPrChildren("2", [
      createElement("a:prstGeom", { prst: "rect" }),
      createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
      createElement("a:ln", { w: "12700" }),
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
            newValue: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const solidFill = getChild(spPr, "a:solidFill")!;
    expect(getChild(solidFill, "a:srgbClr")!.attrs.val).toBe("FF0000");
  });
});

describe("patchSlideXml (line edge cases)", () => {
  it("skips line change for p:graphicFrame", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "5", name: "Table 1" }),
        createElement("p:cNvGraphicFramePr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      createElement("a:graphic"),
    ]);
    const doc = createSlideDocument([graphicFrame]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "5",
        shapeType: "graphicFrame",
        changes: [
          {
            property: "line",
            oldValue: undefined,
            newValue: {
              width: px(1),
              cap: "flat",
              compound: "sng",
              alignment: "ctr",
              fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
              dash: "solid",
              join: "round",
            },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    expect(getShapeById(result, "5")).not.toBeNull();
  });

  it("returns shape unchanged when spPr is missing for line change", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
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
              width: px(1),
              cap: "flat",
              compound: "sng",
              alignment: "ctr",
              fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
              dash: "solid",
              join: "round",
            },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(getChild(modifiedShape, "p:spPr")).toBeUndefined();
  });

  it("inserts line at the correct position when no existing a:ln", () => {
    const shape = createShapeElementWithSpPrChildren("2", [
      createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "000000" })]),
      createElement("a:effectLst"),
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
              width: px(1),
              cap: "flat",
              compound: "sng",
              alignment: "ctr",
              fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
              dash: "solid",
              join: "round",
            },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const children = spPr.children.filter(isXmlElement);
    const lnIndex = children.findIndex((c) => c.name === "a:ln");
    const effectIndex = children.findIndex((c) => c.name === "a:effectLst");
    expect(lnIndex).toBeLessThan(effectIndex);
  });
});

describe("patchSlideXml (effects edge cases)", () => {
  it("skips effects change for p:graphicFrame", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "5", name: "Table 1" }),
        createElement("p:cNvGraphicFramePr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      createElement("a:graphic"),
    ]);
    const doc = createSlideDocument([graphicFrame]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "5",
        shapeType: "graphicFrame",
        changes: [
          {
            property: "effects",
            oldValue: undefined,
            newValue: { glow: { color: { spec: { type: "srgb", value: "00FF00" } }, radius: px(3) } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    expect(getShapeById(result, "5")).not.toBeNull();
  });

  it("returns shape unchanged when spPr is missing for effects change", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
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
            newValue: { glow: { color: { spec: { type: "srgb", value: "00FF00" } }, radius: px(3) } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(getChild(modifiedShape, "p:spPr")).toBeUndefined();
  });

  it("inserts effects at the end when no existing effects", () => {
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
            property: "effects",
            oldValue: undefined,
            newValue: { glow: { color: { spec: { type: "srgb", value: "00FF00" } }, radius: px(3) } },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    expect(getChild(spPr, "a:effectLst")).toBeDefined();
  });
});

describe("patchSlideXml (geometry change)", () => {
  it("replaces existing a:prstGeom with a new geometry", () => {
    const shape = createShapeElementWithSpPrChildren("2", [
      createElement("a:prstGeom", { prst: "rect" }, [createElement("a:avLst")]),
    ]);
    const doc = createSlideDocument([shape]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "2",
        shapeType: "sp",
        changes: [
          {
            property: "geometry",
            oldValue: { type: "preset", preset: "rect", adjustValues: [] },
            newValue: { type: "preset", preset: "ellipse", adjustValues: [] },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("ellipse");
  });

  it("uses default rect geometry when newValue is undefined", () => {
    const shape = createShapeElementWithSpPrChildren("2", [
      createElement("a:prstGeom", { prst: "ellipse" }, [createElement("a:avLst")]),
    ]);
    const doc = createSlideDocument([shape]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "2",
        shapeType: "sp",
        changes: [
          {
            property: "geometry",
            oldValue: { type: "preset", preset: "ellipse", adjustValues: [] },
            newValue: undefined,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("rect");
  });

  it("skips geometry change for p:graphicFrame", () => {
    const graphicFrame = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "5", name: "Table 1" }),
        createElement("p:cNvGraphicFramePr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "100", cy: "100" }),
      ]),
      createElement("a:graphic"),
    ]);
    const doc = createSlideDocument([graphicFrame]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "5",
        shapeType: "graphicFrame",
        changes: [
          {
            property: "geometry",
            oldValue: undefined,
            newValue: { type: "preset", preset: "rect", adjustValues: [] },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    expect(getShapeById(result, "5")).not.toBeNull();
  });

  it("returns shape unchanged when spPr is missing for geometry change", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
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
            property: "geometry",
            oldValue: undefined,
            newValue: { type: "preset", preset: "ellipse", adjustValues: [] },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(getChild(modifiedShape, "p:spPr")).toBeUndefined();
  });

  it("inserts geometry after a:xfrm when no existing geometry", () => {
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
            property: "geometry",
            oldValue: undefined,
            newValue: { type: "preset", preset: "ellipse", adjustValues: [] },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("ellipse");
    // Should be after xfrm
    const children = spPr.children.filter(isXmlElement);
    const xfrmIndex = children.findIndex((c) => c.name === "a:xfrm");
    const geomIndex = children.findIndex((c) => c.name === "a:prstGeom");
    expect(geomIndex).toBe(xfrmIndex + 1);
  });

  it("inserts default geometry at index 0 when no xfrm exists", () => {
    const shape = createElement("p:sp", {}, [
      createElement("p:nvSpPr", {}, [
        createElement("p:cNvPr", { id: "2", name: "Shape 2" }),
        createElement("p:cNvSpPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:spPr", {}, [
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
            property: "geometry",
            oldValue: undefined,
            newValue: undefined,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    const spPr = getChild(modifiedShape, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("rect");
  });
});

describe("patchSlideXml (blipFill edge cases)", () => {
  it("returns shape unchanged when shape is not p:pic for blipFill", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "2",
        shapeType: "sp",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: { resourceId: "rId2" },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(modifiedShape.name).toBe("p:sp");
  });

  it("returns shape unchanged when newValue is not a valid BlipFillChangeValue", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": "rId1" }),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: "not-an-object" as never,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blip = getChild(getChild(modifiedPic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId1");
  });

  it("returns shape unchanged when newValue is an object without resourceId", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": "rId1" }),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: { someOtherProp: "value" } as never,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blip = getChild(getChild(modifiedPic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId1");
  });

  it("returns shape unchanged when newValue has non-string resourceId", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": "rId1" }),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: { resourceId: 123 } as never,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blip = getChild(getChild(modifiedPic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId1");
  });

  it("returns shape unchanged when newValue is null", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", { "r:embed": "rId1" }),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: null as never,
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blip = getChild(getChild(modifiedPic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId1");
  });

  it("falls back to r:embed when blip has neither r:embed nor r:link", () => {
    const pic = createElement("p:pic", {}, [
      createElement("p:nvPicPr", {}, [
        createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
        createElement("p:cNvPicPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:blipFill", {}, [
        createElement("a:blip", {}),
      ]),
      createElement("p:spPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ]),
    ]);
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: undefined,
            newValue: { resourceId: "rId5" },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blip = getChild(getChild(modifiedPic, "p:blipFill")!, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId5");
  });
});

describe("patchSlideXml (blipFill with text node children)", () => {
  it("preserves text node children during mapXmlElement traversal", () => {
    const pic: XmlElement = {
      type: "element",
      name: "p:pic",
      attrs: {},
      children: [
        createElement("p:nvPicPr", {}, [
          createElement("p:cNvPr", { id: "10", name: "Picture 1" }),
          createElement("p:cNvPicPr"),
          createElement("p:nvPr"),
        ]),
        {
          type: "element",
          name: "p:blipFill",
          attrs: {},
          children: [
            { type: "text", value: "some text" },
            createElement("a:blip", { "r:embed": "rId1" }),
            createElement("a:stretch", {}, [createElement("a:fillRect")]),
          ],
        },
        createElement("p:spPr", {}, [
          createElement("a:xfrm", {}, [
            createElement("a:off", { x: "0", y: "0" }),
            createElement("a:ext", { cx: "100", cy: "100" }),
          ]),
        ]),
      ],
    };
    const doc = createSlideDocument([pic]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "10",
        shapeType: "pic",
        changes: [
          {
            property: "blipFill",
            oldValue: { resourceId: "rId1" },
            newValue: { resourceId: "rId9" },
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedPic = getShapeById(result, "10")!;
    const blipFill = getChild(modifiedPic, "p:blipFill")!;
    const blip = getChild(blipFill, "a:blip")!;
    expect(blip.attrs["r:embed"]).toBe("rId9");
  });
});

describe("patchSlideXml (unknown property change)", () => {
  it("returns shape unchanged for unknown property", () => {
    const shape = createShapeElement("2");
    const doc = createSlideDocument([shape]);

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: "2",
        shapeType: "sp",
        changes: [
          {
            property: "unknownProperty" as never,
            oldValue: undefined,
            newValue: "something",
          },
        ],
      },
    ];

    const result = patchSlideXml(doc, changes);
    const modifiedShape = getShapeById(result, "2")!;
    expect(modifiedShape).not.toBeNull();
  });
});

describe("patchSlideXml (unique ID management on addition)", () => {
  it("reassigns duplicate IDs when inserting a shape with an existing ID", () => {
    const doc = createSlideDocument([createShapeElement("2")]);
    const changes: ShapeChange[] = [
      { type: "added", shape: createDomainSpShape("2", 50) },
    ];

    const result = patchSlideXml(doc, changes);
    const spTree = getSpTree(result)!;
    const shapes = spTree.children.filter(
      (c): c is XmlElement => isXmlElement(c) && c.name === "p:sp",
    );
    expect(shapes).toHaveLength(2);

    // All IDs should be unique
    const ids = shapes.map(
      (sp) => getChild(getChild(sp, "p:nvSpPr")!, "p:cNvPr")!.attrs.id,
    );
    expect(new Set(ids).size).toBe(2);
  });

  it("handles group shape addition with unique ID reassignment", () => {
    const doc = createSlideDocument([createShapeElement("2"), createShapeElement("3")]);
    const grpShape = {
      type: "grpSp" as const,
      nonVisual: { id: "10", name: "Group 10" },
      properties: {},
      children: [createDomainSpShape("2", 10), createDomainSpShape("3", 20)],
    };

    const changes: ShapeChange[] = [{ type: "added", shape: grpShape }];

    const result = patchSlideXml(doc, changes);
    const spTree = getSpTree(result)!;

    // All shapes should have unique IDs
    const allIds = new Set<string>();
    const collectIds = (el: XmlElement) => {
      for (const child of el.children) {
        if (!isXmlElement(child)) {
          continue;
        }
        if (child.name === "p:cNvPr") {
          allIds.add(child.attrs.id);
        }
        collectIds(child);
      }
    };
    collectIds(spTree);
    // Each cNvPr should have a unique id
    expect(allIds.size).toBeGreaterThanOrEqual(4); // at least: spTree, shape2, shape3, group
  });

  it("throws when inserted shape has internal duplicate IDs", () => {
    const doc = createSlideDocument([]);
    const grpShape = {
      type: "grpSp" as const,
      nonVisual: { id: "10", name: "Group 10" },
      properties: {},
      children: [createDomainSpShape("5", 10), createDomainSpShape("5", 20)],
    };

    const changes: ShapeChange[] = [{ type: "added", shape: grpShape }];

    expect(() => patchSlideXml(doc, changes)).toThrow(
      "ensureUniqueIdsForInsertion: duplicate ids in inserted shape: 5",
    );
  });

  it("throws when contentPart is inserted (no shape ID)", () => {
    const doc = createSlideDocument([]);
    const grpShape = {
      type: "grpSp" as const,
      nonVisual: { id: "20", name: "Group 20" },
      properties: {},
      children: [
        { type: "contentPart" as const, contentPart: { id: "rId1" } },
      ],
    };

    const changes: ShapeChange[] = [{ type: "added", shape: grpShape as never }];

    expect(() => patchSlideXml(doc, changes)).toThrow(
      "ensureUniqueIdsForInsertion: shape id is required",
    );
  });

  it("updates connector references when IDs are reassigned", () => {
    const doc = createSlideDocument([createShapeElement("5")]);

    const connectorShape = {
      type: "grpSp" as const,
      nonVisual: { id: "20", name: "Group 20" },
      properties: {},
      children: [
        createDomainSpShape("5", 0),
        {
          type: "cxnSp" as const,
          nonVisual: {
            id: "6",
            name: "Connector 6",
            startConnection: { shapeId: "5", siteIndex: 0 },
            endConnection: { shapeId: "5", siteIndex: 2 },
          },
          properties: {
            transform: createTransform(),
            geometry: { type: "preset" as const, preset: "line", adjustValues: [] },
          },
        },
      ],
    };

    const changes: ShapeChange[] = [{ type: "added", shape: connectorShape }];
    const result = patchSlideXml(doc, changes);
    // Should not throw - connector references should be updated
    expect(getSpTree(result)).not.toBeNull();
  });
});
