/**
 * @file Tests for programmable tag parsing
 */

import type { XmlElement } from "@oxen/xml";
import { parseTagList } from "./tag-parser";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseTagList - p:tagLst (ECMA-376 Section 19.3.3.2)", () => {
  it("parses empty list", () => {
    const list = el("p:tagLst", {}, []);
    const result = parseTagList(list);

    expect(result.tags).toEqual([]);
  });

  it("parses tags with name and value", () => {
    const list = el("p:tagLst", {}, [
      el("p:tag", { name: "testTagName", val: "testTagValue" }),
      el("p:tag", { name: "second", val: "value2" }),
    ]);
    const result = parseTagList(list);

    expect(result.tags).toEqual([
      { name: "testTagName", value: "testTagValue" },
      { name: "second", value: "value2" },
    ]);
  });
});
