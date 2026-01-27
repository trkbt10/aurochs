/**
 * @file Tests for text style levels parsing
 */

import type { XmlElement } from "@oxen/xml";
import { parseTextStyleLevels } from "./text-style-levels";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseTextStyleLevels", () => {
  it("returns undefined when element is missing", () => {
    expect(parseTextStyleLevels(undefined)).toBeUndefined();
  });

  it("parses default and level styles", () => {
    const element = el("p:defaultTextStyle", {}, [
      el("a:defPPr", { algn: "ctr" }, [el("a:defRPr", { sz: "1800" })]),
      el("a:lvl1pPr", { algn: "r" }, [el("a:defRPr", { sz: "2400" })]),
    ]);

    const result = parseTextStyleLevels(element);

    expect(result?.defaultStyle?.paragraphProperties?.alignment).toBe("center");
    expect(result?.defaultStyle?.defaultRunProperties?.fontSize).toBe(18);
    expect(result?.level1?.paragraphProperties?.alignment).toBe("right");
    expect(result?.level1?.defaultRunProperties?.fontSize).toBe(24);
  });

  it("parses list levels 4 through 8", () => {
    const element = el("p:defaultTextStyle", {}, [
      el("a:lvl4pPr", {}, [el("a:defRPr", { sz: "1400" })]),
      el("a:lvl5pPr", {}, [el("a:defRPr", { sz: "1300" })]),
      el("a:lvl6pPr", {}, [el("a:defRPr", { sz: "1200" })]),
      el("a:lvl7pPr", {}, [el("a:defRPr", { sz: "1100" })]),
      el("a:lvl8pPr", {}, [el("a:defRPr", { sz: "1000" })]),
    ]);

    const result = parseTextStyleLevels(element);

    expect(result?.level4?.defaultRunProperties?.fontSize).toBe(14);
    expect(result?.level5?.defaultRunProperties?.fontSize).toBe(13);
    expect(result?.level6?.defaultRunProperties?.fontSize).toBe(12);
    expect(result?.level7?.defaultRunProperties?.fontSize).toBe(11);
    expect(result?.level8?.defaultRunProperties?.fontSize).toBe(10);
  });
});
