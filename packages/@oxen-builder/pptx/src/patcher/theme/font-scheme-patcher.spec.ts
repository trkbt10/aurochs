/**
 * @file Theme font scheme patcher tests (Phase 9)
 */

import { createElement, getChild } from "@oxen/xml";
import { patchMajorFont, patchMinorFont } from "./font-scheme-patcher";

describe("patchMajorFont / patchMinorFont", () => {
  it("updates latin/ea/cs typefaces", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, [
        createElement("a:latin", { typeface: "Calibri Light" }),
        createElement("a:ea", { typeface: "" }),
        createElement("a:cs", { typeface: "" }),
      ]),
      createElement("a:minorFont", {}, [
        createElement("a:latin", { typeface: "Calibri" }),
        createElement("a:ea", { typeface: "" }),
        createElement("a:cs", { typeface: "" }),
      ]),
    ]);

    const updatedMajor = patchMajorFont(fontScheme, {
      latin: "Aptos Display",
      eastAsian: "Yu Gothic",
      complexScript: "Times New Roman",
    });
    const updated = patchMinorFont(updatedMajor, {
      latin: "Aptos",
      eastAsian: "Yu Gothic",
      complexScript: "Times New Roman",
    });

    const major = getChild(updated, "a:majorFont")!;
    expect(getChild(major, "a:latin")?.attrs.typeface).toBe("Aptos Display");
    expect(getChild(major, "a:ea")?.attrs.typeface).toBe("Yu Gothic");
    expect(getChild(major, "a:cs")?.attrs.typeface).toBe("Times New Roman");

    const minor = getChild(updated, "a:minorFont")!;
    expect(getChild(minor, "a:latin")?.attrs.typeface).toBe("Aptos");
    expect(getChild(minor, "a:ea")?.attrs.typeface).toBe("Yu Gothic");
    expect(getChild(minor, "a:cs")?.attrs.typeface).toBe("Times New Roman");
  });
});

