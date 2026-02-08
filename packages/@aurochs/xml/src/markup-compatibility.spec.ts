/**
 * @file Tests for Markup Compatibility processing (ECMA-376 Part 3)
 */

import type { XmlDocument, XmlElement } from "./ast";
import { applyMarkupCompatibility } from "./markup-compatibility";

function el(
  name: string,
  attrs: Record<string, string> = {},
  children: XmlElement[] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

describe("applyMarkupCompatibility", () => {
  it("removes ignorable elements when not in mc:ProcessContent", () => {
    const input = doc(
      el("p:sld", { "mc:Ignorable": "mv" }, [
        el("p:cSld", {}, [
          el("mv:ext", {}, [el("p:spTree", {})]),
        ]),
      ]),
    );

    const result = applyMarkupCompatibility(input, {
      supportedPrefixes: ["p", "mc"],
    });

    const sld = result.children[0] as XmlElement;
    const cSld = sld.children[0] as XmlElement;
    expect(cSld.children).toEqual([]);
  });

  it("unwraps ignorable elements listed in mc:ProcessContent", () => {
    const input = doc(
      el("p:sld", { "mc:Ignorable": "mv", "mc:ProcessContent": "mv:ext" }, [
        el("p:cSld", {}, [
          el("mv:ext", {}, [el("p:spTree", {})]),
        ]),
      ]),
    );

    const result = applyMarkupCompatibility(input, {
      supportedPrefixes: ["p", "mc"],
    });

    const sld = result.children[0] as XmlElement;
    const cSld = sld.children[0] as XmlElement;
    const childNames = cSld.children.map((child) => (child as XmlElement).name);
    expect(childNames).toEqual(["p:spTree"]);
  });

  it("allows mc:MustUnderstand when prefixes are supported", () => {
    const input = doc(el("p:sld", { "mc:MustUnderstand": "p" }));

    expect(() => {
      applyMarkupCompatibility(input, { supportedPrefixes: ["p"] });
    }).not.toThrow();
  });

  it("throws when mc:MustUnderstand contains unsupported prefixes", () => {
    const input = doc(el("p:sld", { "mc:MustUnderstand": "p14" }));

    expect(() => {
      applyMarkupCompatibility(input, { supportedPrefixes: ["p"] });
    }).toThrow("Unsupported mc:MustUnderstand");
  });
});
