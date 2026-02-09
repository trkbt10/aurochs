/**
 * @file Theme font scheme patcher tests (Phase 9)
 */

import { createElement, getChild, isXmlElement } from "@aurochs/xml";
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

describe("patchMajorFont", () => {
  it("throws when fontScheme is falsy", () => {
    expect(() => patchMajorFont(undefined as never, { latin: "Arial" })).toThrow(
      "patchMajorFont requires fontScheme.",
    );
  });

  it("throws when fontFamily is falsy", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, []);
    expect(() => patchMajorFont(fontScheme, undefined as never)).toThrow(
      "patchMajorFont requires fontFamily.",
    );
  });

  it("creates a:majorFont when it does not exist", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, []);
    const updated = patchMajorFont(fontScheme, { latin: "Arial" });
    const major = getChild(updated, "a:majorFont")!;
    expect(major).toBeDefined();
    expect(getChild(major, "a:latin")?.attrs.typeface).toBe("Arial");
  });

  it("creates a:majorFont before a:extLst when it does not exist", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:extLst", {}, []),
    ]);
    const updated = patchMajorFont(fontScheme, { latin: "Arial" });
    const childNames = updated.children.filter(isXmlElement).map((c) => c.name);
    expect(childNames.indexOf("a:majorFont")).toBeLessThan(childNames.indexOf("a:extLst"));
  });

  it("updates only latin when eastAsian and complexScript are undefined", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, [
        createElement("a:latin", { typeface: "Calibri Light" }),
        createElement("a:ea", { typeface: "MS Gothic" }),
        createElement("a:cs", { typeface: "Times New Roman" }),
      ]),
    ]);

    const updated = patchMajorFont(fontScheme, { latin: "Arial" });
    const major = getChild(updated, "a:majorFont")!;
    expect(getChild(major, "a:latin")?.attrs.typeface).toBe("Arial");
    expect(getChild(major, "a:ea")?.attrs.typeface).toBe("MS Gothic");
    expect(getChild(major, "a:cs")?.attrs.typeface).toBe("Times New Roman");
  });

  it("creates a:ea when it does not exist in majorFont", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, [
        createElement("a:latin", { typeface: "Calibri Light" }),
      ]),
    ]);

    const updated = patchMajorFont(fontScheme, { eastAsian: "Yu Gothic" });
    const major = getChild(updated, "a:majorFont")!;
    expect(getChild(major, "a:ea")?.attrs.typeface).toBe("Yu Gothic");
  });

  it("creates a:cs when it does not exist in majorFont", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, [
        createElement("a:latin", { typeface: "Calibri Light" }),
      ]),
    ]);

    const updated = patchMajorFont(fontScheme, { complexScript: "Arabic Typesetting" });
    const major = getChild(updated, "a:majorFont")!;
    expect(getChild(major, "a:cs")?.attrs.typeface).toBe("Arabic Typesetting");
  });

  it("creates a:latin when it does not exist in majorFont", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, []),
    ]);

    const updated = patchMajorFont(fontScheme, { latin: "Helvetica" });
    const major = getChild(updated, "a:majorFont")!;
    expect(getChild(major, "a:latin")?.attrs.typeface).toBe("Helvetica");
  });

  it("inserts new typeface children before a:extLst inside majorFont", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:majorFont", {}, [
        createElement("a:extLst", {}, []),
      ]),
    ]);

    const updated = patchMajorFont(fontScheme, { latin: "Arial" });
    const major = getChild(updated, "a:majorFont")!;
    const childNames = major.children.filter(isXmlElement).map((c) => c.name);
    expect(childNames.indexOf("a:latin")).toBeLessThan(childNames.indexOf("a:extLst"));
  });
});

describe("patchMinorFont", () => {
  it("throws when fontScheme is falsy", () => {
    expect(() => patchMinorFont(undefined as never, { latin: "Arial" })).toThrow(
      "patchMinorFont requires fontScheme.",
    );
  });

  it("throws when fontFamily is falsy", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, []);
    expect(() => patchMinorFont(fontScheme, undefined as never)).toThrow(
      "patchMinorFont requires fontFamily.",
    );
  });

  it("creates a:minorFont when it does not exist", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, []);
    const updated = patchMinorFont(fontScheme, { latin: "Georgia" });
    const minor = getChild(updated, "a:minorFont")!;
    expect(minor).toBeDefined();
    expect(getChild(minor, "a:latin")?.attrs.typeface).toBe("Georgia");
  });

  it("creates a:minorFont before a:extLst when it does not exist", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:extLst", {}, []),
    ]);
    const updated = patchMinorFont(fontScheme, { latin: "Georgia" });
    const childNames = updated.children.filter(isXmlElement).map((c) => c.name);
    expect(childNames.indexOf("a:minorFont")).toBeLessThan(childNames.indexOf("a:extLst"));
  });

  it("updates only eastAsian keeping latin and complexScript unchanged", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:minorFont", {}, [
        createElement("a:latin", { typeface: "Calibri" }),
        createElement("a:ea", { typeface: "MS Mincho" }),
        createElement("a:cs", { typeface: "Arial" }),
      ]),
    ]);

    const updated = patchMinorFont(fontScheme, { eastAsian: "Meiryo" });
    const minor = getChild(updated, "a:minorFont")!;
    expect(getChild(minor, "a:latin")?.attrs.typeface).toBe("Calibri");
    expect(getChild(minor, "a:ea")?.attrs.typeface).toBe("Meiryo");
    expect(getChild(minor, "a:cs")?.attrs.typeface).toBe("Arial");
  });

  it("updates all three typefaces simultaneously", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:minorFont", {}, [
        createElement("a:latin", { typeface: "Calibri" }),
        createElement("a:ea", { typeface: "" }),
        createElement("a:cs", { typeface: "" }),
      ]),
    ]);

    const updated = patchMinorFont(fontScheme, {
      latin: "Verdana",
      eastAsian: "MS Gothic",
      complexScript: "Tahoma",
    });
    const minor = getChild(updated, "a:minorFont")!;
    expect(getChild(minor, "a:latin")?.attrs.typeface).toBe("Verdana");
    expect(getChild(minor, "a:ea")?.attrs.typeface).toBe("MS Gothic");
    expect(getChild(minor, "a:cs")?.attrs.typeface).toBe("Tahoma");
  });

  it("preserves other existing attributes on a:latin when updating typeface", () => {
    const fontScheme = createElement("a:fontScheme", { name: "Office" }, [
      createElement("a:minorFont", {}, [
        createElement("a:latin", { typeface: "Calibri", panose: "020F0502020204030204" }),
      ]),
    ]);

    const updated = patchMinorFont(fontScheme, { latin: "Arial" });
    const minor = getChild(updated, "a:minorFont")!;
    const latin = getChild(minor, "a:latin")!;
    expect(latin.attrs.typeface).toBe("Arial");
    expect(latin.attrs.panose).toBe("020F0502020204030204");
  });
});
