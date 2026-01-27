import { arePackIrisEquivalent, composePackIri, createPartBaseIri, parsePackIri } from "./pack-uri";

describe("OPC pack IRI", () => {
  it("parses pack IRI to package and part", () => {
    const input = "pack://http%3A,,www.my.com,packages.aspx%3Fmy.package/a/b/foo.xml";
    const result = parsePackIri(input);
    expect(result.type).toBe("part");
    if (result.type === "part") {
      expect(result.packageIri).toBe("http://www.my.com/packages.aspx?my.package");
      expect(result.partName).toBe("/a/b/foo.xml");
    }
  });

  it("composes pack IRI from package IRI and part name", () => {
    const pack = composePackIri("http://www.my.com/packages.aspx?my.package", "/a/foo.xml");
    expect(pack).toBe("pack://http%3A,,www.my.com,packages.aspx%3Fmy.package/a/foo.xml");
  });

  it("creates base IRI for part references", () => {
    const base = createPartBaseIri("http://www.mysite.com/my.package", "/a/b/foo.xml");
    expect(base).toBe("pack://http%3A,,www.mysite.com,my.package/a/b/foo.xml");
  });

  it("treats equivalent pack IRIs as equal", () => {
    const left = "pack://http%3A,,www.openxmlformats.org,my.container";
    const right = "pack://http%3A,,www.openxmlformats.org,my.container/";
    expect(arePackIrisEquivalent(left, right)).toBe(true);
  });
});
