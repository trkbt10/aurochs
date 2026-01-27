/**
 * @file Slide layout parser tests
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import {
  applySlideLayoutAttributes,
  getSlideLayoutAttributes,
} from "../../parser/slide/layout-parser";

function el(
  name: string,
  attrs: Record<string, string> = {},
  children: XmlElement[] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

function doc(children: XmlElement[]): XmlDocument {
  return { children };
}

describe("slide layout attributes", () => {
  it("extracts attributes from layout XML", () => {
    const layoutDoc = doc([
      el("p:sldLayout", {
        type: "title",
        matchingName: "TitleLayout",
        showMasterSp: "0",
        showMasterPhAnim: "1",
        preserve: "1",
        userDrawn: "0",
      }, [
        el("p:cSld", { name: "Title Slide" }, [el("p:spTree")]),
      ]),
    ]);

    const attrs = getSlideLayoutAttributes(layoutDoc);
    expect(attrs).toEqual({
      type: "title",
      name: "Title Slide",
      matchingName: "TitleLayout",
      showMasterShapes: false,
      showMasterPhAnim: true,
      preserve: true,
      userDrawn: false,
    });
  });

  it("applies attribute updates to layout XML", () => {
    const layoutDoc = doc([
      el("p:sldLayout", { type: "title", matchingName: "Old", showMasterSp: "1" }, [
        el("p:cSld", { name: "Old Name" }, [el("p:spTree")]),
      ]),
    ]);

    const updated = applySlideLayoutAttributes(layoutDoc, {
      type: "blank",
      name: "New Name",
      matchingName: undefined,
      showMasterShapes: false,
      showMasterPhAnim: true,
      preserve: undefined,
      userDrawn: true,
    });

    const attrs = getSlideLayoutAttributes(updated);
    expect(attrs).toEqual({
      type: "blank",
      name: "New Name",
      matchingName: undefined,
      showMasterShapes: false,
      showMasterPhAnim: true,
      preserve: undefined,
      userDrawn: true,
    });
  });
});
