import { createElement, getChild, getTextByPath } from "@oxen/xml";
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
});

