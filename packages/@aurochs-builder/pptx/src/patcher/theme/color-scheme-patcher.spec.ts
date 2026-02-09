/**
 * @file Theme color scheme patcher tests (Phase 9)
 */

import { createElement, getChild, isXmlElement, type XmlElement } from "@aurochs/xml";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import { patchSchemeColor } from "./color-scheme-patcher";

function srgb(value: string): Color {
  return { spec: { type: "srgb", value } };
}

function systemColor(value: string, lastColor?: string): Color {
  return { spec: { type: "system", value, lastColor } };
}

describe("patchSchemeColor", () => {
  it("replaces sysClr with srgbClr when patched with srgb", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:dk1", {}, [createElement("a:sysClr", { val: "windowText", lastClr: "000000" })]),
    ]);

    const updated = patchSchemeColor(clrScheme, "dk1", srgb("FF0000"));
    const dk1 = getChild(updated, "a:dk1")!;
    expect(getChild(dk1, "a:sysClr")).toBeUndefined();
    expect(getChild(dk1, "a:srgbClr")?.attrs.val).toBe("FF0000");
  });

  it("throws when colorScheme is falsy", () => {
    expect(() => patchSchemeColor(undefined as never, "dk1", srgb("FF0000"))).toThrow(
      "patchSchemeColor requires colorScheme.",
    );
  });

  it("throws when name is falsy", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, []);
    expect(() => patchSchemeColor(clrScheme, "" as never, srgb("FF0000"))).toThrow(
      "patchSchemeColor requires name.",
    );
  });

  it("throws when color is falsy", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, []);
    expect(() => patchSchemeColor(clrScheme, "dk1", undefined as never)).toThrow(
      "patchSchemeColor requires color.",
    );
  });

  it("throws for unsupported color spec type (scheme)", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, []);
    const schemeColor: Color = { spec: { type: "scheme", value: "accent1" } };
    expect(() => patchSchemeColor(clrScheme, "dk1", schemeColor)).toThrow(
      "patchSchemeColor only supports srgb/system",
    );
  });

  it("creates a new entry when the color name does not exist", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:dk1", {}, [createElement("a:srgbClr", { val: "000000" })]),
    ]);

    const updated = patchSchemeColor(clrScheme, "accent1", srgb("4472C4"));
    const accent1 = getChild(updated, "a:accent1")!;
    expect(accent1).toBeDefined();
    expect(getChild(accent1, "a:srgbClr")?.attrs.val).toBe("4472C4");
  });

  it("inserts new entry before a:extLst when no existing entry exists", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:dk1", {}, [createElement("a:srgbClr", { val: "000000" })]),
      createElement("a:extLst", {}, []),
    ]);

    const updated = patchSchemeColor(clrScheme, "accent1", srgb("4472C4"));
    const childNames = updated.children.filter(isXmlElement).map((c) => c.name);
    const accent1Index = childNames.indexOf("a:accent1");
    const extLstIndex = childNames.indexOf("a:extLst");
    expect(accent1Index).toBeLessThan(extLstIndex);
  });

  it("preserves extLst children inside an existing entry", () => {
    const entryExtLst = createElement("a:extLst", {}, [createElement("a:ext", { uri: "test" })]);
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:dk1", {}, [createElement("a:srgbClr", { val: "000000" }), entryExtLst]),
    ]);

    const updated = patchSchemeColor(clrScheme, "dk1", srgb("FF0000"));
    const dk1 = getChild(updated, "a:dk1")!;
    expect(getChild(dk1, "a:srgbClr")?.attrs.val).toBe("FF0000");
    const extLst = getChild(dk1, "a:extLst");
    expect(extLst).toBeDefined();
  });

  it("supports system color type", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:dk1", {}, [createElement("a:srgbClr", { val: "000000" })]),
    ]);

    const updated = patchSchemeColor(clrScheme, "dk1", systemColor("windowText", "000000"));
    const dk1 = getChild(updated, "a:dk1")!;
    expect(getChild(dk1, "a:sysClr")?.attrs.val).toBe("windowText");
  });

  it("replaces existing entry and preserves non-color children (text nodes)", () => {
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, [
      createElement("a:lt1", {}, [createElement("a:srgbClr", { val: "FFFFFF" })]),
    ]);

    const updated = patchSchemeColor(clrScheme, "lt1", srgb("EEEEEE"));
    const lt1 = getChild(updated, "a:lt1")!;
    expect(getChild(lt1, "a:srgbClr")?.attrs.val).toBe("EEEEEE");
    // Old srgbClr should be gone (only one srgbClr child expected)
    const srgbChildren = lt1.children.filter(
      (c): c is XmlElement => isXmlElement(c) && c.name === "a:srgbClr",
    );
    expect(srgbChildren).toHaveLength(1);
  });

  it("patches accent6 color on scheme with all 12 colors", () => {
    const names = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
    const children = names.map((n) =>
      createElement(`a:${n}`, {}, [createElement("a:srgbClr", { val: "AAAAAA" })]),
    );
    const clrScheme = createElement("a:clrScheme", { name: "Office" }, children);

    const updated = patchSchemeColor(clrScheme, "accent6", srgb("70AD47"));
    const accent6 = getChild(updated, "a:accent6")!;
    expect(getChild(accent6, "a:srgbClr")?.attrs.val).toBe("70AD47");
    // Other entries should be untouched
    expect(getChild(getChild(updated, "a:dk1")!, "a:srgbClr")?.attrs.val).toBe("AAAAAA");
  });
});
