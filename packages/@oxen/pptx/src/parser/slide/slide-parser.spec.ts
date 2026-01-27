/**
 * @file Tests for slide parsing
 *
 * ECMA-376 Part 1, Section 19.3 - Presentation ML
 * This section defines the structure of slides, slide layouts, and slide masters.
 *
 * Main elements tested:
 * - p:sld (19.3.1.38) - Presentation slide
 * - p:sldLayout (19.3.1.39) - Slide layout
 * - p:sldMaster (19.3.1.41) - Slide master
 * - p:bg (19.3.1.1) - Background
 * - p:transition (19.5) - Slide transition
 * - p:clrMapOvr (19.3.1.6) - Color map override
 *
 * @see ECMA-376 Part 1, Section 19.3
 */

import type { XmlElement, XmlDocument } from "@oxen/xml";
import {
  parseBackground,
  parseTransition,
  parseColorMapOverride,
  parseCustomerDataList,
  parseHandoutMaster,
  parseNotesMaster,
  parseSlide,
  parseSlideLayout,
  parseSlideLayoutIdList,
  parseSlideMaster,
} from "./slide-parser";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// Helper to create mock XmlDocument
function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

// =============================================================================
// parseBackground - p:bg (ECMA-376 Section 19.3.1.1)
// =============================================================================

describe("parseBackground - p:bg (ECMA-376 Section 19.3.1.1)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseBackground(undefined)).toBeUndefined();
  });

  it("parses background with solid fill from p:bgPr", () => {
    const bg = el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])])]);
    const result = parseBackground(bg);

    expect(result).toBeDefined();
    expect(result?.fill).toBeDefined();
    expect(result?.fill?.type).toBe("solidFill");
  });

  it("parses shadeToTitle attribute", () => {
    const bg = el("p:bg", {}, [
      el("p:bgPr", { shadeToTitle: "1" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "0000FF" })])]),
    ]);
    const result = parseBackground(bg);

    expect(result?.shadeToTitle).toBe(true);
  });

  it("parses background with gradient fill", () => {
    const bg = el("p:bg", {}, [
      el("p:bgPr", {}, [
        el("a:gradFill", {}, [
          el("a:gsLst", {}, [
            el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
            el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
          ]),
        ]),
      ]),
    ]);
    const result = parseBackground(bg);

    expect(result?.fill?.type).toBe("gradientFill");
  });

  it("parses background reference (p:bgRef)", () => {
    const bg = el("p:bg", {}, [el("p:bgRef", { idx: "1001" }, [el("a:schemeClr", { val: "accent1" })])]);
    const result = parseBackground(bg);

    // bgRef needs theme context, but should still try to parse fill
    // May return undefined if no direct fill is available
    expect(result === undefined || result?.fill !== undefined).toBe(true);
  });

  it("returns undefined for empty background", () => {
    const bg = el("p:bg", {}, []);
    const result = parseBackground(bg);

    expect(result).toBeUndefined();
  });

  it("returns undefined when bgPr has no fill", () => {
    const bg = el("p:bg", {}, [el("p:bgPr", {})]);
    const result = parseBackground(bg);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseTransition - p:transition (ECMA-376 Section 19.5)
// =============================================================================

describe("parseTransition - p:transition (ECMA-376 Section 19.5)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseTransition(undefined)).toBeUndefined();
  });

  it("parses fade transition", () => {
    const transition = el("p:transition", { spd: "med" }, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result).toBeDefined();
    expect(result?.type).toBe("fade");
    expect(result?.duration).toBe(1000); // med = 1000ms
  });

  it("parses blinds transition", () => {
    const transition = el("p:transition", {}, [el("p:blinds", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("blinds");
  });

  it("parses wipe transition", () => {
    const transition = el("p:transition", {}, [el("p:wipe", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("wipe");
  });

  it("parses dissolve transition", () => {
    const transition = el("p:transition", {}, [el("p:dissolve", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("dissolve");
  });

  it("parses push transition", () => {
    const transition = el("p:transition", {}, [el("p:push", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("push");
  });

  it("handles slow speed", () => {
    const transition = el("p:transition", { spd: "slow" }, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.duration).toBe(2000);
  });

  it("handles fast speed (default)", () => {
    const transition = el("p:transition", { spd: "fast" }, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.duration).toBe(500);
  });

  it("defaults to fast speed when not specified", () => {
    const transition = el("p:transition", {}, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.duration).toBe(500);
  });

  it("parses advanceOnClick attribute (default true)", () => {
    const transition = el("p:transition", { advClick: "0" }, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.advanceOnClick).toBe(false);
  });

  it("defaults advanceOnClick to true", () => {
    const transition = el("p:transition", {}, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.advanceOnClick).toBe(true);
  });

  it("parses advanceAfter time in ms", () => {
    const transition = el("p:transition", { advTm: "5000" }, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.advanceAfter).toBe(5000);
  });

  it("returns undefined for advanceAfter when not specified", () => {
    const transition = el("p:transition", {}, [el("p:fade", {})]);
    const result = parseTransition(transition);

    expect(result?.advanceAfter).toBeUndefined();
  });

  it("parses transition sound", () => {
    const transition = el("p:transition", {}, [
      el("p:fade", {}),
      el("p:sndAc", {}, [
        el("p:stSnd", { loop: "1" }, [
          el("p:snd", { "r:embed": "rId2", name: "whoosh.wav" }),
        ])
      ])
    ]);
    const result = parseTransition(transition);

    expect(result?.sound).toEqual({
      resourceId: "rId2",
      name: "whoosh.wav",
      loop: true,
    });
  });

  it("parses checker transition", () => {
    const transition = el("p:transition", {}, [el("p:checker", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("checker");
  });

  it("parses circle transition", () => {
    const transition = el("p:transition", {}, [el("p:circle", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("circle");
  });

  it("parses comb transition", () => {
    const transition = el("p:transition", {}, [el("p:comb", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("comb");
  });

  it("parses cover transition", () => {
    const transition = el("p:transition", {}, [el("p:cover", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("cover");
  });

  it("parses cut transition", () => {
    const transition = el("p:transition", {}, [el("p:cut", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("cut");
  });

  it("parses diamond transition", () => {
    const transition = el("p:transition", {}, [el("p:diamond", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("diamond");
  });

  it("parses random transition", () => {
    const transition = el("p:transition", {}, [el("p:random", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("random");
  });

  it("parses split transition", () => {
    const transition = el("p:transition", {}, [el("p:split", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("split");
  });

  it("parses wedge transition", () => {
    const transition = el("p:transition", {}, [el("p:wedge", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("wedge");
  });

  it("parses wheel transition", () => {
    const transition = el("p:transition", {}, [el("p:wheel", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("wheel");
  });

  it("parses zoom transition", () => {
    const transition = el("p:transition", {}, [el("p:zoom", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("zoom");
  });

  it("defaults type to none when no transition element", () => {
    const transition = el("p:transition", {}, []);
    const result = parseTransition(transition);

    expect(result?.type).toBe("none");
  });

  it("ignores unknown transition types", () => {
    const transition = el("p:transition", {}, [el("p:unknownTransition", {})]);
    const result = parseTransition(transition);

    expect(result?.type).toBe("none");
  });
});

// =============================================================================
// parseCustomerDataList - p:custDataLst (ECMA-376 Section 19.3.1.18)
// =============================================================================

describe("parseCustomerDataList - p:custDataLst (ECMA-376 Section 19.3.1.18)", () => {
  it("parses customer data entries", () => {
    const custDataLst = el("p:custDataLst", {}, [
      el("p:custData", { "r:id": "rId1" }),
      el("p:custData", { "r:id": "rId2" }),
    ]);
    const result = parseCustomerDataList(custDataLst);
    expect(result).toHaveLength(2);
    expect(result?.[0].rId).toBe("rId1");
  });

  it("returns undefined for empty list", () => {
    const custDataLst = el("p:custDataLst", {}, []);
    expect(parseCustomerDataList(custDataLst)).toBeUndefined();
  });
});

// =============================================================================
// parseColorMapOverride - p:clrMapOvr (ECMA-376 Section 19.3.1.6)
// =============================================================================

describe("parseColorMapOverride - p:clrMapOvr (ECMA-376 Section 19.3.1.6)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseColorMapOverride(undefined)).toBeUndefined();
  });

  it("parses master color mapping (no override)", () => {
    const clrMapOvr = el("p:clrMapOvr", {}, [el("a:masterClrMapping", {})]);
    const result = parseColorMapOverride(clrMapOvr);

    expect(result).toBeDefined();
    expect(result?.type).toBe("none");
  });

  it("parses override color mapping", () => {
    const clrMapOvr = el("p:clrMapOvr", {}, [
      el("a:overrideClrMapping", {
        bg1: "lt1",
        tx1: "dk1",
        bg2: "lt2",
        tx2: "dk2",
        accent1: "accent1",
        accent2: "accent2",
        accent3: "accent3",
        accent4: "accent4",
        accent5: "accent5",
        accent6: "accent6",
        hlink: "hlink",
        folHlink: "folHlink",
      }),
    ]);
    const result = parseColorMapOverride(clrMapOvr);

    expect(result?.type).toBe("override");
    if (!result || result.type !== "override") {
      throw new Error("Expected override color mapping");
    }
    expect(result.mappings.bg1).toBe("lt1");
    expect(result.mappings.tx1).toBe("dk1");
    expect(result.mappings.accent1).toBe("accent1");
    expect(result.mappings.hlink).toBe("hlink");
  });

  it("handles partial override mappings", () => {
    const clrMapOvr = el("p:clrMapOvr", {}, [
      el("a:overrideClrMapping", {
        bg1: "lt2",
        tx1: "dk2",
      }),
    ]);
    const result = parseColorMapOverride(clrMapOvr);

    expect(result?.type).toBe("override");
    if (!result || result.type !== "override") {
      throw new Error("Expected override color mapping");
    }
    expect(result.mappings.bg1).toBe("lt2");
    expect(result.mappings.tx1).toBe("dk2");
    expect(result.mappings.accent1).toBeUndefined();
  });

  it("returns undefined for empty clrMapOvr", () => {
    const clrMapOvr = el("p:clrMapOvr", {}, []);
    const result = parseColorMapOverride(clrMapOvr);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseSlide - p:sld (ECMA-376 Section 19.3.1.38)
// =============================================================================

describe("parseSlide - p:sld (ECMA-376 Section 19.3.1.38)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseSlide(undefined)).toBeUndefined();
  });

  it("returns undefined when p:sld is missing", () => {
    const content = doc(el("invalid", {}));
    expect(parseSlide(content)).toBeUndefined();
  });

  it("returns undefined when p:cSld is missing", () => {
    const content = doc(el("p:sld", {}));
    expect(parseSlide(content)).toBeUndefined();
  });

  it("parses minimal slide structure", () => {
    const content = doc(el("p:sld", {}, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlide(content);

    expect(result).toBeDefined();
    expect(result?.shapes).toBeDefined();
  });

  it("parses slide with background", () => {
    const content = doc(
      el("p:sld", {}, [
        el("p:cSld", {}, [
          el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FFFFFF" })])])]),
          el("p:spTree", {}),
        ]),
      ]),
    );
    const result = parseSlide(content);

    expect(result?.background).toBeDefined();
    expect(result?.background?.fill?.type).toBe("solidFill");
  });

  it("parses slide customer data list", () => {
    const content = doc(
      el("p:sld", {}, [
        el("p:cSld", {}, [
          el("p:spTree", {}),
          el("p:custDataLst", {}, [el("p:custData", { "r:id": "rId9" })]),
        ]),
      ]),
    );
    const result = parseSlide(content);

    expect(result?.customerData?.[0].rId).toBe("rId9");
  });

  it("parses slide with transition", () => {
    const content = doc(
      el("p:sld", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:transition", { spd: "slow" }, [el("p:fade", {})]),
      ]),
    );
    const result = parseSlide(content);

    expect(result?.transition).toBeDefined();
    expect(result?.transition?.type).toBe("fade");
    expect(result?.transition?.duration).toBe(2000);
  });

  it("parses slide transition from mc:AlternateContent fallback", () => {
    const content = doc(
      el("p:sld", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("mc:AlternateContent", {}, [
          el("mc:Choice", { Requires: "p14" }, [
            el("p:transition", { spd: "slow" }, [el("p:fade", {})]),
          ]),
          el("mc:Fallback", {}, [
            el("p:transition", { spd: "med" }, [el("p:push", {})]),
          ]),
        ]),
      ]),
    );
    const result = parseSlide(content);

    expect(result?.transition?.type).toBe("push");
    expect(result?.transition?.duration).toBe(1000);
  });

  it("parses slide with color map override", () => {
    const content = doc(
      el("p:sld", {}, [el("p:cSld", {}, [el("p:spTree", {})]), el("p:clrMapOvr", {}, [el("a:masterClrMapping", {})])]),
    );
    const result = parseSlide(content);

    expect(result?.colorMapOverride).toBeDefined();
    expect(result?.colorMapOverride?.type).toBe("none");
  });

  it("parses showMasterSp attribute", () => {
    const content = doc(el("p:sld", { showMasterSp: "0" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlide(content);

    expect(result?.showMasterShapes).toBe(false);
  });

  it("parses showMasterPhAnim attribute", () => {
    const content = doc(el("p:sld", { showMasterPhAnim: "1" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlide(content);

    expect(result?.showMasterPhAnim).toBe(true);
  });

  it("parses shapes from spTree", () => {
    const content = doc(
      el("p:sld", {}, [
        el("p:cSld", {}, [
          el("p:spTree", {}, [
            el("p:nvGrpSpPr", {}),
            el("p:grpSpPr", {}),
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [el("p:cNvPr", { id: "2", name: "Shape 1" }), el("p:cNvSpPr", {}), el("p:nvPr", {})]),
              el("p:spPr", {}, [
                el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]),
              ]),
            ]),
          ]),
        ]),
      ]),
    );
    const result = parseSlide(content);

    expect(result?.shapes).toBeDefined();
    expect(result?.shapes?.length).toBeGreaterThan(0);
  });

});

// =============================================================================
// parseSlideLayoutIdList - p:sldLayoutIdLst (ECMA-376 Section 19.3.1.41)
// =============================================================================

describe("parseSlideLayoutIdList - p:sldLayoutIdLst (ECMA-376 Section 19.3.1.41)", () => {
  it("parses empty list", () => {
    const result = parseSlideLayoutIdList(el("p:sldLayoutIdLst", {}, []));
    expect(result).toEqual([]);
  });

  it("parses sldLayoutId entries", () => {
    const list = el("p:sldLayoutIdLst", {}, [el("p:sldLayoutId", { id: "2147483648", "r:id": "rId3" })]);
    const result = parseSlideLayoutIdList(list);

    expect(result).toEqual([{ id: 2147483648, rId: "rId3" }]);
  });
});

// =============================================================================
// parseHandoutMaster - p:handoutMaster (ECMA-376 Section 19.3.1.24)
// =============================================================================

describe("parseHandoutMaster - p:handoutMaster (ECMA-376 Section 19.3.1.24)", () => {
  it("returns undefined when p:handoutMaster is missing", () => {
    expect(parseHandoutMaster(doc(el("invalid", {})))).toBeUndefined();
  });

  it("parses minimal handout master", () => {
    const content = doc(el("p:handoutMaster", {}, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseHandoutMaster(content);

    expect(result).toBeDefined();
    expect(result?.shapes).toBeDefined();
  });
});

// =============================================================================
// parseNotesMaster - p:notesMaster (ECMA-376 Section 19.3.1.27)
// =============================================================================

describe("parseNotesMaster - p:notesMaster (ECMA-376 Section 19.3.1.27)", () => {
  it("returns undefined when p:notesMaster is missing", () => {
    expect(parseNotesMaster(doc(el("invalid", {})))).toBeUndefined();
  });

  it("parses notes master with notesStyle", () => {
    const content = doc(
      el("p:notesMaster", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:notesStyle", {}, [el("a:lvl1pPr", {}, [el("a:defRPr", { sz: "2000" })])]),
      ]),
    );
    const result = parseNotesMaster(content);

    expect(result?.notesStyle?.level1?.defaultRunProperties?.fontSize).toBe(20);
  });
});

// =============================================================================
// parseSlideLayout - p:sldLayout (ECMA-376 Section 19.3.1.39)
// =============================================================================

describe("parseSlideLayout - p:sldLayout (ECMA-376 Section 19.3.1.39)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseSlideLayout(undefined)).toBeUndefined();
  });

  it("returns undefined when p:sldLayout is missing", () => {
    const content = doc(el("invalid", {}));
    expect(parseSlideLayout(content)).toBeUndefined();
  });

  it("returns undefined when p:cSld is missing", () => {
    const content = doc(el("p:sldLayout", {}));
    expect(parseSlideLayout(content)).toBeUndefined();
  });

  it("parses minimal slide layout", () => {
    const content = doc(el("p:sldLayout", {}, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result).toBeDefined();
    expect(result?.type).toBe("blank"); // default
  });

  it("parses layout type attribute", () => {
    const content = doc(el("p:sldLayout", { type: "title" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.type).toBe("title");
  });

  it("parses titleOnly layout type", () => {
    const content = doc(el("p:sldLayout", { type: "titleOnly" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.type).toBe("titleOnly");
  });

  it("parses obj layout type", () => {
    const content = doc(el("p:sldLayout", { type: "obj" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.type).toBe("obj");
  });

  it("parses name from cSld", () => {
    const content = doc(el("p:sldLayout", {}, [el("p:cSld", { name: "Title Slide" }, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.name).toBe("Title Slide");
  });

  it("parses matchingName attribute", () => {
    const content = doc(el("p:sldLayout", { matchingName: "TitleSlide" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.matchingName).toBe("TitleSlide");
  });

  it("parses layout customer data list", () => {
    const content = doc(
      el("p:sldLayout", {}, [
        el("p:cSld", {}, [
          el("p:spTree", {}),
          el("p:custDataLst", {}, [el("p:custData", { "r:id": "rId3" })]),
        ]),
      ]),
    );
    const result = parseSlideLayout(content);

    expect(result?.customerData?.[0].rId).toBe("rId3");
  });

  it("parses preserve attribute", () => {
    const content = doc(el("p:sldLayout", { preserve: "1" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.preserve).toBe(true);
  });

  it("parses userDrawn attribute", () => {
    const content = doc(el("p:sldLayout", { userDrawn: "1" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.userDrawn).toBe(true);
  });

  it("parses showMasterSp attribute", () => {
    const content = doc(el("p:sldLayout", { showMasterSp: "0" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.showMasterShapes).toBe(false);
  });

  it("parses showMasterPhAnim attribute", () => {
    const content = doc(el("p:sldLayout", { showMasterPhAnim: "1" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideLayout(content);

    expect(result?.showMasterPhAnim).toBe(true);
  });

  it("parses background", () => {
    const content = doc(
      el("p:sldLayout", {}, [
        el("p:cSld", {}, [
          el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])])]),
          el("p:spTree", {}),
        ]),
      ]),
    );
    const result = parseSlideLayout(content);

    expect(result?.background).toBeDefined();
  });

  it("parses transition", () => {
    const content = doc(
      el("p:sldLayout", {}, [el("p:cSld", {}, [el("p:spTree", {})]), el("p:transition", {}, [el("p:wipe", {})])]),
    );
    const result = parseSlideLayout(content);

    expect(result?.transition?.type).toBe("wipe");
  });

  it("parses transition from mc:AlternateContent fallback", () => {
    const content = doc(
      el("p:sldLayout", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("mc:AlternateContent", {}, [
          el("mc:Choice", { Requires: "p14" }, [
            el("p:transition", {}, [el("p:fade", {})]),
          ]),
          el("mc:Fallback", {}, [
            el("p:transition", {}, [el("p:wheel", {})]),
          ]),
        ]),
      ]),
    );
    const result = parseSlideLayout(content);

    expect(result?.transition?.type).toBe("wheel");
  });

  it("parses color map override", () => {
    const content = doc(
      el("p:sldLayout", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:clrMapOvr", {}, [el("a:overrideClrMapping", { bg1: "lt2" })]),
      ]),
    );
    const result = parseSlideLayout(content);

    expect(result?.colorMapOverride?.type).toBe("override");
  });
});

// =============================================================================
// parseSlideMaster - p:sldMaster (ECMA-376 Section 19.3.1.41)
// =============================================================================

describe("parseSlideMaster - p:sldMaster (ECMA-376 Section 19.3.1.41)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseSlideMaster(undefined)).toBeUndefined();
  });

  it("returns undefined when p:sldMaster is missing", () => {
    const content = doc(el("invalid", {}));
    expect(parseSlideMaster(content)).toBeUndefined();
  });

  it("returns undefined when p:cSld is missing", () => {
    const content = doc(el("p:sldMaster", {}));
    expect(parseSlideMaster(content)).toBeUndefined();
  });

  it("parses minimal slide master", () => {
    const content = doc(el("p:sldMaster", {}, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideMaster(content);

    expect(result).toBeDefined();
    expect(result?.shapes).toBeDefined();
  });

  it("parses color map", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:clrMap", {
          bg1: "lt1",
          tx1: "dk1",
          bg2: "lt2",
          tx2: "dk2",
          accent1: "accent1",
          accent2: "accent2",
          accent3: "accent3",
          accent4: "accent4",
          accent5: "accent5",
          accent6: "accent6",
          hlink: "hlink",
          folHlink: "folHlink",
        }),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.colorMap).toBeDefined();
    expect(result?.colorMap?.bg1).toBe("lt1");
    expect(result?.colorMap?.tx1).toBe("dk1");
    expect(result?.colorMap?.accent1).toBe("accent1");
  });

  it("parses master customer data list", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [
          el("p:spTree", {}),
          el("p:custDataLst", {}, [el("p:custData", { "r:id": "rId7" })]),
        ]),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.customerData?.[0].rId).toBe("rId7");
  });

  it("defaults to empty color map when not present", () => {
    const content = doc(el("p:sldMaster", {}, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideMaster(content);

    expect(result?.colorMap).toEqual({});
  });

  it("parses preserve attribute", () => {
    const content = doc(el("p:sldMaster", { preserve: "1" }, [el("p:cSld", {}, [el("p:spTree", {})])]));
    const result = parseSlideMaster(content);

    expect(result?.preserve).toBe(true);
  });

  it("parses background", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [
          el("p:bg", {}, [
            el("p:bgPr", {}, [
              el("a:gradFill", {}, [
                el("a:gsLst", {}, [
                  el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FFFFFF" })]),
                  el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "000000" })]),
                ]),
              ]),
            ]),
          ]),
          el("p:spTree", {}),
        ]),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.background).toBeDefined();
    expect(result?.background?.fill?.type).toBe("gradientFill");
  });

  it("parses transition", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:transition", { spd: "med" }, [el("p:dissolve", {})]),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.transition?.type).toBe("dissolve");
    expect(result?.transition?.duration).toBe(1000);
  });

  it("parses shapes from spTree", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [
          el("p:spTree", {}, [
            el("p:nvGrpSpPr", {}),
            el("p:grpSpPr", {}),
            el("p:sp", {}, [
              el("p:nvSpPr", {}, [
                el("p:cNvPr", { id: "2", name: "Background Shape" }),
                el("p:cNvSpPr", {}),
                el("p:nvPr", {}),
              ]),
              el("p:spPr", {}),
            ]),
          ]),
        ]),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.shapes).toBeDefined();
    expect(result?.shapes?.length).toBeGreaterThan(0);
  });

  it("parses slide layout ID list", () => {
    const content = doc(
      el("p:sldMaster", {}, [
        el("p:cSld", {}, [el("p:spTree", {})]),
        el("p:sldLayoutIdLst", {}, [
          el("p:sldLayoutId", { id: "2147483648", "r:id": "rId1" }),
          el("p:sldLayoutId", { id: "2147483649", "r:id": "rId2" }),
        ]),
      ]),
    );
    const result = parseSlideMaster(content);

    expect(result?.slideLayoutIds?.length).toBe(2);
    expect(result?.slideLayoutIds?.[0].id).toBe(2147483648);
    expect(result?.slideLayoutIds?.[0].rId).toBe("rId1");
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("Slide parser edge cases", () => {
  it("handles slide with all components", () => {
    const content = doc(
      el("p:sld", { showMasterSp: "1", showMasterPhAnim: "0" }, [
        el("p:cSld", {}, [
          el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "336699" })])])]),
          el("p:spTree", {}, [el("p:nvGrpSpPr", {}), el("p:grpSpPr", {})]),
        ]),
        el("p:clrMapOvr", {}, [el("a:masterClrMapping", {})]),
        el("p:transition", { advClick: "1", advTm: "3000" }, [el("p:fade", {})]),
      ]),
    );
    const result = parseSlide(content);

    expect(result).toBeDefined();
    expect(result?.background?.fill?.type).toBe("solidFill");
    expect(result?.colorMapOverride?.type).toBe("none");
    expect(result?.transition?.type).toBe("fade");
    expect(result?.transition?.advanceOnClick).toBe(true);
    expect(result?.transition?.advanceAfter).toBe(3000);
    expect(result?.showMasterShapes).toBe(true);
    expect(result?.showMasterPhAnim).toBe(false);
  });
});
