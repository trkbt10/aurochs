/**
 * @file Tests for shape parsing
 *
 * ECMA-376 Part 1, Section 19.3.1 - PresentationML Shapes
 * This section defines the shape elements used in slides.
 *
 * Shape types:
 * - p:sp (19.3.1.43) - Standard shape
 * - p:pic (19.3.1.37) - Picture shape
 * - p:grpSp (19.3.1.22) - Group shape
 * - p:cxnSp (19.3.1.13) - Connector shape
 * - p:graphicFrame (19.3.1.21) - Graphic frame (tables, charts, diagrams)
 *
 * Related elements:
 * - p:nvSpPr (19.3.1.29) - Non-visual shape properties
 * - p:nvPr (19.3.1.33) - Non-visual properties
 * - p:ph (19.3.1.36) - Placeholder
 * - p:spPr (19.3.1.44) - Shape properties
 * - p:style (19.3.1.46) - Shape style
 *
 * @see ECMA-376 Part 1, Section 19.3.1
 */

import { parseShapeElement, parseShapeTree } from "./index";

type MutableXmlText = {
  type: "text";
  value: string;
};

type MutableXmlElement = {
  type: "element";
  name: string;
  attrs: Record<string, string>;
  children: MutableXmlNode[];
};

type MutableXmlNode = MutableXmlElement | MutableXmlText;

// Helper to create mock XmlElement
function el(
  name: string,
  attrs: Record<string, string> = {},
  children: MutableXmlNode[] = [],
): MutableXmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// parseShapeElement - p:sp (ECMA-376 Section 19.3.1.43)
// =============================================================================

describe("parseShapeElement - p:sp (ECMA-376 Section 19.3.1.43)", () => {
  describe("Non-visual properties (p:nvSpPr - Section 19.3.1.29)", () => {
    it("parses shape with id and name", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Rectangle 1" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      expect(result).toBeDefined();
      expect(result?.type).toBe("sp");
      if (result?.type === "sp") {
        expect(result.nonVisual.id).toBe("2");
        expect(result.nonVisual.name).toBe("Rectangle 1");
      }
    });

    it("parses description and title", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", {
            id: "3",
            name: "Shape",
            descr: "Alt text",
            title: "Shape Title",
          }),
          el("p:cNvSpPr"),
          el("p:nvPr"),
        ]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.nonVisual.description).toBe("Alt text");
        expect(result.nonVisual.title).toBe("Shape Title");
      }
    });

    it("parses hidden attribute", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "4", name: "Hidden", hidden: "1" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.nonVisual.hidden).toBe(true);
      }
    });

    it("parses hyperlink", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "5", name: "Link" }, [
            el("a:hlinkClick", { "r:id": "rId1", tooltip: "Click here" }, [
              el("a:snd", { "r:embed": "rId9", name: "click.wav" }),
            ]),
            el("a:hlinkHover", { "r:id": "rId2", tooltip: "Hover here" }, [
              el("a:snd", { "r:embed": "rId10", name: "hover.wav" }),
            ]),
          ]),
          el("p:cNvSpPr"),
          el("p:nvPr"),
        ]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.nonVisual.hyperlink).toBeDefined();
        expect(result.nonVisual.hyperlink?.id).toBe("rId1");
        expect(result.nonVisual.hyperlink?.tooltip).toBe("Click here");
        expect(result.nonVisual.hyperlink?.sound?.embed).toBe("rId9");
        expect(result.nonVisual.hyperlink?.sound?.name).toBe("click.wav");
        expect(result.nonVisual.hyperlinkHover).toBeDefined();
        expect(result.nonVisual.hyperlinkHover?.id).toBe("rId2");
        expect(result.nonVisual.hyperlinkHover?.tooltip).toBe("Hover here");
        expect(result.nonVisual.hyperlinkHover?.sound?.embed).toBe("rId10");
        expect(result.nonVisual.hyperlinkHover?.sound?.name).toBe("hover.wav");
      }
    });

    it("parses spLocks from cNvSpPr", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "6", name: "Locked Shape" }),
          el("p:cNvSpPr", {}, [el("a:spLocks", { noGrp: "1", noTextEdit: "1", noResize: "0" })]),
          el("p:nvPr"),
        ]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.nonVisual.shapeLocks?.noGrp).toBe(true);
        expect(result.nonVisual.shapeLocks?.noTextEdit).toBe(true);
        expect(result.nonVisual.shapeLocks?.noResize).toBe(false);
      }
    });
  });

  describe("Text shape (a:txSp - Section 20.1.2.2.41)", () => {
    it("parses a:txSp as a standard shape", () => {
      const txSp = el("a:txSp", {}, [
        el("a:nvSpPr", {}, [el("a:cNvPr", { id: "8", name: "Text Shape" }), el("a:cNvSpPr"), el("a:nvPr")]),
        el("a:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
        el("a:txBody", {}, [
          el("a:bodyPr"),
          el("a:lstStyle"),
          el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [{ type: "text", value: "TxSp" }])])]),
        ]),
      ]);
      const result = parseShapeElement(txSp);

      expect(result?.type).toBe("sp");
      if (result?.type === "sp") {
        expect(result.nonVisual.name).toBe("Text Shape");
        expect(result.textBody?.paragraphs[0]?.runs[0]?.type).toBe("text");
      }
    });

    it("parses useSpRect for text shape", () => {
      const txSp = el("a:txSp", {}, [
        el("a:nvSpPr", {}, [el("a:cNvPr", { id: "9", name: "Use Rect" }), el("a:cNvSpPr"), el("a:nvPr")]),
        el("a:txBody", {}, [
          el("a:bodyPr"),
          el("a:lstStyle"),
          el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [{ type: "text", value: "Use Rect" }])])]),
        ]),
        el("a:useSpRect"),
      ]);
      const result = parseShapeElement(txSp);

      if (result?.type === "sp") {
        expect(result.useShapeTextRect).toBe(true);
      }
    });
  });

  describe("Placeholder (p:ph - Section 19.3.1.36)", () => {
    it("parses placeholder with type and idx", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "2", name: "Title" }),
          el("p:cNvSpPr"),
          el("p:nvPr", {}, [el("p:ph", { type: "title", idx: "0" })]),
        ]),
        el("p:spPr"),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.placeholder).toBeDefined();
        expect(result.placeholder?.type).toBe("title");
        expect(result.placeholder?.idx).toBe(0);
      }
    });

    it("parses placeholder with size", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "4", name: "Body" }),
          el("p:cNvSpPr"),
          el("p:nvPr", {}, [el("p:ph", { type: "body", idx: "1", sz: "half" })]),
        ]),
        el("p:spPr"),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.placeholder?.size).toBe("half");
      }
    });

    it("parses placeholder with only idx", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "3", name: "Content" }),
          el("p:cNvSpPr"),
          el("p:nvPr", {}, [el("p:ph", { idx: "1" })]),
        ]),
        el("p:spPr"),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.placeholder?.idx).toBe(1);
        expect(result.placeholder?.type).toBeUndefined();
      }
    });

    it("returns undefined placeholder when p:ph not present", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Plain" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr"),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.placeholder).toBeUndefined();
      }
    });
  });

  describe("Shape properties (p:spPr - Section 19.3.1.44)", () => {
    it("parses transform", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "914400", y: "457200" }), el("a:ext", { cx: "1828800", cy: "914400" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.transform).toBeDefined();
        expect(result.properties.transform?.x).toBeCloseTo(96, 0);
        expect(result.properties.transform?.y).toBeCloseTo(48, 0);
        expect(result.properties.transform?.width).toBeCloseTo(192, 0);
        expect(result.properties.transform?.height).toBeCloseTo(96, 0);
      }
    });

    it("parses preset geometry", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:prstGeom", { prst: "roundRect" }),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.geometry).toBeDefined();
        expect(result.properties.geometry?.type).toBe("preset");
        if (result.properties.geometry?.type === "preset") {
          expect(result.properties.geometry.preset).toBe("roundRect");
        }
      }
    });

    it("parses solid fill", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.fill).toBeDefined();
        expect(result.properties.fill?.type).toBe("solidFill");
      }
    });

    it("parses line properties", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:ln", { w: "25400" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "0000FF" })])]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.line).toBeDefined();
      }
    });

    it("parses 3D scene and shape properties", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "10", name: "3D Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:prstGeom", { prst: "rect" }, [el("a:avLst")]),
          el("a:scene3d", {}, [
            el("a:camera", { prst: "orthographicFront", fov: "3600000" }),
            el("a:lightRig", { rig: "threePt", dir: "t" }),
            el("a:flatTx", { z: "914400" }),
          ]),
          el("a:sp3d", { extrusionH: "152400", contourW: "12700" }, [
            el("a:extrusionClr", {}, [el("a:srgbClr", { val: "FF0000" })]),
            el("a:contourClr", {}, [el("a:srgbClr", { val: "00FF00" })]),
          ]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.scene3d?.flatTextZ).toBe(96);
        const extrusion = result.properties.shape3d?.extrusionColor;
        const contour = result.properties.shape3d?.contourColor;
        if (extrusion?.type === "solidFill" && extrusion.color.spec.type === "srgb") {
          expect(extrusion.color.spec.value).toBe("FF0000");
        }
        if (contour?.type === "solidFill" && contour.color.spec.type === "srgb") {
          expect(contour.color.spec.value).toBe("00FF00");
        }
      }
    });

    it("parses bevel preset on shape 3D", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "11", name: "Bevel Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:sp3d", {}, [
            el("a:bevelT", { prst: "circle", w: "914400", h: "914400" }),
          ]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.shape3d?.bevel?.preset).toBe("circle");
        expect(result.properties.shape3d?.bevel?.width).toBeCloseTo(96, 0);
        expect(result.properties.shape3d?.bevel?.height).toBeCloseTo(96, 0);
      }
    });

    it("parses preset material on shape 3D", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "13", name: "Material Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:sp3d", { prstMaterial: "warmMatte" }),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.shape3d?.preset).toBe("warmMatte");
      }
    });

    it("ignores invalid bevel preset values", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "12", name: "Bad Bevel Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          el("a:sp3d", {}, [
            el("a:bevelT", { prst: "notAType", w: "914400", h: "914400" }),
          ]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.properties.shape3d?.bevel).toBeUndefined();
      }
    });
  });

  describe("Shape style (p:style - Section 19.3.1.46)", () => {
    it("parses style references", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr"),
        el("p:style", {}, [
          el("a:lnRef", { idx: "1" }, [el("a:schemeClr", { val: "accent1" })]),
          el("a:fillRef", { idx: "2" }, [el("a:schemeClr", { val: "accent1" })]),
          el("a:effectRef", { idx: "0" }),
          el("a:fontRef", { idx: "minor" }, [el("a:schemeClr", { val: "dk1" })]),
        ]),
      ]);
      const result = parseShapeElement(sp);

      if (result?.type === "sp") {
        expect(result.style).toBeDefined();
        expect(result.style?.lineReference?.index).toBe(1);
        expect(result.style?.fillReference?.index).toBe(2);
        expect(result.style?.effectReference?.index).toBe(0);
        expect(result.style?.fontReference?.index).toBe("minor");
      }
    });

    it("resolves effectRef to theme effect style", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "3", name: "Effect Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr"),
        el("p:style", {}, [el("a:effectRef", { idx: "1" }, [el("a:srgbClr", { val: "FF0000" })])]),
      ]);
      const formatScheme = {
        lineStyles: [],
        fillStyles: [],
        effectStyles: [
          el("a:effectStyle", {}, [
            el("a:effectLst", {}, [
              el("a:outerShdw", { blurRad: "0", dist: "0", dir: "0" }, [el("a:schemeClr", { val: "phClr" })]),
            ]),
          ]),
        ],
      };
      const result = parseShapeElement(sp, undefined, undefined, formatScheme);

      if (result?.type === "sp") {
        expect(result.properties.effects?.shadow?.color).toBe("FF0000");
      }
    });
  });

  describe("Text body (p:txBody)", () => {
    it("parses shape with text body", () => {
      const sp = el("p:sp", {}, [
        el("p:nvSpPr", {}, [
          el("p:cNvPr", { id: "2", name: "TextBox" }),
          el("p:cNvSpPr", { txBox: "1" }),
          el("p:nvPr"),
        ]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
        el("p:txBody", {}, [
          el("a:bodyPr"),
          el("a:lstStyle"),
          el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [{ type: "text", value: "Hello World" }])])]),
        ]),
      ]);
      const result = parseShapeElement(sp);

    if (result?.type === "sp") {
      expect(result.textBody).toBeDefined();
      expect(result.nonVisual.textBox).toBe(true);
    }
  });
});
});

// =============================================================================
// parseShapeElement - p:pic (ECMA-376 Section 19.3.1.37)
// =============================================================================

describe("parseShapeElement - p:pic (ECMA-376 Section 19.3.1.37)", () => {
  it("parses picture with embedded resource", () => {
    const pic = el("p:pic", {}, [
      el("p:nvPicPr", {}, [
        el("p:cNvPr", { id: "4", name: "Picture 1" }),
        el("p:cNvPicPr", {}, [el("a:picLocks", { noCrop: "1", noRot: "0" })]),
        el("p:nvPr"),
      ]),
      el("p:blipFill", {}, [el("a:blip", { "r:embed": "rId2" }), el("a:stretch", {}, [el("a:fillRect")])]),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
      ]),
    ]);
    const result = parseShapeElement(pic);

    expect(result).toBeDefined();
    expect(result?.type).toBe("pic");
    if (result?.type === "pic") {
      expect(result.nonVisual.id).toBe("4");
      expect(result.nonVisual.name).toBe("Picture 1");
      expect(result.nonVisual.pictureLocks?.noCrop).toBe(true);
      expect(result.nonVisual.pictureLocks?.noRot).toBe(false);
      expect(result.blipFill.resourceId).toBe("rId2");
      expect(result.blipFill.stretch).toBe(true);
    }
  });

  it("parses picture with source rectangle crop", () => {
    const pic = el("p:pic", {}, [
      el("p:nvPicPr", {}, [el("p:cNvPr", { id: "5", name: "Cropped" }), el("p:cNvPicPr"), el("p:nvPr")]),
      el("p:blipFill", {}, [
        el("a:blip", { "r:embed": "rId3" }),
        el("a:srcRect", { l: "25000", t: "25000", r: "25000", b: "25000" }),
        el("a:stretch"),
      ]),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
      ]),
    ]);
    const result = parseShapeElement(pic);

    if (result?.type === "pic") {
      expect(result.blipFill.sourceRect).toBeDefined();
      expect(result.blipFill.sourceRect?.left).toBe(25);
      expect(result.blipFill.sourceRect?.top).toBe(25);
    }
  });

  it("parses picture with media references", () => {
    const pic = el("p:pic", {}, [
      el("p:nvPicPr", {}, [
        el("p:cNvPr", { id: "7", name: "Media Pic" }),
        el("p:cNvPicPr"),
        el("p:nvPr", {}, [
          el("a:audioCd", {}, [el("a:st", { track: "1", time: "2" }), el("a:end", { track: "3", time: "65" })]),
          el("a:audioFile", { "r:link": "rId1", contentType: "audio/mpeg" }),
          el("a:quickTimeFile", { "r:link": "rId2" }),
          el("a:videoFile", { "r:link": "rId3", contentType: "video/ogg" }),
          el("a:wavAudioFile", { "r:embed": "rId4", name: "Sound 1" }),
        ]),
      ]),
      el("p:blipFill", {}, [el("a:blip", { "r:embed": "rId5" }), el("a:stretch", {}, [el("a:fillRect")])]),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
      ]),
    ]);
    const result = parseShapeElement(pic);

    if (result?.type === "pic") {
      expect(result.media?.audioCd?.start?.track).toBe(1);
      expect(result.media?.audioCd?.start?.time).toBe(2);
      expect(result.media?.audioCd?.end?.track).toBe(3);
      expect(result.media?.audioCd?.end?.time).toBe(65);
      expect(result.media?.audioFile?.link).toBe("rId1");
      expect(result.media?.audioFile?.contentType).toBe("audio/mpeg");
      expect(result.media?.quickTimeFile?.link).toBe("rId2");
      expect(result.media?.videoFile?.link).toBe("rId3");
      expect(result.media?.videoFile?.contentType).toBe("video/ogg");
      expect(result.media?.wavAudioFile?.embed).toBe("rId4");
      expect(result.media?.wavAudioFile?.name).toBe("Sound 1");
    }
  });

  it("returns undefined for pic without blip", () => {
    const pic = el("p:pic", {}, [
      el("p:nvPicPr", {}, [el("p:cNvPr", { id: "6", name: "No Image" }), el("p:cNvPicPr"), el("p:nvPr")]),
      el("p:blipFill"),
      el("p:spPr"),
    ]);
    const result = parseShapeElement(pic);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseShapeElement - p:grpSp (ECMA-376 Section 19.3.1.22)
// =============================================================================

describe("parseShapeElement - p:grpSp (ECMA-376 Section 19.3.1.22)", () => {
  it("parses group shape with children", () => {
    const grpSp = el("p:grpSp", {}, [
      el("p:nvGrpSpPr", {}, [
        el("p:cNvPr", { id: "7", name: "Group 1" }),
        el("p:cNvGrpSpPr", {}, [el("a:grpSpLocks", { noUngrp: "1" })]),
        el("p:nvPr"),
      ]),
      el("p:grpSpPr", {}, [
        el("a:xfrm", {}, [
          el("a:off", { x: "0", y: "0" }),
          el("a:ext", { cx: "914400", cy: "914400" }),
          el("a:chOff", { x: "0", y: "0" }),
          el("a:chExt", { cx: "914400", cy: "914400" }),
        ]),
      ]),
      el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "8", name: "Child 1" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "457200", cy: "457200" })]),
        ]),
      ]),
      el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "9", name: "Child 2" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "457200", y: "0" }), el("a:ext", { cx: "457200", cy: "457200" })]),
        ]),
      ]),
    ]);
    const result = parseShapeElement(grpSp);

    expect(result).toBeDefined();
    expect(result?.type).toBe("grpSp");
    if (result?.type === "grpSp") {
      expect(result.nonVisual.id).toBe("7");
      expect(result.nonVisual.groupLocks?.noUngrp).toBe(true);
      expect(result.children).toHaveLength(2);
      expect(result.children[0].type).toBe("sp");
      expect(result.children[1].type).toBe("sp");
    }
  });

  it("parses group transform with child extent", () => {
    const grpSp = el("p:grpSp", {}, [
      el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "10", name: "Group" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
      el("p:grpSpPr", {}, [
        el("a:xfrm", {}, [
          el("a:off", { x: "914400", y: "914400" }),
          el("a:ext", { cx: "1828800", cy: "1371600" }),
          el("a:chOff", { x: "0", y: "0" }),
          el("a:chExt", { cx: "9144000", cy: "6858000" }),
        ]),
      ]),
    ]);
    const result = parseShapeElement(grpSp);

    if (result?.type === "grpSp") {
      expect(result.properties.transform).toBeDefined();
      expect(result.properties.transform?.x).toBeCloseTo(96, 0);
      expect(result.properties.transform?.childExtentWidth).toBeCloseTo(960, 0);
    }
  });
});

// =============================================================================
// parseShapeElement - p:contentPart (ECMA-376 Section 19.3.1.14)
// =============================================================================

describe("parseShapeElement - p:contentPart (ECMA-376 Section 19.3.1.14)", () => {
  it("parses contentPart with relationship ID", () => {
    const contentPart = el("p:contentPart", { "r:id": "rId42", bwMode: "gray" });
    const result = parseShapeElement(contentPart);

    expect(result?.type).toBe("contentPart");
    if (result?.type === "contentPart") {
      expect(result.contentPart.id).toBe("rId42");
      expect(result.contentPart.bwMode).toBe("gray");
    }
  });
});

// =============================================================================
// parseShapeElement - lc:lockedCanvas (ECMA-376 Section 20.3.2.1)
// =============================================================================

describe("parseShapeElement - lc:lockedCanvas (ECMA-376 Section 20.3.2.1)", () => {
  it("parses locked canvas as group shape", () => {
    const lockedCanvas = el("lc:lockedCanvas", {}, [
      el("a:nvGrpSpPr", {}, [
        el("a:cNvPr", { id: "1", name: "Locked Canvas" }),
        el("a:cNvGrpSpPr"),
        el("a:nvPr"),
      ]),
      el("a:grpSpPr", {}, [
        el("a:xfrm", {}, [
          el("a:off", { x: "0", y: "0" }),
          el("a:ext", { cx: "914400", cy: "914400" }),
          el("a:chOff", { x: "0", y: "0" }),
          el("a:chExt", { cx: "914400", cy: "914400" }),
        ]),
      ]),
      el("a:sp", {}, [
        el("a:nvSpPr", {}, [
          el("a:cNvPr", { id: "2", name: "Child Shape" }),
          el("a:cNvSpPr"),
          el("a:nvPr"),
        ]),
        el("a:spPr", {}, [el("a:prstGeom", { prst: "rect" })]),
      ]),
    ]);

    const result = parseShapeElement(lockedCanvas);

    expect(result?.type).toBe("grpSp");
    if (result?.type === "grpSp") {
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe("sp");
    }
  });
});

// =============================================================================
// parseShapeElement - p:cxnSp (ECMA-376 Section 19.3.1.13)
// =============================================================================

describe("parseShapeElement - p:cxnSp (ECMA-376 Section 19.3.1.13)", () => {
  it("parses connector shape", () => {
    const cxnSp = el("p:cxnSp", {}, [
      el("p:nvCxnSpPr", {}, [el("p:cNvPr", { id: "11", name: "Connector 1" }), el("p:cNvCxnSpPr"), el("p:nvPr")]),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "0" })]),
        el("a:prstGeom", { prst: "line" }),
      ]),
    ]);
    const result = parseShapeElement(cxnSp);

    expect(result).toBeDefined();
    expect(result?.type).toBe("cxnSp");
    if (result?.type === "cxnSp") {
      expect(result.nonVisual.id).toBe("11");
    }
  });

  it("parses connector with connection targets", () => {
    const cxnSp = el("p:cxnSp", {}, [
      el("p:nvCxnSpPr", {}, [
        el("p:cNvPr", { id: "12", name: "Connected" }),
        el("p:cNvCxnSpPr", {}, [el("a:stCxn", { id: "2", idx: "0" }), el("a:endCxn", { id: "3", idx: "2" })]),
        el("p:nvPr"),
      ]),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
      ]),
    ]);
    const result = parseShapeElement(cxnSp);

    if (result?.type === "cxnSp") {
      expect(result.nonVisual.startConnection).toBeDefined();
      expect(result.nonVisual.startConnection?.shapeId).toBe("2");
      expect(result.nonVisual.startConnection?.siteIndex).toBe(0);
      expect(result.nonVisual.endConnection?.shapeId).toBe("3");
      expect(result.nonVisual.endConnection?.siteIndex).toBe(2);
    }
  });
});

// =============================================================================
// parseShapeElement - p:graphicFrame (ECMA-376 Section 19.3.1.21)
// =============================================================================

describe("parseShapeElement - p:graphicFrame (ECMA-376 Section 19.3.1.21)", () => {
  it("parses graphic frame with table", () => {
    const graphicFrame = el("p:graphicFrame", {}, [
      el("p:nvGraphicFramePr", {}, [
        el("p:cNvPr", { id: "13", name: "Table 1" }),
        el("p:cNvGraphicFramePr", {}, [el("a:graphicFrameLocks", { noResize: "1" })]),
        el("p:nvPr"),
      ]),
      el("p:xfrm", {}, [el("a:off", { x: "914400", y: "914400" }), el("a:ext", { cx: "4572000", cy: "2743200" })]),
      el("a:graphic", {}, [
        el("a:graphicData", { uri: "http://schemas.openxmlformats.org/drawingml/2006/table" }, [
          el("a:tbl", {}, [
            el("a:tblGrid", {}, [el("a:gridCol", { w: "2286000" }), el("a:gridCol", { w: "2286000" })]),
            el("a:tr", { h: "914400" }, [
              el("a:tc", {}, [
                el("a:txBody", {}, [
                  el("a:bodyPr"),
                  el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [{ type: "text", value: "Cell 1" }])])]),
                ]),
              ]),
              el("a:tc", {}, [
                el("a:txBody", {}, [
                  el("a:bodyPr"),
                  el("a:p", {}, [el("a:r", {}, [el("a:t", {}, [{ type: "text", value: "Cell 2" }])])]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
    const result = parseShapeElement(graphicFrame);

    expect(result).toBeDefined();
    expect(result?.type).toBe("graphicFrame");
    if (result?.type === "graphicFrame") {
      expect(result.nonVisual.id).toBe("13");
      expect(result.nonVisual.graphicFrameLocks?.noResize).toBe(true);
      expect(result.content.type).toBe("table");
    }
  });

  it("parses graphic frame with chart reference", () => {
    const graphicFrame = el("p:graphicFrame", {}, [
      el("p:nvGraphicFramePr", {}, [
        el("p:cNvPr", { id: "14", name: "Chart 1" }),
        el("p:cNvGraphicFramePr"),
        el("p:nvPr"),
      ]),
      el("p:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "4572000", cy: "2743200" })]),
      el("a:graphic", {}, [
        el("a:graphicData", { uri: "http://schemas.openxmlformats.org/drawingml/2006/chart" }, [
          el("c:chart", { "r:id": "rId5" }),
        ]),
      ]),
    ]);
    const result = parseShapeElement(graphicFrame);

    if (result?.type === "graphicFrame") {
      expect(result.content.type).toBe("chart");
      if (result.content.type === "chart") {
        expect(result.content.data.resourceId).toBe("rId5");
      }
    }
  });

  it("parses graphic frame with diagram", () => {
    const graphicFrame = el("p:graphicFrame", {}, [
      el("p:nvGraphicFramePr", {}, [
        el("p:cNvPr", { id: "15", name: "SmartArt" }),
        el("p:cNvGraphicFramePr"),
        el("p:nvPr"),
      ]),
      el("p:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "4572000", cy: "2743200" })]),
      el("a:graphic", {}, [
        el("a:graphicData", { uri: "http://schemas.openxmlformats.org/drawingml/2006/diagram" }, [
          el("dgm:relIds", {
            "r:dm": "rId6",
            "r:lo": "rId7",
            "r:qs": "rId8",
            "r:cs": "rId9",
          }),
        ]),
      ]),
    ]);
    const result = parseShapeElement(graphicFrame);

    if (result?.type === "graphicFrame") {
      expect(result.content.type).toBe("diagram");
      if (result.content.type === "diagram") {
        expect(result.content.data.dataResourceId).toBe("rId6");
        expect(result.content.data.layoutResourceId).toBe("rId7");
      }
    }
  });

  it("returns undefined for graphicFrame without transform", () => {
    const graphicFrame = el("p:graphicFrame", {}, [
      el("p:nvGraphicFramePr"),
      el("a:graphic", {}, [el("a:graphicData", {}, [el("a:tbl")])]),
    ]);
    const result = parseShapeElement(graphicFrame);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseShapeElement - mc:AlternateContent (ECMA-376 Part 3, Section 10.2.1)
// =============================================================================

describe("parseShapeElement - mc:AlternateContent (ECMA-376 Part 3)", () => {
  it("uses fallback when choice requires unsupported namespace", () => {
    const mcContent = el("mc:AlternateContent", {}, [
      el("mc:Choice", { Requires: "p14" }, [
        el("p:sp", {}, [
          el("p:nvSpPr", {}, [el("p:cNvPr", { id: "20", name: "P14 Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
          el("p:spPr", {}, [
            el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          ]),
        ]),
      ]),
      el("mc:Fallback", {}, [
        el("p:sp", {}, [
          el("p:nvSpPr", {}, [el("p:cNvPr", { id: "21", name: "Fallback Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
          el("p:spPr", {}, [
            el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
          ]),
        ]),
      ]),
    ]);
    const result = parseShapeElement(mcContent);

    expect(result).toBeDefined();
    expect(result?.type).toBe("sp");
    if (result?.type === "sp") {
      expect(result.nonVisual.name).toBe("Fallback Shape");
    }
  });
});

// =============================================================================
// parseShapeTree
// =============================================================================

describe("parseShapeTree", () => {
  it("parses all shapes from shape tree", () => {
    const spTree = el("p:spTree", {}, [
      el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
      el("p:grpSpPr"),
      el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape 1" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]),
      el("p:sp", {}, [
        el("p:nvSpPr", {}, [el("p:cNvPr", { id: "3", name: "Shape 2" }), el("p:cNvSpPr"), el("p:nvPr")]),
        el("p:spPr", {}, [
          el("a:xfrm", {}, [el("a:off", { x: "914400", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
        ]),
      ]),
    ]);
    const result = parseShapeTree(spTree);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("sp");
    expect(result[1].type).toBe("sp");
  });

  it("returns empty array for undefined input", () => {
    const result = parseShapeTree(undefined);
    expect(result).toHaveLength(0);
  });

  it("skips nvGrpSpPr and grpSpPr", () => {
    const spTree = el("p:spTree", {}, [el("p:nvGrpSpPr"), el("p:grpSpPr")]);
    const result = parseShapeTree(spTree);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("parseShapeElement - Edge cases", () => {
  it("returns undefined for unknown element", () => {
    const unknown = el("p:unknown");
    const result = parseShapeElement(unknown);
    expect(result).toBeUndefined();
  });

  it("handles empty nvSpPr gracefully", () => {
    const sp = el("p:sp", {}, [
      el("p:nvSpPr"),
      el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
      ]),
    ]);
    const result = parseShapeElement(sp);

    expect(result?.type).toBe("sp");
    if (result?.type === "sp") {
      expect(result.nonVisual.id).toBe("");
      expect(result.nonVisual.name).toBe("");
    }
  });
});
