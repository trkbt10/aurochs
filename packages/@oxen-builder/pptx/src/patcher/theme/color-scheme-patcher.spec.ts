/**
 * @file Theme color scheme patcher tests (Phase 9)
 */

import { createElement, getChild } from "@oxen/xml";
import type { Color } from "@oxen-office/ooxml/domain/color";
import { patchSchemeColor } from "./color-scheme-patcher";

function srgb(value: string): Color {
  return { spec: { type: "srgb", value } };
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
});
