/**
 * @file Tests for geometry parsing
 *
 * ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 * This section defines shape geometry elements.
 *
 * Key elements:
 * - a:prstGeom (20.1.9.18) - Preset geometry
 * - a:custGeom (20.1.9.8) - Custom geometry
 * - a:pathLst (20.1.9.16) - Path list
 * - a:path (20.1.9.15) - Path
 * - a:avLst (20.1.9.5) - Adjust value list
 * - a:gdLst (20.1.9.11) - Guide list
 * - a:cxnLst (20.1.9.7) - Connection site list
 * - a:ahLst (20.1.9.1) - Adjust handle list
 *
 * Path commands:
 * - a:moveTo - Move to point
 * - a:lnTo - Line to point
 * - a:arcTo (20.1.9.1) - Arc to
 * - a:quadBezTo - Quadratic bezier
 * - a:cubicBezTo - Cubic bezier
 * - a:close - Close path
 *
 * @see ECMA-376 Part 1, Section 20.1.9
 */

import type { XmlElement } from "../../../xml/index";
import { parseGeometry } from "./geometry-parser";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// Preset Geometry (ECMA-376 Section 20.1.9.18)
// =============================================================================

describe("parseGeometry - a:prstGeom (ECMA-376 Section 20.1.9.18)", () => {
  describe("Common preset shapes", () => {
    it("parses rect preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "rect" })]);
      const result = parseGeometry(spPr);

      expect(result).toBeDefined();
      expect(result?.type).toBe("preset");
      if (result?.type === "preset") {
        expect(result.preset).toBe("rect");
      }
    });

    it("parses roundRect preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "roundRect" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.preset).toBe("roundRect");
      }
    });

    it("parses ellipse preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "ellipse" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.preset).toBe("ellipse");
      }
    });

    it("parses triangle preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "triangle" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.preset).toBe("triangle");
      }
    });

    it("parses line preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "line" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.preset).toBe("line");
      }
    });

    it("parses arrow preset", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "rightArrow" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.preset).toBe("rightArrow");
      }
    });
  });

  describe("Adjust values (a:avLst - Section 20.1.9.5)", () => {
    it("parses preset with adjust values", () => {
      const spPr = el("p:spPr", {}, [
        el("a:prstGeom", { prst: "roundRect" }, [el("a:avLst", {}, [el("a:gd", { name: "adj", fmla: "val 16667" })])]),
      ]);
      const result = parseGeometry(spPr);

      expect(result?.type).toBe("preset");
      if (result?.type === "preset") {
        expect(result.adjustValues).toHaveLength(1);
        expect(result.adjustValues[0].name).toBe("adj");
        expect(result.adjustValues[0].value).toBe(16667);
      }
    });

    it("parses preset with multiple adjust values", () => {
      const spPr = el("p:spPr", {}, [
        el("a:prstGeom", { prst: "star5" }, [
          el("a:avLst", {}, [
            el("a:gd", { name: "adj", fmla: "val 19098" }),
            el("a:gd", { name: "hf", fmla: "val 105146" }),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.adjustValues).toHaveLength(2);
      }
    });

    it("returns empty adjust values when avLst missing", () => {
      const spPr = el("p:spPr", {}, [el("a:prstGeom", { prst: "rect" })]);
      const result = parseGeometry(spPr);

      if (result?.type === "preset") {
        expect(result.adjustValues).toHaveLength(0);
      }
    });
  });

  it("returns undefined when prst attribute missing", () => {
    const spPr = el("p:spPr", {}, [el("a:prstGeom", {})]);
    const result = parseGeometry(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Custom Geometry (ECMA-376 Section 20.1.9.8)
// =============================================================================

describe("parseGeometry - a:custGeom (ECMA-376 Section 20.1.9.8)", () => {
  describe("Path list (a:pathLst - Section 20.1.9.16)", () => {
    it("parses custom geometry with single path", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "914400", h: "914400" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:lnTo", {}, [el("a:pt", { x: "914400", y: "0" })]),
              el("a:lnTo", {}, [el("a:pt", { x: "914400", y: "914400" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      expect(result).toBeDefined();
      expect(result?.type).toBe("custom");
      if (result?.type === "custom") {
        expect(result.paths).toHaveLength(1);
        expect(result.paths[0].commands).toHaveLength(4);
      }
    });

    it("parses custom geometry with multiple paths", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "914400", h: "914400" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
            el("a:path", { w: "914400", h: "914400" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "100", y: "100" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths).toHaveLength(2);
      }
    });

    it("returns undefined when pathLst missing", () => {
      const spPr = el("p:spPr", {}, [el("a:custGeom", {})]);
      const result = parseGeometry(spPr);
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty pathLst", () => {
      const spPr = el("p:spPr", {}, [el("a:custGeom", {}, [el("a:pathLst")])]);
      const result = parseGeometry(spPr);
      expect(result).toBeUndefined();
    });
  });

  describe("Adjust handles (a:ahLst - Section 20.1.9.1)", () => {
    it("parses XY and polar adjust handles", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:ahLst", {}, [
            el("a:ahXY", { gdRefX: "adjX", gdRefY: "adjY", minX: "0", maxX: "100000" }, [
              el("a:pos", { x: "0", y: "0" }),
            ]),
            el(
              "a:ahPolar",
              {
                gdRefAng: "adjAng",
                gdRefR: "adjR",
                minAng: "adjMinAng",
                maxAng: "10800000",
                minR: "0",
                maxR: "200000",
              },
              [el("a:pos", { x: "914400", y: "0" })],
            ),
          ]),
          el("a:pathLst", {}, [
            el("a:path", { w: "914400", h: "914400" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);

      const result = parseGeometry(spPr);
      expect(result?.type).toBe("custom");
      if (result?.type === "custom") {
        expect(result.adjustHandles).toHaveLength(2);
        expect(result.adjustHandles[0]?.type).toBe("xy");
        const handle = result.adjustHandles[1];
        if (handle?.type === "polar") {
          expect(handle.minAngle).toBe("adjMinAng");
        } else {
          throw new Error("Expected polar adjust handle");
        }
      }
    });

    it("returns empty handles when ahLst is missing", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "914400", h: "914400" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);

      const result = parseGeometry(spPr);
      if (result?.type === "custom") {
        expect(result.adjustHandles).toHaveLength(0);
      }
    });
  });

  describe("Path attributes (a:path - Section 20.1.9.15)", () => {
    it("parses path width and height", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "914400", h: "457200" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths[0].width).toBeCloseTo(96, 0);
        expect(result.paths[0].height).toBeCloseTo(48, 0);
      }
    });

    it("parses path fill mode", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100", fill: "none" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths[0].fill).toBe("none");
      }
    });

    it("parses path stroke attribute", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100", stroke: "0" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths[0].stroke).toBe(false);
      }
    });

    it("defaults stroke to true", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths[0].stroke).toBe(true);
      }
    });

    it("defaults fill to 'norm'", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.paths[0].fill).toBe("norm");
      }
    });
  });

  describe("Path commands", () => {
    it("parses moveTo command", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "914400", y: "457200" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[0];
        expect(cmd.type).toBe("moveTo");
        if (cmd.type === "moveTo") {
          expect(cmd.point.x).toBeCloseTo(96, 0);
          expect(cmd.point.y).toBeCloseTo(48, 0);
        }
      }
    });

    it("parses lineTo command", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:lnTo", {}, [el("a:pt", { x: "914400", y: "914400" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[1];
        expect(cmd.type).toBe("lineTo");
        if (cmd.type === "lineTo") {
          expect(cmd.point.x).toBeCloseTo(96, 0);
          expect(cmd.point.y).toBeCloseTo(96, 0);
        }
      }
    });

    it("parses arcTo command (ECMA-376 Section 20.1.9.1)", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:arcTo", {
                wR: "457200", // Width radius
                hR: "457200", // Height radius
                stAng: "0", // Start angle
                swAng: "5400000", // Swing angle (90 degrees)
              }),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[1];
        expect(cmd.type).toBe("arcTo");
        if (cmd.type === "arcTo") {
          expect(cmd.widthRadius).toBeCloseTo(48, 0);
          expect(cmd.heightRadius).toBeCloseTo(48, 0);
          expect(cmd.startAngle).toBe(0);
          expect(cmd.swingAngle).toBe(90);
        }
      }
    });

    it("parses quadBezTo command", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:quadBezTo", {}, [
                el("a:pt", { x: "457200", y: "0" }), // Control point
                el("a:pt", { x: "914400", y: "914400" }), // End point
              ]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[1];
        expect(cmd.type).toBe("quadBezierTo");
        if (cmd.type === "quadBezierTo") {
          expect(cmd.control.x).toBeCloseTo(48, 0);
          expect(cmd.end.x).toBeCloseTo(96, 0);
        }
      }
    });

    it("parses cubicBezTo command", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:cubicBezTo", {}, [
                el("a:pt", { x: "228600", y: "0" }), // Control 1
                el("a:pt", { x: "685800", y: "914400" }), // Control 2
                el("a:pt", { x: "914400", y: "914400" }), // End point
              ]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[1];
        expect(cmd.type).toBe("cubicBezierTo");
        if (cmd.type === "cubicBezierTo") {
          expect(cmd.control1.x).toBeCloseTo(24, 0);
          expect(cmd.control2.x).toBeCloseTo(72, 0);
          expect(cmd.end.x).toBeCloseTo(96, 0);
        }
      }
    });

    it("parses close command", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [
              el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]),
              el("a:lnTo", {}, [el("a:pt", { x: "100", y: "100" })]),
              el("a:close"),
            ]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        const cmd = result.paths[0].commands[2];
        expect(cmd.type).toBe("close");
      }
    });
  });

  describe("Guides (a:gdLst - Section 20.1.9.11)", () => {
    it("parses geometry guides", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:gdLst", {}, [
            el("a:gd", { name: "g0", fmla: "+/ w 1 2" }),
            el("a:gd", { name: "g1", fmla: "+/ h 1 2" }),
          ]),
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.guides).toHaveLength(2);
        expect(result.guides[0].name).toBe("g0");
        expect(result.guides[0].formula).toBe("+/ w 1 2");
      }
    });
  });

  describe("Connection sites (a:cxnLst - Section 20.1.9.7)", () => {
    it("parses connection sites", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:cxnLst", {}, [
            el("a:cxn", { ang: "0" }, [el("a:pos", { x: "914400", y: "457200" })]),
            el("a:cxn", { ang: "5400000" }, [
              // 90 degrees
              el("a:pos", { x: "457200", y: "914400" }),
            ]),
          ]),
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.connectionSites).toHaveLength(2);
        expect(result.connectionSites[0].angle).toBe(0);
        expect(result.connectionSites[0].position.x).toBeCloseTo(96, 0);
        expect(result.connectionSites[1].angle).toBe(90);
      }
    });
  });

  describe("Text rectangle (a:rect - Section 20.1.9.22)", () => {
    it("parses text rectangle", () => {
      const spPr = el("p:spPr", {}, [
        el("a:custGeom", {}, [
          el("a:rect", { l: "l", t: "t", r: "r", b: "b" }),
          el("a:pathLst", {}, [
            el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
          ]),
        ]),
      ]);
      const result = parseGeometry(spPr);

      if (result?.type === "custom") {
        expect(result.textRect).toBeDefined();
        expect(result.textRect?.left).toBe("l");
        expect(result.textRect?.top).toBe("t");
        expect(result.textRect?.right).toBe("r");
        expect(result.textRect?.bottom).toBe("b");
      }
    });
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("parseGeometry - Edge cases", () => {
  it("returns undefined for undefined input", () => {
    const result = parseGeometry(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no geometry element present", () => {
    const spPr = el("p:spPr", {}, [el("a:solidFill")]);
    const result = parseGeometry(spPr);
    expect(result).toBeUndefined();
  });

  it("prefers prstGeom over custGeom when both present", () => {
    const spPr = el("p:spPr", {}, [
      el("a:prstGeom", { prst: "rect" }),
      el("a:custGeom", {}, [
        el("a:pathLst", {}, [
          el("a:path", { w: "100", h: "100" }, [el("a:moveTo", {}, [el("a:pt", { x: "0", y: "0" })]), el("a:close")]),
        ]),
      ]),
    ]);
    const result = parseGeometry(spPr);

    expect(result?.type).toBe("preset");
  });

  it("handles path with missing point in moveTo", () => {
    const spPr = el("p:spPr", {}, [
      el("a:custGeom", {}, [
        el("a:pathLst", {}, [
          el("a:path", { w: "100", h: "100" }, [
            el("a:moveTo"), // No point
            el("a:close"),
          ]),
        ]),
      ]),
    ]);
    const result = parseGeometry(spPr);

    if (result?.type === "custom") {
      // moveTo without point should be skipped
      expect(result.paths[0].commands).toHaveLength(1);
      expect(result.paths[0].commands[0].type).toBe("close");
    }
  });
});
