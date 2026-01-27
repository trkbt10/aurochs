/**
 * @file Tests for table style parsing
 */

import { parseTableStyleList } from "./style-parser";
import type { XmlElement } from "@oxen/xml";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseTableStyleList", () => {
  it("parses table styles with borders and text styles", () => {
    const tblStyleLst = el("a:tblStyleLst", { def: "{default}" }, [
      el("a:tblStyle", { styleId: "{style1}", styleName: "Sample" }, [
        el("a:tblBg", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "112233" })])]),
        el("a:wholeTbl", {}, [
          el("a:tcStyle", {}, [
            el("a:tcBdr", {}, [
              el("a:insideH", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])]),
              el("a:insideV", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })])]),
              el("a:tl2br", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "0000FF" })])]),
              el("a:tr2bl", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FFFFFF" })])]),
            ]),
            el("a:cell3D", { prstMaterial: "metal" }, [
              el("a:bevel", { prst: "circle", w: "914400", h: "914400" }),
              el("a:lightRig", { rig: "threePt", dir: "t" }),
            ]),
          ]),
          el("a:tcTxStyle", {}, [el("a:fontRef", { idx: "major" }, [el("a:schemeClr", { val: "accent1" })])]),
        ]),
      ]),
    ]);

    const result = parseTableStyleList(tblStyleLst);

    expect(result?.defaultStyleId).toBe("{default}");
    expect(result?.styles).toHaveLength(1);
    expect(result?.styles[0]?.tblBg?.type).toBe("solidFill");
    const wholeTbl = result?.styles[0]?.wholeTbl;
    expect(wholeTbl?.borders?.insideH).toBeDefined();
    expect(wholeTbl?.borders?.insideV).toBeDefined();
    expect(wholeTbl?.borders?.tlToBr).toBeDefined();
    expect(wholeTbl?.borders?.blToTr).toBeDefined();
    expect(wholeTbl?.cell3d?.preset).toBe("metal");
    expect(wholeTbl?.cell3d?.bevel?.preset).toBe("circle");
    expect(wholeTbl?.cell3d?.bevel?.width).toBeCloseTo(96, 0);
    expect(wholeTbl?.cell3d?.bevel?.height).toBeCloseTo(96, 0);
    expect(wholeTbl?.cell3d?.lightRig?.rig).toBe("threePt");
    expect(wholeTbl?.cell3d?.lightRig?.direction).toBe("t");
    expect(wholeTbl?.textProperties?.fontReference?.index).toBe("major");
  });
});
