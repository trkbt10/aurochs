/**
 * @file Table parser unit tests
 */

import type { XmlElement, XmlNode, XmlText } from "@oxen/xml";
import { parseTable } from "./table-parser";

function el(name: string, attrs: Record<string, string> = {}, children: XmlNode[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

function text(value: string): XmlText {
  return { type: "text", value };
}

describe("parseTable", () => {
  it("parses cell headers and cell3D properties", () => {
    const tbl = el("a:tbl", {}, [
      el("a:tblGrid", {}, [el("a:gridCol", { w: "914400" })]),
      el("a:tr", { h: "370840" }, [
        el("a:tc", { id: "HeaderA" }, []),
        el("a:tc", { id: "Data1" }, [
          el("a:tcPr", {}, [
            el("a:headers", {}, [
              el("a:header", { val: "HeaderA" }),
              el("a:header", {}, [text("HeaderB")]),
            ]),
            el("a:cell3D", { prstMaterial: "metal" }, [
              el("a:bevel", { prst: "circle", w: "914400", h: "914400" }),
              el("a:lightRig", { rig: "threePt", dir: "t" }),
            ]),
          ]),
        ]),
      ]),
    ]);

    const table = parseTable(tbl);
    const dataCell = table?.rows[0]?.cells[1];
    expect(dataCell?.id).toBe("Data1");
    expect(dataCell?.properties.headers).toEqual(["HeaderA", "HeaderB"]);
    expect(dataCell?.properties.cell3d?.preset).toBe("metal");
    expect(dataCell?.properties.cell3d?.bevel?.preset).toBe("circle");
    expect(dataCell?.properties.cell3d?.lightRig?.rig).toBe("threePt");
    expect(dataCell?.properties.cell3d?.lightRig?.direction).toBe("t");
  });
});

