/**
 * @file Tests for slide synchronization parsing
 */

import type { XmlElement } from "../../../xml/index";
import { parseSlideSyncProperties } from "./slide-sync-parser";

function el(name: string, attrs: Record<string, string> = {}): XmlElement {
  return { type: "element", name, attrs, children: [] };
}

describe("parseSlideSyncProperties - p:sldSyncPr (ECMA-376 Section 19.6.1)", () => {
  it("parses slide synchronization attributes", () => {
    const element = el("p:sldSyncPr", {
      clientInsertedTime: "2006-08-12T01:34:11.227",
      serverSldId: "1",
      serverSldModifiedTime: "2006-08-12T01:31:08",
    });

    const result = parseSlideSyncProperties(element);

    expect(result.clientInsertedTime).toBe("2006-08-12T01:34:11.227");
    expect(result.serverSldId).toBe("1");
    expect(result.serverSldModifiedTime).toBe("2006-08-12T01:31:08");
  });

  it("handles missing optional attributes", () => {
    const element = el("p:sldSyncPr");
    const result = parseSlideSyncProperties(element);

    expect(result.clientInsertedTime).toBeUndefined();
    expect(result.serverSldId).toBeUndefined();
    expect(result.serverSldModifiedTime).toBeUndefined();
  });
});
