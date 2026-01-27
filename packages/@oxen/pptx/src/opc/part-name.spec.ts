import { arePartNamesEquivalent, isValidPartName } from "./part-name";

describe("OPC Part name validation", () => {
  it("accepts a basic absolute part name", () => {
    expect(isValidPartName("/a/b.xml")).toBe(true);
  });

  it("rejects missing leading slash", () => {
    expect(isValidPartName("a/b.xml")).toBe(false);
  });

  it("rejects trailing slash", () => {
    expect(isValidPartName("/a/b/")).toBe(false);
  });

  it("rejects trailing dot in a segment", () => {
    expect(isValidPartName("/a./b.xml")).toBe(false);
  });

  it("rejects reserved relationships part names", () => {
    expect(isValidPartName("/_rels/.rels")).toBe(false);
    expect(isValidPartName("/ppt/_rels/slide1.xml.rels")).toBe(false);
  });

  it("rejects percent-encoded slash or backslash", () => {
    expect(isValidPartName("/a/%2F.xml")).toBe(false);
    expect(isValidPartName("/a/%5C.xml")).toBe(false);
  });

  it("rejects percent-encoded unreserved ASCII", () => {
    expect(isValidPartName("/a/%41.xml")).toBe(false);
    expect(isValidPartName("/a/%7E.xml")).toBe(false);
  });

  it("compares part names case-insensitively for ASCII", () => {
    expect(arePartNamesEquivalent("/ppt/Slides/Slide1.xml", "/PPT/slides/slide1.xml")).toBe(true);
  });
});
