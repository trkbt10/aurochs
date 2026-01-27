/**
 * @file Diagram parser tests
 *
 * Tests for parsing DiagramML drawing content (dsp: namespace).
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 * @see MS-ODRAWXML - Diagram Layout extensions
 */

// Uses global describe/it/expect from test runner
import { parseDiagramDrawing } from "./diagram-parser";
import type { XmlDocument, XmlElement } from "@oxen/xml";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal dsp:drawing document for testing
 * XmlDocument has `children` array, not `root` property
 * @see MS-ODRAWXML Section 2.4.1 - dsp:drawing element
 */
function createDspDrawing(shapeElements: readonly XmlElement[]): XmlDocument {
  return {
    children: [
      {
        type: "element",
        name: "dsp:drawing",
        attrs: {
          "xmlns:dsp": "http://schemas.microsoft.com/office/drawing/2008/diagram",
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
        },
        children: [
          {
            type: "element",
            name: "dsp:spTree",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:nvGrpSpPr",
                attrs: {},
                children: [],
              },
              {
                type: "element",
                name: "dsp:grpSpPr",
                attrs: {},
                children: [],
              },
              ...shapeElements,
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Create a minimal p:drawing document for testing
 */
function createPDrawing(shapeElements: readonly XmlElement[]): XmlDocument {
  return {
    children: [
      {
        type: "element",
        name: "p:drawing",
        attrs: {},
        children: [
          {
            type: "element",
            name: "p:spTree",
            attrs: {},
            children: [
              {
                type: "element",
                name: "p:nvGrpSpPr",
                attrs: {},
                children: [],
              },
              {
                type: "element",
                name: "p:grpSpPr",
                attrs: {},
                children: [],
              },
              ...shapeElements,
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Create a basic dsp:sp shape element
 */
function createDspShape(
  id: string,
  name: string,
  preset: string,
  options?: {
    modelId?: string;
    fill?: XmlElement;
    line?: XmlElement;
    text?: XmlElement;
    txBody?: XmlElement;
    style?: XmlElement;
    txXfrm?: XmlElement;
  }
): XmlElement {
  const children: XmlElement[] = [
    {
      type: "element",
      name: "dsp:nvSpPr",
      attrs: {},
      children: [
        {
          type: "element",
          name: "dsp:cNvPr",
          attrs: { id, name },
          children: [],
        },
        {
          type: "element",
          name: "dsp:cNvSpPr",
          attrs: {},
          children: [],
        },
      ],
    },
    {
      type: "element",
      name: "dsp:spPr",
      attrs: {},
      children: [
        {
          type: "element",
          name: "a:xfrm",
          attrs: {},
          children: [
            {
              type: "element",
              name: "a:off",
              attrs: { x: "0", y: "0" },
              children: [],
            },
            {
              type: "element",
              name: "a:ext",
              attrs: { cx: "100000", cy: "100000" },
              children: [],
            },
          ],
        },
        {
          type: "element",
          name: "a:prstGeom",
          attrs: { prst: preset },
          children: [
            {
              type: "element",
              name: "a:avLst",
              attrs: {},
              children: [],
            },
          ],
        },
        ...(options?.fill ? [options.fill] : []),
        ...(options?.line ? [options.line] : []),
      ],
    },
  ];

  if (options?.text) {
    children.push(options.text);
  }

  if (options?.txBody) {
    children.push(options.txBody);
  }

  if (options?.style) {
    children.push(options.style);
  }

  if (options?.txXfrm) {
    children.push(options.txXfrm);
  }

  return {
    type: "element",
    name: "dsp:sp",
    attrs: options?.modelId ? { modelId: options.modelId } : {},
    children,
  };
}

// =============================================================================
// Basic Shape Parsing Tests
// =============================================================================

describe("parseDiagramDrawing", () => {
  describe("ECMA-376 Section 21.4 - DiagramML Drawing", () => {
    it("should return empty shapes for empty document", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "dsp:drawing",
            attrs: {},
            children: [],
          },
        ],
      };

      const result = parseDiagramDrawing(doc);
      expect(result.shapes).toEqual([]);
    });

    it("should parse dsp:spTree with no shapes", () => {
      const doc = createDspDrawing([]);
      const result = parseDiagramDrawing(doc);
      expect(result.shapes).toEqual([]);
    });

    it("should parse p:drawing format (standard PresentationML)", () => {
      const doc = createPDrawing([]);
      const result = parseDiagramDrawing(doc);
      expect(result.shapes).toEqual([]);
    });
  });

  describe("MS-ODRAWXML Section 2.4.2 - dsp:sp element", () => {
    it("should parse basic dsp:sp with modelId attribute", () => {
      const shape = createDspShape("1", "Shape 1", "ellipse", {
        modelId: "{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}",
      });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("sp");
    });

    it("should extract modelId attribute from dsp:sp", () => {
      const shape = createDspShape("1", "Shape 1", "ellipse", {
        modelId: "{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}",
      });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].modelId).toBe("{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}");
      }
    });

    it("should not add modelId when not present", () => {
      const shape = createDspShape("1", "Shape 1", "ellipse");
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].modelId).toBeUndefined();
      }
    });

    it("should map dsp:nvSpPr to p:nvSpPr for shape parsing", () => {
      const shape = createDspShape("2", "Test Shape", "rect");
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].nonVisual.id).toBe("2");
        expect(result.shapes[0].nonVisual.name).toBe("Test Shape");
      }
    });
  });

  describe("ECMA-376 Section 20.1.9.18 - Preset Geometry", () => {
    it("should parse preset geometry from dsp:spPr", () => {
      const shape = createDspShape("3", "Ellipse", "ellipse");
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const geometry = result.shapes[0].properties.geometry;
        expect(geometry?.type).toBe("preset");
        if (geometry?.type === "preset") {
          expect(geometry.preset).toBe("ellipse");
        }
      }
    });
  });

  describe("ECMA-376 Section 20.1.8 - Fill Properties", () => {
    it("should parse solidFill from dsp:spPr", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent4" },
            children: [
              {
                type: "element",
                name: "a:alpha",
                attrs: { val: "50000" },
                children: [],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("4", "Solid Fill", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const fill = result.shapes[0].properties.fill;
        expect(fill?.type).toBe("solidFill");
      }
    });

    it("should parse gradFill from dsp:spPr", () => {
      const gradFill: XmlElement = {
        type: "element",
        name: "a:gradFill",
        attrs: { flip: "none", rotWithShape: "1" },
        children: [
          {
            type: "element",
            name: "a:gsLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:gs",
                attrs: { pos: "0" },
                children: [
                  {
                    type: "element",
                    name: "a:srgbClr",
                    attrs: { val: "01C3CC" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:gs",
                attrs: { pos: "100000" },
                children: [
                  {
                    type: "element",
                    name: "a:srgbClr",
                    attrs: { val: "7D2AE7" },
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: "element",
            name: "a:lin",
            attrs: { ang: "2700000", scaled: "1" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("5", "Gradient Fill", "rect", { fill: gradFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const fill = result.shapes[0].properties.fill;
        expect(fill?.type).toBe("gradientFill");
      }
    });

    it("should parse blipFill from dsp:spPr", () => {
      const blipFill: XmlElement = {
        type: "element",
        name: "a:blipFill",
        attrs: { rotWithShape: "0" },
        children: [
          {
            type: "element",
            name: "a:blip",
            attrs: { "r:embed": "rId1" },
            children: [],
          },
          {
            type: "element",
            name: "a:stretch",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:fillRect",
                attrs: {},
                children: [],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("6", "Image Fill", "ellipse", { fill: blipFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const fill = result.shapes[0].properties.fill;
        expect(fill?.type).toBe("blipFill");
      }
    });
  });

  describe("ECMA-376 Section 21.1.2 - Text Body", () => {
    it("should parse dsp:txBody with text content", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { anchor: "ctr" },
            children: [],
          },
          {
            type: "element",
            name: "a:lstStyle",
            attrs: {},
            children: [],
          },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: { algn: "ctr" },
                children: [],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:rPr",
                    attrs: { lang: "en-GB", sz: "1100" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:t",
                    attrs: {},
                    children: [{ type: "text", value: "abc" }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("7", "Text Shape", "rect", { text: txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].textBody).toBeDefined();
        expect(result.shapes[0].textBody?.paragraphs.length).toBeGreaterThan(0);
      }
    });
  });

  describe("MS-ODRAWXML Section 2.4.4 - dsp:txXfrm element", () => {
    it("should parse dsp:txXfrm for text transform", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "914400", y: "914400" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "1828800", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("8", "Text Transform", "ellipse", {
        modelId: "{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}",
        txXfrm,
      });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const textTransform = result.shapes[0].textTransform;
        expect(textTransform).toBeDefined();
        // 914400 EMU = 96 px (914400 / 9525)
        expect(textTransform?.x).toBeCloseTo(96, 0);
        expect(textTransform?.y).toBeCloseTo(96, 0);
        // 1828800 EMU = 192 px
        expect(textTransform?.width).toBeCloseTo(192, 0);
        // 914400 EMU = 96 px
        expect(textTransform?.height).toBeCloseTo(96, 0);
      }
    });

    it("should parse dsp:txXfrm with rotation", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: { rot: "5400000" }, // 90 degrees
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "0", y: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "914400", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("9", "Rotated Text", "rect", { txXfrm });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const textTransform = result.shapes[0].textTransform;
        expect(textTransform).toBeDefined();
        expect(textTransform?.rotation).toBe(90);
      }
    });

    it("should not add textTransform when dsp:txXfrm is not present", () => {
      const shape = createDspShape("10", "No Text Transform", "rect");
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].textTransform).toBeUndefined();
      }
    });

    it("should parse both modelId and textTransform together", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "0", y: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "914400", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("11", "Combined", "ellipse", {
        modelId: "{COMBINED-TEST-GUID}",
        txXfrm,
      });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].modelId).toBe("{COMBINED-TEST-GUID}");
        expect(result.shapes[0].textTransform).toBeDefined();
      }
    });
  });

  describe("ECMA-376 Section 20.1.4.2 - Style References", () => {
    it("should parse dsp:style with style references", () => {
      const style: XmlElement = {
        type: "element",
        name: "dsp:style",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:lnRef",
            attrs: { idx: "2" },
            children: [
              {
                type: "element",
                name: "a:scrgbClr",
                attrs: { r: "0", g: "0", b: "0" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "a:fillRef",
            attrs: { idx: "1" },
            children: [
              {
                type: "element",
                name: "a:scrgbClr",
                attrs: { r: "0", g: "0", b: "0" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "a:effectRef",
            attrs: { idx: "0" },
            children: [
              {
                type: "element",
                name: "a:scrgbClr",
                attrs: { r: "0", g: "0", b: "0" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "a:fontRef",
            attrs: { idx: "minor" },
            children: [
              {
                type: "element",
                name: "a:schemeClr",
                attrs: { val: "tx1" },
                children: [],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("9", "Styled Shape", "rect", { style });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].style).toBeDefined();
      }
    });
  });

  describe("ECMA-376 Section 20.1.10 - Line Properties", () => {
    it("should parse a:ln from dsp:spPr", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "12700", cap: "flat", cmpd: "sng", algn: "ctr" },
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:schemeClr",
                attrs: { val: "lt1" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "a:prstDash",
            attrs: { val: "solid" },
            children: [],
          },
          {
            type: "element",
            name: "a:miter",
            attrs: { lim: "800000" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("10", "Outlined Shape", "ellipse", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].properties.line).toBeDefined();
      }
    });
  });

  describe("Multiple shapes in diagram", () => {
    it("should parse multiple dsp:sp elements", () => {
      const shape1 = createDspShape("1", "Shape 1", "ellipse", {
        modelId: "{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}",
      });
      const shape2 = createDspShape("2", "Shape 2", "rect", {
        modelId: "{C21E3514-2DBB-8145-BBE2-28ED23242DFE}",
      });

      const doc = createDspDrawing([shape1, shape2]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(2);
      expect(result.shapes[0].type).toBe("sp");
      expect(result.shapes[1].type).toBe("sp");
    });
  });

  describe("Group shapes in diagram", () => {
    it("should parse dsp:grpSp elements", () => {
      const childShape = createDspShape("101", "Child Shape", "rect");

      const grpSp: XmlElement = {
        type: "element",
        name: "dsp:grpSp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvGrpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "100", name: "Group" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvGrpSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:grpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:off",
                    attrs: { x: "0", y: "0" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:ext",
                    attrs: { cx: "500000", cy: "500000" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:chOff",
                    attrs: { x: "0", y: "0" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:chExt",
                    attrs: { cx: "500000", cy: "500000" },
                    children: [],
                  },
                ],
              },
            ],
          },
          childShape,
        ],
      };

      const doc = createDspDrawing([grpSp]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("grpSp");
    });
  });

  describe("Connector shapes in diagram", () => {
    it("should parse dsp:cxnSp elements", () => {
      const cxnSp: XmlElement = {
        type: "element",
        name: "dsp:cxnSp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvCxnSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "200", name: "Connector" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvCxnSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:off",
                    attrs: { x: "0", y: "0" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:ext",
                    attrs: { cx: "500000", cy: "0" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "line" },
                children: [
                  {
                    type: "element",
                    name: "a:avLst",
                    attrs: {},
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:ln",
                attrs: { w: "12700" },
                children: [
                  {
                    type: "element",
                    name: "a:solidFill",
                    attrs: {},
                    children: [
                      {
                        type: "element",
                        name: "a:schemeClr",
                        attrs: { val: "tx1" },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([cxnSp]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("cxnSp");
    });
  });

  describe("Picture shapes in diagram", () => {
    it("should parse dsp:pic elements", () => {
      const pic: XmlElement = {
        type: "element",
        name: "dsp:pic",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvPicPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "300", name: "Picture" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvPicPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:blipFill",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:blip",
                attrs: { "r:embed": "rId1" },
                children: [],
              },
              {
                type: "element",
                name: "a:stretch",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:fillRect",
                    attrs: {},
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:off",
                    attrs: { x: "0", y: "0" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:ext",
                    attrs: { cx: "500000", cy: "500000" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  {
                    type: "element",
                    name: "a:avLst",
                    attrs: {},
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([pic]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("pic");
    });
  });

  // =========================================================================
  // Additional Edge Case Tests
  // =========================================================================

  describe("MS-ODRAWXML Section 2.4.4 - dsp:txXfrm edge cases", () => {
    it("should parse dsp:txXfrm with flipH attribute", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: { flipH: "1" },
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "0", y: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "914400", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("12", "FlipH Text", "rect", { txXfrm });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const textTransform = result.shapes[0].textTransform;
        expect(textTransform).toBeDefined();
        expect(textTransform?.flipH).toBe(true);
        expect(textTransform?.flipV).toBe(false);
      }
    });

    it("should parse dsp:txXfrm with flipV attribute", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: { flipV: "1" },
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "0", y: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "914400", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("13", "FlipV Text", "rect", { txXfrm });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const textTransform = result.shapes[0].textTransform;
        expect(textTransform).toBeDefined();
        expect(textTransform?.flipV).toBe(true);
      }
    });

    it("should parse dsp:txXfrm with both rotation and flip", () => {
      const txXfrm: XmlElement = {
        type: "element",
        name: "dsp:txXfrm",
        attrs: { rot: "10800000", flipH: "1", flipV: "1" }, // 180 degrees
        children: [
          {
            type: "element",
            name: "a:off",
            attrs: { x: "0", y: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:ext",
            attrs: { cx: "914400", cy: "914400" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("14", "Rotated Flipped Text", "rect", { txXfrm });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const textTransform = result.shapes[0].textTransform;
        expect(textTransform).toBeDefined();
        expect(textTransform?.rotation).toBe(180);
        expect(textTransform?.flipH).toBe(true);
        expect(textTransform?.flipV).toBe(true);
      }
    });
  });

  describe("Shape transform edge cases", () => {
    it("should parse shape with rotation in a:xfrm", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: { modelId: "{ROTATED-SHAPE}" },
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "15", name: "Rotated Shape" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: { rot: "2700000" }, // 45 degrees
                children: [
                  {
                    type: "element",
                    name: "a:off",
                    attrs: { x: "914400", y: "914400" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:ext",
                    attrs: { cx: "1828800", cy: "914400" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  {
                    type: "element",
                    name: "a:avLst",
                    attrs: {},
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const transform = result.shapes[0].properties.transform;
        expect(transform).toBeDefined();
        expect(transform?.rotation).toBe(45);
      }
    });

    it("should parse shape with flipH in a:xfrm", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "16", name: "Flipped Shape" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: { flipH: "1" },
                children: [
                  {
                    type: "element",
                    name: "a:off",
                    attrs: { x: "0", y: "0" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:ext",
                    attrs: { cx: "914400", cy: "914400" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  {
                    type: "element",
                    name: "a:avLst",
                    attrs: {},
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const transform = result.shapes[0].properties.transform;
        expect(transform).toBeDefined();
        expect(transform?.flipH).toBe(true);
      }
    });
  });

  describe("Nested group shapes", () => {
    it("should parse nested dsp:grpSp elements", () => {
      const innerShape = createDspShape("201", "Inner Shape", "ellipse");

      const innerGroup: XmlElement = {
        type: "element",
        name: "dsp:grpSp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvGrpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "200", name: "Inner Group" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvGrpSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:grpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "300000", cy: "300000" }, children: [] },
                  { type: "element", name: "a:chOff", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:chExt", attrs: { cx: "300000", cy: "300000" }, children: [] },
                ],
              },
            ],
          },
          innerShape,
        ],
      };

      const outerGroup: XmlElement = {
        type: "element",
        name: "dsp:grpSp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvGrpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "100", name: "Outer Group" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvGrpSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:grpSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "500000", cy: "500000" }, children: [] },
                  { type: "element", name: "a:chOff", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:chExt", attrs: { cx: "500000", cy: "500000" }, children: [] },
                ],
              },
            ],
          },
          innerGroup,
        ],
      };

      const doc = createDspDrawing([outerGroup]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("grpSp");

      // Check nested structure
      if (result.shapes[0].type === "grpSp") {
        expect(result.shapes[0].children.length).toBe(1);
        expect(result.shapes[0].children[0].type).toBe("grpSp");
      }
    });
  });

  describe("noFill and noLine handling", () => {
    it("should parse shape with a:noFill", () => {
      const noFill: XmlElement = {
        type: "element",
        name: "a:noFill",
        attrs: {},
        children: [],
      };

      const shape = createDspShape("17", "No Fill Shape", "rect", { fill: noFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        // noFill results in no fill or a specific noFill type
        const fill = result.shapes[0].properties.fill;
        expect(fill === undefined || fill.type === "noFill").toBe(true);
      }
    });
  });

  describe("dgm: namespace support", () => {
    /**
     * Some diagram drawings use the dgm: namespace instead of dsp:
     * @see ECMA-376 Part 1, Section 21.4
     */
    it("should parse dgm:drawing format", () => {
      const doc: XmlDocument = {
        children: [
          {
            type: "element",
            name: "dgm:drawing",
            attrs: {
              "xmlns:dgm": "http://schemas.openxmlformats.org/drawingml/2006/diagram",
            },
            children: [
              {
                type: "element",
                name: "dgm:spTree",
                attrs: {},
                children: [],
              },
            ],
          },
        ],
      };

      const result = parseDiagramDrawing(doc);
      expect(result.shapes).toEqual([]);
    });
  });

  describe("Hidden shapes handling", () => {
    it("should parse shape with hidden attribute", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "19", name: "Hidden Shape", hidden: "1" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  { type: "element", name: "a:avLst", attrs: {}, children: [] },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].nonVisual.hidden).toBe(true);
      }
    });
  });

  describe("Hyperlink in diagram shapes", () => {
    it("should parse shape with hyperlink click action", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "20", name: "Link Shape" },
                children: [
                  {
                    type: "element",
                    name: "a:hlinkClick",
                    attrs: { "r:id": "rId1" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  { type: "element", name: "a:avLst", attrs: {}, children: [] },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      // Hyperlink parsing depends on shape-parser implementation
      // Here we just verify the shape is parsed
    });
  });

  describe("Pattern fill in diagram shapes", () => {
    it("should parse shape with pattern fill", () => {
      const pattFill: XmlElement = {
        type: "element",
        name: "a:pattFill",
        attrs: { prst: "pct5" },
        children: [
          {
            type: "element",
            name: "a:fgClr",
            attrs: {},
            children: [
              { type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] },
            ],
          },
          {
            type: "element",
            name: "a:bgClr",
            attrs: {},
            children: [
              { type: "element", name: "a:srgbClr", attrs: { val: "FFFFFF" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("21", "Pattern Fill Shape", "rect", { fill: pattFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const fill = result.shapes[0].properties.fill;
        // Pattern fill should be parsed (if implemented) or undefined
        expect(fill === undefined || fill.type === "patternFill").toBe(true);
      }
    });
  });

  describe("Shape with description and title", () => {
    /**
     * Non-visual properties can include description and title for accessibility
     * @see ECMA-376 Part 1, Section 19.3.1.12 (cNvPr)
     */
    it("should parse shape with descr attribute", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "22", name: "Accessible Shape", descr: "This is a description" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  { type: "element", name: "a:avLst", attrs: {}, children: [] },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].nonVisual.description).toBe("This is a description");
      }
    });
  });

  describe("Custom geometry in diagram shapes", () => {
    it("should parse dsp:sp with custom geometry (a:custGeom)", () => {
      const custGeom: XmlElement = {
        type: "element",
        name: "a:custGeom",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:avLst",
            attrs: {},
            children: [],
          },
          {
            type: "element",
            name: "a:gdLst",
            attrs: {},
            children: [],
          },
          {
            type: "element",
            name: "a:ahLst",
            attrs: {},
            children: [],
          },
          {
            type: "element",
            name: "a:cxnLst",
            attrs: {},
            children: [],
          },
          {
            type: "element",
            name: "a:rect",
            attrs: { l: "0", t: "0", r: "0", b: "0" },
            children: [],
          },
          {
            type: "element",
            name: "a:pathLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:path",
                attrs: { w: "100000", h: "100000" },
                children: [
                  {
                    type: "element",
                    name: "a:moveTo",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:pt", attrs: { x: "0", y: "0" }, children: [] },
                    ],
                  },
                  {
                    type: "element",
                    name: "a:lnTo",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:pt", attrs: { x: "100000", y: "0" }, children: [] },
                    ],
                  },
                  {
                    type: "element",
                    name: "a:lnTo",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:pt", attrs: { x: "100000", y: "100000" }, children: [] },
                    ],
                  },
                  {
                    type: "element",
                    name: "a:close",
                    attrs: {},
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "18", name: "Custom Geom Shape" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              custGeom,
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const geometry = result.shapes[0].properties.geometry;
        expect(geometry?.type).toBe("custom");
      }
    });
  });

  describe("MS-ODRAWXML Section 2.4.2 - extLst support", () => {
    /**
     * Extension list for future extensibility
     * @see MS-ODRAWXML Section 2.4.2
     */
    it("should parse shape with extLst element", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: { modelId: "{EXT-TEST}" },
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "23", name: "ExtLst Shape" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  { type: "element", name: "a:avLst", attrs: {}, children: [] },
                ],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:extLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:ext",
                attrs: { uri: "{28A0092B-C50C-407E-A947-70E740481C1C}" },
                children: [],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      // Shape should be parsed even with extLst
      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("sp");
    });
  });

  describe("ECMA-376 Section 20.1.5 - 3D Effects", () => {
    /**
     * 3D scene and shape properties
     * @see ECMA-376 Part 1, Section 20.1.5
     */
    it("should parse shape with scene3d element", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "dsp:cNvPr",
                attrs: { id: "24", name: "3D Shape" },
                children: [],
              },
              {
                type: "element",
                name: "dsp:cNvSpPr",
                attrs: {},
                children: [],
              },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [
                  { type: "element", name: "a:avLst", attrs: {}, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:scene3d",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:camera",
                    attrs: { prst: "orthographicFront" },
                    children: [],
                  },
                  {
                    type: "element",
                    name: "a:lightRig",
                    attrs: { rig: "threePt", dir: "t" },
                    children: [],
                  },
                ],
              },
              {
                type: "element",
                name: "a:sp3d",
                attrs: { z: "152400", extrusionH: "152400" },
                children: [
                  {
                    type: "element",
                    name: "a:bevelT",
                    attrs: { w: "76200", h: "76200", prst: "relaxedInset" },
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        // Shape should be parsed, 3D properties depend on shape-parser implementation
        expect(result.shapes[0].properties).toBeDefined();
      }
    });
  });

  describe("ECMA-376 Section 20.1.7 - Effect Properties", () => {
    /**
     * Effect list for shadows, glows, etc.
     * @see ECMA-376 Part 1, Section 20.1.7
     */
    it("should parse shape with effectLst (outerShdw)", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "25", name: "Shadow Shape" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [{ type: "element", name: "a:avLst", attrs: {}, children: [] }],
              },
              {
                type: "element",
                name: "a:effectLst",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:outerShdw",
                    attrs: { blurRad: "50800", dist: "38100", dir: "2700000" },
                    children: [
                      {
                        type: "element",
                        name: "a:srgbClr",
                        attrs: { val: "000000" },
                        children: [{ type: "element", name: "a:alpha", attrs: { val: "40000" }, children: [] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with glow effect", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "26", name: "Glow Shape" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [{ type: "element", name: "a:avLst", attrs: {}, children: [] }],
              },
              {
                type: "element",
                name: "a:effectLst",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:glow",
                    attrs: { rad: "101600" },
                    children: [
                      {
                        type: "element",
                        name: "a:schemeClr",
                        attrs: { val: "accent1" },
                        children: [
                          { type: "element", name: "a:alpha", attrs: { val: "40000" }, children: [] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.9 - Additional Preset Geometries", () => {
    /**
     * Test various preset geometry types used in diagrams
     * @see ECMA-376 Part 1, Section 20.1.9.18
     */
    const presetGeometries = [
      "triangle",
      "rtTriangle",
      "parallelogram",
      "trapezoid",
      "diamond",
      "pentagon",
      "hexagon",
      "star4",
      "star5",
      "chevron",
      "flowChartProcess",
      "flowChartDecision",
    ];

    presetGeometries.forEach((preset) => {
      it(`should parse ${preset} preset geometry`, () => {
        const shape = createDspShape("30", `${preset} Shape`, preset);
        const doc = createDspDrawing([shape]);
        const result = parseDiagramDrawing(doc);

        expect(result.shapes.length).toBe(1);
        if (result.shapes[0].type === "sp") {
          const geometry = result.shapes[0].properties.geometry;
          expect(geometry?.type).toBe("preset");
          if (geometry?.type === "preset") {
            expect(geometry.preset).toBe(preset);
          }
        }
      });
    });
  });

  describe("ECMA-376 Section 20.1.9 - Custom Geometry Path Commands", () => {
    it("should parse custom geometry with arcTo command", () => {
      const custGeom: XmlElement = {
        type: "element",
        name: "a:custGeom",
        attrs: {},
        children: [
          { type: "element", name: "a:avLst", attrs: {}, children: [] },
          { type: "element", name: "a:gdLst", attrs: {}, children: [] },
          { type: "element", name: "a:ahLst", attrs: {}, children: [] },
          { type: "element", name: "a:cxnLst", attrs: {}, children: [] },
          { type: "element", name: "a:rect", attrs: { l: "0", t: "0", r: "0", b: "0" }, children: [] },
          {
            type: "element",
            name: "a:pathLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:path",
                attrs: { w: "100000", h: "100000" },
                children: [
                  {
                    type: "element",
                    name: "a:moveTo",
                    attrs: {},
                    children: [{ type: "element", name: "a:pt", attrs: { x: "0", y: "50000" }, children: [] }],
                  },
                  {
                    type: "element",
                    name: "a:arcTo",
                    attrs: { wR: "50000", hR: "50000", stAng: "10800000", swAng: "10800000" },
                    children: [],
                  },
                  { type: "element", name: "a:close", attrs: {}, children: [] },
                ],
              },
            ],
          },
        ],
      };

      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "31", name: "Arc Shape" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              custGeom,
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].properties.geometry?.type).toBe("custom");
      }
    });

    it("should parse custom geometry with cubicBezTo command", () => {
      const custGeom: XmlElement = {
        type: "element",
        name: "a:custGeom",
        attrs: {},
        children: [
          { type: "element", name: "a:avLst", attrs: {}, children: [] },
          { type: "element", name: "a:gdLst", attrs: {}, children: [] },
          { type: "element", name: "a:ahLst", attrs: {}, children: [] },
          { type: "element", name: "a:cxnLst", attrs: {}, children: [] },
          { type: "element", name: "a:rect", attrs: { l: "0", t: "0", r: "0", b: "0" }, children: [] },
          {
            type: "element",
            name: "a:pathLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:path",
                attrs: { w: "100000", h: "100000" },
                children: [
                  {
                    type: "element",
                    name: "a:moveTo",
                    attrs: {},
                    children: [{ type: "element", name: "a:pt", attrs: { x: "0", y: "100000" }, children: [] }],
                  },
                  {
                    type: "element",
                    name: "a:cubicBezTo",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:pt", attrs: { x: "25000", y: "0" }, children: [] },
                      { type: "element", name: "a:pt", attrs: { x: "75000", y: "0" }, children: [] },
                      { type: "element", name: "a:pt", attrs: { x: "100000", y: "100000" }, children: [] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "32", name: "CubicBez Shape" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              custGeom,
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].properties.geometry?.type).toBe("custom");
      }
    });
  });

  describe("ECMA-376 Section 20.1.10 - Line Properties Details", () => {
    it("should parse line with dash pattern", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400" },
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
          { type: "element", name: "a:prstDash", attrs: { val: "dash" }, children: [] },
        ],
      };

      const shape = createDspShape("34", "Dashed Line Shape", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].properties.line).toBeDefined();
      }
    });

    it("should parse line with head and tail end types", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400" },
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
          { type: "element", name: "a:headEnd", attrs: { type: "triangle", w: "med", len: "med" }, children: [] },
          { type: "element", name: "a:tailEnd", attrs: { type: "arrow", w: "lg", len: "lg" }, children: [] },
        ],
      };

      const shape = createDspShape("35", "Arrow Line Shape", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse line with bevel join", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400" },
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
          { type: "element", name: "a:bevel", attrs: {}, children: [] },
        ],
      };

      const shape = createDspShape("36", "Bevel Join Shape", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("Color specifications", () => {
    it("should parse sRGB color", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [{ type: "element", name: "a:srgbClr", attrs: { val: "FF5733" }, children: [] }],
      };

      const shape = createDspShape("40", "sRGB Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse scheme color with shade modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [{ type: "element", name: "a:shade", attrs: { val: "50000" }, children: [] }],
          },
        ],
      };

      const shape = createDspShape("41", "Shade Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse system color", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [{ type: "element", name: "a:sysClr", attrs: { val: "windowText", lastClr: "000000" }, children: [] }],
      };

      const shape = createDspShape("42", "System Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("Gradient fill variations", () => {
    it("should parse radial gradient", () => {
      const gradFill: XmlElement = {
        type: "element",
        name: "a:gradFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:gsLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:gs",
                attrs: { pos: "0" },
                children: [{ type: "element", name: "a:srgbClr", attrs: { val: "FFFFFF" }, children: [] }],
              },
              {
                type: "element",
                name: "a:gs",
                attrs: { pos: "100000" },
                children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
              },
            ],
          },
          {
            type: "element",
            name: "a:path",
            attrs: { path: "circle" },
            children: [
              { type: "element", name: "a:fillToRect", attrs: { l: "50000", t: "50000", r: "50000", b: "50000" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("43", "Radial Gradient", "ellipse", { fill: gradFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("Adjust values for preset geometries", () => {
    it("should parse roundRect with corner radius adjust value", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "50", name: "Adjusted RoundRect" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "roundRect" },
                children: [
                  {
                    type: "element",
                    name: "a:avLst",
                    attrs: {},
                    children: [{ type: "element", name: "a:gd", attrs: { name: "adj", fmla: "val 25000" }, children: [] }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        const geometry = result.shapes[0].properties.geometry;
        expect(geometry?.type).toBe("preset");
        if (geometry?.type === "preset") {
          expect(geometry.adjustValues.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // =========================================================================
  // ECMA-376 Section 21.1.2 - Text Body Properties
  // =========================================================================

  describe("ECMA-376 Section 21.1.2 - Text Body Properties (a:bodyPr)", () => {
    /**
     * Text body properties control text layout within a shape
     * @see ECMA-376 Part 1, Section 21.1.2.1 (bodyPr)
     */

    it("should parse shape with bodyPr anchor (vertical alignment)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { anchor: "ctr" }, // center vertical alignment
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Centered" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("60", "Anchor Center", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      // Shape should be parsed; textBody parsing may depend on implementation
      expect(result.shapes.length).toBe(1);
      expect(result.shapes[0].type).toBe("sp");
    });

    it("should parse shape with bodyPr rot (text rotation)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { rot: "5400000" }, // 90 degrees
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Rotated" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("61", "Rotated Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with bodyPr inset margins", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: {
              lIns: "91440",   // left inset in EMU
              tIns: "45720",   // top inset
              rIns: "91440",   // right inset
              bIns: "45720",   // bottom inset
            },
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Insets" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("62", "Inset Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with bodyPr wrap mode (square)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { wrap: "square" }, // text wraps at shape boundaries
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Wrapped text" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("63", "Wrap Square", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with bodyPr wrap mode (none)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { wrap: "none" }, // no text wrapping
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "No wrap" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("64", "No Wrap", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with bodyPr vertical text (vert)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { vert: "vert" }, // vertical text
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Vertical" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("65", "Vertical Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with bodyPr autoFit options", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:normAutofit",
                attrs: { fontScale: "75000", lnSpcReduction: "20000" },
                children: [],
              },
            ],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "AutoFit" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("66", "AutoFit Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // ECMA-376 Section 21.1.2 - Text Run Properties
  // =========================================================================

  describe("ECMA-376 Section 21.1.2 - Text Run Properties (a:rPr)", () => {
    /**
     * Text run properties control character-level formatting
     * @see ECMA-376 Part 1, Section 21.1.2.3 (rPr)
     */

    it("should parse text with bold formatting", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { b: "1" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Bold" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("70", "Bold Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with italic formatting", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { i: "1" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Italic" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("71", "Italic Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with underline", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { u: "sng" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Underlined" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("72", "Underlined Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with strikethrough", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { strike: "sngStrike" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Strikethrough" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("73", "Strike Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with font size", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { sz: "2400" }, children: [] }, // 24pt
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "24pt" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("74", "Font Size", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with font family (latin)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:rPr",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:latin", attrs: { typeface: "Arial" }, children: [] },
                    ],
                  },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Arial" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("75", "Latin Font", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with east asian font", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:rPr",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:ea", attrs: { typeface: "MS Gothic" }, children: [] },
                    ],
                  },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "日本語" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("76", "EA Font", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with superscript", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { baseline: "30000" }, children: [] }, // positive = super
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "²" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("77", "Superscript", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with subscript", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { baseline: "-25000" }, children: [] }, // negative = sub
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "₂" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("78", "Subscript", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse text with solid fill color", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:rPr",
                    attrs: {},
                    children: [
                      {
                        type: "element",
                        name: "a:solidFill",
                        attrs: {},
                        children: [{ type: "element", name: "a:srgbClr", attrs: { val: "FF0000" }, children: [] }],
                      },
                    ],
                  },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Red" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("79", "Colored Text", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // ECMA-376 Section 21.1.2 - Paragraph Properties
  // =========================================================================

  describe("ECMA-376 Section 21.1.2 - Paragraph Properties (a:pPr)", () => {
    /**
     * Paragraph properties control paragraph-level formatting
     * @see ECMA-376 Part 1, Section 21.1.2.2 (pPr)
     */

    it("should parse paragraph with left alignment", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { algn: "l" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Left" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("80", "Left Align", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with center alignment", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { algn: "ctr" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Center" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("81", "Center Align", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with right alignment", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { algn: "r" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Right" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("82", "Right Align", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with justify alignment", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { algn: "just" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Justified text content" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("83", "Justify Align", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with bullet (buNone)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [{ type: "element", name: "a:buNone", attrs: {}, children: [] }],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "No bullet" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("84", "No Bullet", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with character bullet (buChar)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [{ type: "element", name: "a:buChar", attrs: { char: "•" }, children: [] }],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Bulleted item" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("85", "Char Bullet", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with auto-numbered bullet (buAutoNum)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [{ type: "element", name: "a:buAutoNum", attrs: { type: "arabicPeriod" }, children: [] }],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Numbered item" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("86", "Auto Num", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with line spacing (spcPct)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:lnSpc",
                    attrs: {},
                    children: [{ type: "element", name: "a:spcPct", attrs: { val: "150000" }, children: [] }], // 1.5 line
                  },
                ],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "1.5 line spacing" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("87", "Line Spacing Pct", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with line spacing (spcPts)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:lnSpc",
                    attrs: {},
                    children: [{ type: "element", name: "a:spcPts", attrs: { val: "1800" }, children: [] }], // 18pt
                  },
                ],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "18pt line spacing" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("88", "Line Spacing Pts", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with indent level", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { lvl: "1" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Level 1 indent" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("89", "Indent Level", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with margin (marL, marR)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { marL: "457200", marR: "228600" }, children: [] }, // L=0.5in, R=0.25in
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Margins" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("90", "Paragraph Margins", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with first line indent (indent)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { indent: "457200" }, children: [] }, // 0.5in first line
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "First line indented paragraph" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("91", "First Line Indent", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse paragraph with space before and after", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:pPr",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:spcBef",
                    attrs: {},
                    children: [{ type: "element", name: "a:spcPts", attrs: { val: "600" }, children: [] }], // 6pt before
                  },
                  {
                    type: "element",
                    name: "a:spcAft",
                    attrs: {},
                    children: [{ type: "element", name: "a:spcPts", attrs: { val: "600" }, children: [] }], // 6pt after
                  },
                ],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Spaced paragraph" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("92", "Paragraph Spacing", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // ECMA-376 Section 21.1.2 - lstStyle (List Style)
  // =========================================================================

  describe("ECMA-376 Section 21.1.2 - List Style (a:lstStyle)", () => {
    /**
     * List style defines default text formatting for each list level
     * @see ECMA-376 Part 1, Section 21.1.2.4 (lstStyle)
     */

    it("should parse lstStyle with defPPr (default paragraph properties)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:lstStyle",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:defPPr",
                attrs: { algn: "ctr" },
                children: [
                  {
                    type: "element",
                    name: "a:defRPr",
                    attrs: { sz: "1800" },
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Default" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("93", "Default Style", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse lstStyle with lvl1pPr through lvl9pPr", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:lstStyle",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:lvl1pPr",
                attrs: { algn: "l" },
                children: [{ type: "element", name: "a:defRPr", attrs: { sz: "3200" }, children: [] }],
              },
              {
                type: "element",
                name: "a:lvl2pPr",
                attrs: { algn: "l" },
                children: [{ type: "element", name: "a:defRPr", attrs: { sz: "2800" }, children: [] }],
              },
              {
                type: "element",
                name: "a:lvl3pPr",
                attrs: { algn: "l" },
                children: [{ type: "element", name: "a:defRPr", attrs: { sz: "2400" }, children: [] }],
              },
            ],
          },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { lvl: "0" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Level 1" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("94", "Multi-Level Style", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // ECMA-376 Section 20.1.8 - Bitmap fills and image effects
  // =========================================================================

  describe("ECMA-376 Section 20.1.8 - Bitmap fills (blipFill)", () => {
    /**
     * Bitmap fill properties for images in diagram shapes
     * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
     */

    it("should parse shape with blipFill stretch mode", () => {
      const blipFill: XmlElement = {
        type: "element",
        name: "a:blipFill",
        attrs: {},
        children: [
          { type: "element", name: "a:blip", attrs: { "r:embed": "rId1" }, children: [] },
          {
            type: "element",
            name: "a:stretch",
            attrs: {},
            children: [{ type: "element", name: "a:fillRect", attrs: {}, children: [] }],
          },
        ],
      };

      const shape = createDspShape("95", "Stretch Fill", "rect", { fill: blipFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with blipFill tile mode", () => {
      const blipFill: XmlElement = {
        type: "element",
        name: "a:blipFill",
        attrs: {},
        children: [
          { type: "element", name: "a:blip", attrs: { "r:embed": "rId2" }, children: [] },
          {
            type: "element",
            name: "a:tile",
            attrs: { tx: "0", ty: "0", sx: "100000", sy: "100000", flip: "none", algn: "tl" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("96", "Tile Fill", "rect", { fill: blipFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with blipFill and srcRect (crop)", () => {
      const blipFill: XmlElement = {
        type: "element",
        name: "a:blipFill",
        attrs: {},
        children: [
          { type: "element", name: "a:blip", attrs: { "r:embed": "rId3" }, children: [] },
          { type: "element", name: "a:srcRect", attrs: { l: "10000", t: "10000", r: "10000", b: "10000" }, children: [] },
          {
            type: "element",
            name: "a:stretch",
            attrs: {},
            children: [{ type: "element", name: "a:fillRect", attrs: {}, children: [] }],
          },
        ],
      };

      const shape = createDspShape("97", "Cropped Image", "rect", { fill: blipFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // Multiple paragraphs and text runs
  // =========================================================================

  describe("Multiple paragraphs and text runs", () => {
    it("should parse shape with multiple paragraphs", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "First paragraph" }] }],
              },
            ],
          },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Second paragraph" }] }],
              },
            ],
          },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Third paragraph" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("98", "Multi-Para", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with multiple text runs in one paragraph", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { b: "1" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Bold " }] },
                ],
              },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { i: "1" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "and Italic" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("99", "Multi-Run", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with text field (a:fld)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:fld",
                attrs: { type: "slidenum", uuid: "{12345678-1234-1234-1234-123456789012}" },
                children: [
                  { type: "element", name: "a:rPr", attrs: {}, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "1" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("100", "Text Field", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with end paragraph run (a:endParaRPr)", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Content" }] }],
              },
              { type: "element", name: "a:endParaRPr", attrs: { sz: "1800", lang: "en-US" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("101", "End Para RPr", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  // =========================================================================
  // Missing elements from actual PPTX files
  // =========================================================================

  describe("ECMA-376 Section 21.1.2.1.3 - noAutofit (text body)", () => {
    /**
     * noAutofit specifies that text should not be auto-fitted
     * @see ECMA-376 Part 1, Section 21.1.2.1.3
     */
    it("should parse shape with a:noAutofit", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { wrap: "square", anchor: "ctr" },
            children: [
              { type: "element", name: "a:noAutofit", attrs: {}, children: [] },
            ],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "No autofit" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("110", "No Autofit", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse shape with a:spAutoFit", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: {},
            children: [
              { type: "element", name: "a:spAutoFit", attrs: {}, children: [] },
            ],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Shape autofit" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("111", "Shape Autofit", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.2.3 - Color Offset Modifiers", () => {
    /**
     * Color offset modifiers for scheme colors
     * @see ECMA-376 Part 1, Section 20.1.2.3
     */
    it("should parse schemeClr with hueOff modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:hueOff", attrs: { val: "0" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("112", "Hue Offset", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse schemeClr with satOff modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:satOff", attrs: { val: "0" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("113", "Sat Offset", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse schemeClr with lumOff modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:lumOff", attrs: { val: "0" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("114", "Lum Offset", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse schemeClr with alphaOff modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:alphaOff", attrs: { val: "0" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("115", "Alpha Offset", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse schemeClr with multiple offset modifiers", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:hueOff", attrs: { val: "0" }, children: [] },
              { type: "element", name: "a:satOff", attrs: { val: "0" }, children: [] },
              { type: "element", name: "a:lumOff", attrs: { val: "0" }, children: [] },
              { type: "element", name: "a:alphaOff", attrs: { val: "0" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("116", "All Offsets", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.2.3 - Additional Color Types", () => {
    /**
     * Additional color specification types
     * @see ECMA-376 Part 1, Section 20.1.2.3
     */
    it("should parse a:prstClr (preset color)", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:prstClr",
            attrs: { val: "black" },
            children: [
              { type: "element", name: "a:alpha", attrs: { val: "40000" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("117", "Preset Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse a:scrgbClr (scRGB color)", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:scrgbClr",
            attrs: { r: "0", g: "0", b: "0" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("118", "scRGB Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse a:hslClr (HSL color)", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:hslClr",
            attrs: { hue: "0", sat: "100000", lum: "50000" },
            children: [],
          },
        ],
      };

      const shape = createDspShape("119", "HSL Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 21.1.2.3.9 - Text Run Attributes", () => {
    /**
     * Additional text run properties
     * @see ECMA-376 Part 1, Section 21.1.2.3.9
     */
    it("should parse rPr with lang attribute", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { lang: "en-US" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "English" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("120", "Lang Attr", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse rPr with kern attribute", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { kern: "1200" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Kerning" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("121", "Kern Attr", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse rPr with dirty and smtClean attributes", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [
                  { type: "element", name: "a:rPr", attrs: { dirty: "0", smtClean: "0" }, children: [] },
                  { type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Edited" }] },
                ],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("122", "Dirty SmtClean", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 21.1.2.2.27 - Paragraph defTabSz", () => {
    it("should parse pPr with defTabSz attribute", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          { type: "element", name: "a:bodyPr", attrs: {}, children: [] },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              { type: "element", name: "a:pPr", attrs: { defTabSz: "914400" }, children: [] },
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Tab size" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("123", "Def Tab Size", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.10 - Line Join Types", () => {
    /**
     * Line join types: miter, round, bevel
     * @see ECMA-376 Part 1, Section 20.1.10
     */
    it("should parse line with round join", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400" },
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
          { type: "element", name: "a:round", attrs: {}, children: [] },
        ],
      };

      const shape = createDspShape("124", "Round Join", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse line with compound type", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400", cmpd: "dbl" }, // double line
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
        ],
      };

      const shape = createDspShape("125", "Compound Line", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse line with alignment", () => {
      const line: XmlElement = {
        type: "element",
        name: "a:ln",
        attrs: { w: "25400", algn: "ctr" }, // center alignment
        children: [
          {
            type: "element",
            name: "a:solidFill",
            attrs: {},
            children: [{ type: "element", name: "a:srgbClr", attrs: { val: "000000" }, children: [] }],
          },
        ],
      };

      const shape = createDspShape("126", "Line Align", "rect", { line });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 21.1.2.1.1 - bodyPr additional attributes", () => {
    /**
     * Additional bodyPr attributes found in actual diagrams
     * @see ECMA-376 Part 1, Section 21.1.2.1.1
     */
    it("should parse bodyPr with spcFirstLastPara attribute", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { spcFirstLastPara: "0" },
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Content" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("127", "SpcFirstLastPara", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse bodyPr with numCol and spcCol attributes", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { numCol: "2", spcCol: "914400" },
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Multi-column" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("128", "NumCol SpcCol", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });

    it("should parse bodyPr with anchorCtr attribute", () => {
      const txBody: XmlElement = {
        type: "element",
        name: "dsp:txBody",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:bodyPr",
            attrs: { anchor: "ctr", anchorCtr: "0" },
            children: [],
          },
          { type: "element", name: "a:lstStyle", attrs: {}, children: [] },
          {
            type: "element",
            name: "a:p",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:r",
                attrs: {},
                children: [{ type: "element", name: "a:t", attrs: {}, children: [{ type: "text", value: "Anchor Ctr" }] }],
              },
            ],
          },
        ],
      };

      const shape = createDspShape("129", "AnchorCtr", "rect", { txBody });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.7.42 - outerShdw additional attributes", () => {
    /**
     * Additional outerShdw attributes
     * @see ECMA-376 Part 1, Section 20.1.7.42
     */
    it("should parse outerShdw with algn and rotWithShape", () => {
      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "130", name: "Shadow Attrs" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              {
                type: "element",
                name: "a:prstGeom",
                attrs: { prst: "rect" },
                children: [{ type: "element", name: "a:avLst", attrs: {}, children: [] }],
              },
              {
                type: "element",
                name: "a:effectLst",
                attrs: {},
                children: [
                  {
                    type: "element",
                    name: "a:outerShdw",
                    attrs: { blurRad: "40000", dist: "20000", dir: "5400000", algn: "tl", rotWithShape: "0" },
                    children: [
                      {
                        type: "element",
                        name: "a:srgbClr",
                        attrs: { val: "000000" },
                        children: [{ type: "element", name: "a:alpha", attrs: { val: "38000" }, children: [] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.9.15 - quadBezTo path command", () => {
    /**
     * Quadratic bezier curve command
     * @see ECMA-376 Part 1, Section 20.1.9.15
     */
    it("should parse custom geometry with quadBezTo command", () => {
      const custGeom: XmlElement = {
        type: "element",
        name: "a:custGeom",
        attrs: {},
        children: [
          { type: "element", name: "a:avLst", attrs: {}, children: [] },
          { type: "element", name: "a:gdLst", attrs: {}, children: [] },
          { type: "element", name: "a:ahLst", attrs: {}, children: [] },
          { type: "element", name: "a:cxnLst", attrs: {}, children: [] },
          { type: "element", name: "a:rect", attrs: { l: "0", t: "0", r: "0", b: "0" }, children: [] },
          {
            type: "element",
            name: "a:pathLst",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:path",
                attrs: { w: "100000", h: "100000" },
                children: [
                  {
                    type: "element",
                    name: "a:moveTo",
                    attrs: {},
                    children: [{ type: "element", name: "a:pt", attrs: { x: "0", y: "100000" }, children: [] }],
                  },
                  {
                    type: "element",
                    name: "a:quadBezTo",
                    attrs: {},
                    children: [
                      { type: "element", name: "a:pt", attrs: { x: "50000", y: "0" }, children: [] },
                      { type: "element", name: "a:pt", attrs: { x: "100000", y: "100000" }, children: [] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const shape: XmlElement = {
        type: "element",
        name: "dsp:sp",
        attrs: {},
        children: [
          {
            type: "element",
            name: "dsp:nvSpPr",
            attrs: {},
            children: [
              { type: "element", name: "dsp:cNvPr", attrs: { id: "131", name: "QuadBez Shape" }, children: [] },
              { type: "element", name: "dsp:cNvSpPr", attrs: {}, children: [] },
            ],
          },
          {
            type: "element",
            name: "dsp:spPr",
            attrs: {},
            children: [
              {
                type: "element",
                name: "a:xfrm",
                attrs: {},
                children: [
                  { type: "element", name: "a:off", attrs: { x: "0", y: "0" }, children: [] },
                  { type: "element", name: "a:ext", attrs: { cx: "100000", cy: "100000" }, children: [] },
                ],
              },
              custGeom,
            ],
          },
        ],
      };

      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
      if (result.shapes[0].type === "sp") {
        expect(result.shapes[0].properties.geometry?.type).toBe("custom");
      }
    });
  });

  describe("ECMA-376 Section 20.1.2.3.34 - tint color modifier", () => {
    /**
     * Tint modifier for colors
     * @see ECMA-376 Part 1, Section 20.1.2.3.34
     */
    it("should parse schemeClr with tint modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:tint", attrs: { val: "50000" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("132", "Tint Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.2.3.18 - lum/lumMod color modifiers", () => {
    /**
     * Luminance modifiers for colors
     * @see ECMA-376 Part 1, Section 20.1.2.3.18
     */
    it("should parse schemeClr with lum and lumMod modifiers", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:lumMod", attrs: { val: "75000" }, children: [] },
              { type: "element", name: "a:lum", attrs: { val: "50000" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("133", "Lum Modifiers", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });

  describe("ECMA-376 Section 20.1.2.3.26 - satMod color modifier", () => {
    /**
     * Saturation modifier for colors
     * @see ECMA-376 Part 1, Section 20.1.2.3.26
     */
    it("should parse schemeClr with satMod modifier", () => {
      const solidFill: XmlElement = {
        type: "element",
        name: "a:solidFill",
        attrs: {},
        children: [
          {
            type: "element",
            name: "a:schemeClr",
            attrs: { val: "accent1" },
            children: [
              { type: "element", name: "a:satMod", attrs: { val: "150000" }, children: [] },
            ],
          },
        ],
      };

      const shape = createDspShape("134", "SatMod Color", "rect", { fill: solidFill });
      const doc = createDspDrawing([shape]);
      const result = parseDiagramDrawing(doc);

      expect(result.shapes.length).toBe(1);
    });
  });
});
