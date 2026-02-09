/** @file Unit tests for table style patching */
import { createElement, getChild, getTextByPath } from "@aurochs/xml";
import { patchTableStyleId } from "./table-style-patcher";

describe("patchTableStyleId", () => {
  it("sets a:tblPr/a:tableStyleId", () => {
    const tbl = createElement("a:tbl", {}, [createElement("a:tblPr"), createElement("a:tblGrid")]);
    const patched = patchTableStyleId(tbl, "{STYLE-GUID}");
    expect(getTextByPath(getChild(patched, "a:tblPr")!, ["a:tableStyleId"])).toBe("{STYLE-GUID}");
  });

  it("removes a:tableStyleId when undefined", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblPr", {}, [createElement("a:tableStyleId", {}, [{ type: "text", value: "{STYLE-GUID}" }])]),
      createElement("a:tblGrid"),
    ]);
    const patched = patchTableStyleId(tbl, undefined);
    expect(getChild(getChild(patched, "a:tblPr")!, "a:tableStyleId")).toBeUndefined();
  });

  it("throws when element is not a:tbl", () => {
    const notTbl = createElement("a:tr", {}, []);
    expect(() => patchTableStyleId(notTbl, "{STYLE-GUID}")).toThrow("patchTableStyleId: expected a:tbl, got a:tr");
  });

  it("replaces existing a:tableStyleId with new value", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblPr", {}, [createElement("a:tableStyleId", {}, [{ type: "text" as const, value: "{OLD-GUID}" }])]),
      createElement("a:tblGrid"),
    ]);
    const patched = patchTableStyleId(tbl, "{NEW-GUID}");
    expect(getTextByPath(getChild(patched, "a:tblPr")!, ["a:tableStyleId"])).toBe("{NEW-GUID}");
  });

  it("creates a:tblPr when missing", () => {
    const tbl = createElement("a:tbl", {}, [createElement("a:tblGrid")]);
    const patched = patchTableStyleId(tbl, "{STYLE-GUID}");
    const tblPr = getChild(patched, "a:tblPr");
    expect(tblPr).toBeDefined();
    expect(getTextByPath(tblPr!, ["a:tableStyleId"])).toBe("{STYLE-GUID}");
  });

  it("removes a:tableStyleId when styleId is empty string", () => {
    const tbl = createElement("a:tbl", {}, [
      createElement("a:tblPr", {}, [createElement("a:tableStyleId", {}, [{ type: "text" as const, value: "{STYLE-GUID}" }])]),
      createElement("a:tblGrid"),
    ]);
    const patched = patchTableStyleId(tbl, "");
    expect(getChild(getChild(patched, "a:tblPr")!, "a:tableStyleId")).toBeUndefined();
  });
});
