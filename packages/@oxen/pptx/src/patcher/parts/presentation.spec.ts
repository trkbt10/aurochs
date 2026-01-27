/**
 * @file presentation.xml (p:sldIdLst) unit tests
 */

import { parseXml, getByPath, getChildren } from "@oxen/xml";
import { addSlideToList, removeSlideFromList, reorderSlideInList } from "./presentation";

function getSlideEntries(doc: ReturnType<typeof parseXml>): { id: string; rId: string }[] {
  const sldIdLst = getByPath(doc, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    throw new Error("missing p:sldIdLst in test xml");
  }
  return getChildren(sldIdLst, "p:sldId").map((el) => ({
    id: el.attrs.id ?? "",
    rId: el.attrs["r:id"] ?? "",
  }));
}

describe("parts/presentation", () => {
  const baseXml = parseXml(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>` +
      `<p:sldId id="256" r:id="rId2"/>` +
      `<p:sldId id="257" r:id="rId3"/>` +
      `<p:sldId id="258" r:id="rId4"/>` +
      `</p:sldIdLst>` +
      `</p:presentation>`,
  );

  it("adds to sldIdLst", () => {
    const updated = addSlideToList(baseXml, 259, "rId5");
    expect(getSlideEntries(updated).map((x) => x.id)).toEqual(["256", "257", "258", "259"]);
    expect(getSlideEntries(updated).at(-1)?.rId).toBe("rId5");
  });

  it("removes from sldIdLst", () => {
    const updated = removeSlideFromList(baseXml, 257);
    expect(getSlideEntries(updated).map((x) => x.id)).toEqual(["256", "258"]);
  });

  it("reorders within sldIdLst", () => {
    const updated = reorderSlideInList(baseXml, 256, 2);
    expect(getSlideEntries(updated).map((x) => x.id)).toEqual(["257", "258", "256"]);
  });

  it("preserves sldMasterIdLst", () => {
    const updated = addSlideToList(baseXml, 259, "rId5");
    const masterList = getByPath(updated, ["p:presentation", "p:sldMasterIdLst"]);
    expect(masterList).toBeDefined();
    const masterIds = masterList ? getChildren(masterList, "p:sldMasterId") : [];
    expect(masterIds.length).toBe(1);
    expect(masterIds[0]?.attrs.id).toBe("2147483648");
    expect(masterIds[0]?.attrs["r:id"]).toBe("rId1");
  });
});

