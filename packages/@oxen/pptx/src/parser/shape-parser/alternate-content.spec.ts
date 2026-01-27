/**
 * @file Tests for mc:AlternateContent handling in parser
 *
 * Per ECMA-376 Part 3, Section 10.2.1, mc:AlternateContent provides
 * alternative representations for different consumers.
 *
 * @see ECMA-376 Part 3, Section 10.2.1
 */

import type { XmlElement } from "@oxen/xml";

// Import the functions we need to test indirectly through parsing
import { parseShapeTree } from "./index";

/**
 * Helper to create a mock XmlElement
 */
function el(name: string, attrs: Record<string, string> = {}, children: (XmlElement | string)[] = []): XmlElement {
  return {
    type: "element",
    name,
    attrs,
    children: children.map((c) => (typeof c === "string" ? { type: "text", value: c } : c)),
  };
}

describe("mc:AlternateContent handling", () => {
  describe("parseShapeTree with mc:AlternateContent", () => {
    it("uses mc:Choice when Requires is empty (no namespace requirement)", () => {
      // Per ECMA-376 Part 3, 10.2.1: Choice is used when Requires namespaces are supported
      // Empty Requires means no namespace requirement - always supported
      const spTree = el("p:spTree", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
        el("p:grpSpPr"),
        el("mc:AlternateContent", {}, [
          el("mc:Choice", { Requires: "" }, [
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [
                el("p:cNvPr", { id: "2", name: "Shape from Choice" }),
                el("p:cNvSpPr"),
                el("p:nvPr"),
              ]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "100", cy: "100" })]),
                el("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
          el("mc:Fallback", {}, [
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [
                el("p:cNvPr", { id: "2", name: "Shape from Fallback" }),
                el("p:cNvSpPr"),
                el("p:nvPr"),
              ]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "100", cy: "100" })]),
                el("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
        ]),
      ]);

      const shapes = parseShapeTree(spTree);

      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("sp");
      // Empty Requires is supported, so mc:Choice is used
      if (shapes[0]?.type === "sp") {
        expect(shapes[0].nonVisual?.name).toBe("Shape from Choice");
      } else {
        throw new Error("Expected shape to be sp");
      }
    });

    it("uses mc:Fallback when Requires specifies unsupported namespace (a14)", () => {
      // Per ECMA-376 Part 3, 10.2.1: Use Fallback when Requires namespaces are not supported
      // We don't support a14 (DrawingML 2010 extensions)
      const spTree = el("p:spTree", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
        el("p:grpSpPr"),
        el("mc:AlternateContent", {}, [
          el("mc:Choice", { Requires: "a14" }, [
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [
                el("p:cNvPr", { id: "2", name: "Shape from Choice (a14)" }),
                el("p:cNvSpPr"),
                el("p:nvPr"),
              ]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "100", cy: "100" })]),
                el("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
          el("mc:Fallback", {}, [
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [
                el("p:cNvPr", { id: "2", name: "Shape from Fallback" }),
                el("p:cNvSpPr"),
                el("p:nvPr"),
              ]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "100", cy: "100" })]),
                el("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
        ]),
      ]);

      const shapes = parseShapeTree(spTree);

      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("sp");
      // a14 is not supported, so mc:Fallback is used per spec
      if (shapes[0]?.type === "sp") {
        expect(shapes[0].nonVisual?.name).toBe("Shape from Fallback");
      } else {
        throw new Error("Expected shape to be sp");
      }
    });

    it("falls back to mc:Fallback when mc:Choice is empty", () => {
      const spTree = el("p:spTree", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
        el("p:grpSpPr"),
        el("mc:AlternateContent", {}, [
          el("mc:Choice", { Requires: "unsupported" }, []),
          el("mc:Fallback", {}, [
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Fallback Shape" }), el("p:cNvSpPr"), el("p:nvPr")]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "100", cy: "100" })]),
                el("a:prstGeom", { prst: "rect" }),
              ]),
            ]),
          ]),
        ]),
      ]);

      const shapes = parseShapeTree(spTree);

      expect(shapes.length).toBe(1);
      if (shapes[0]?.type === "sp") {
        expect(shapes[0].nonVisual?.name).toBe("Fallback Shape");
      } else {
        throw new Error("Expected shape to be sp");
      }
    });
  });

  describe("p:blipFill with mc:AlternateContent in p:pic", () => {
    it("parses blipFill from mc:Fallback", () => {
      const spTree = el("p:spTree", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
        el("p:grpSpPr"),
        el("p:pic", {}, [
          el("p:nvPicPr", {}, [el("p:cNvPr", { id: "2", name: "Picture" }), el("p:cNvPicPr"), el("p:nvPr")]),
          el("mc:AlternateContent", {}, [
            el("mc:Choice", { Requires: "ma" }, [
              el("p:blipFill", {}, [
                el("a:blip", { "r:embed": "rId3" }), // Mac PDF format
              ]),
            ]),
            el("mc:Fallback", {}, [
              el("p:blipFill", {}, [
                el("a:blip", { "r:embed": "rId4" }), // PNG fallback
                el("a:stretch", {}, [el("a:fillRect")]),
              ]),
            ]),
          ]),
          el("p:spPr", {}, [
            el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "1000", cy: "1000" })]),
            el("a:prstGeom", { prst: "rect" }),
          ]),
        ]),
      ]);

      const shapes = parseShapeTree(spTree);

      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("pic");

      const pic = shapes[0];
      if (pic.type === "pic") {
        // Should use mc:Fallback for cross-platform compatibility
        expect(pic.blipFill.resourceId).toBe("rId4");
      }
    });
  });

  describe("p:oleObj with mc:AlternateContent in a:graphicData", () => {
    it("parses oleObj from mc:Fallback", () => {
      const spTree = el("p:spTree", {}, [
        el("p:nvGrpSpPr", {}, [el("p:cNvPr", { id: "1", name: "" }), el("p:cNvGrpSpPr"), el("p:nvPr")]),
        el("p:grpSpPr"),
        el("p:graphicFrame", {}, [
          el("p:nvGraphicFramePr", {}, [
            el("p:cNvPr", { id: "2", name: "OLE Object" }),
            el("p:cNvGraphicFramePr"),
            el("p:nvPr"),
          ]),
          el("p:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "1000", cy: "1000" })]),
          el("a:graphic", {}, [
            el("a:graphicData", { uri: "http://schemas.openxmlformats.org/presentationml/2006/ole" }, [
              el("mc:AlternateContent", {}, [
                el("mc:Choice", { Requires: "v" }, [
                  el("p:oleObj", {
                    spid: "_x0000_s1033",
                    name: "Worksheet",
                    "r:id": "rId3",
                    progId: "Excel.Sheet.12",
                  }),
                ]),
                el("mc:Fallback", {}, [
                  el(
                    "p:oleObj",
                    {
                      name: "Worksheet",
                      "r:id": "rId3",
                      progId: "Excel.Sheet.12",
                    },
                    [
                      el("p:embed", { followColorScheme: "textAndBackground" }),
                      el("p:pic", {}, [
                        el("p:nvPicPr", {}, [el("p:cNvPr", { id: "0", name: "" }), el("p:cNvPicPr"), el("p:nvPr")]),
                        el("p:blipFill", {}, [el("a:blip", { "r:embed": "rId4" })]),
                        el("p:spPr", {}, [
                          el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "1000", cy: "1000" })]),
                        ]),
                      ]),
                    ],
                  ),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]);

      const shapes = parseShapeTree(spTree);

      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("graphicFrame");

      const frame = shapes[0];
      if (frame.type === "graphicFrame") {
        expect(frame.content.type).toBe("oleObject");
        if (frame.content.type === "oleObject") {
          // Should use mc:Fallback for cross-platform compatibility
          expect(frame.content.data.progId).toBe("Excel.Sheet.12");
          expect(frame.content.data.name).toBe("Worksheet");
          expect(frame.content.data.followColorScheme).toBe("textAndBackground");
        }
      }
    });
  });
});
