/** @file Unit tests for smartart-builder */
import type { ZipPackage } from "@aurochs/zip";
import { applySmartArtUpdates } from "./smartart-builder";
import type { SmartArtUpdateSpec } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockZipPackage(
  files: Record<string, string | null> = {},
  onWrite?: (path: string, content: string) => void,
): ZipPackage {
  return {
    readText: (path: string) => files[path] ?? null,
    writeText: (path: string, content: string) => {
      files[path] = content;
      onWrite?.(path, content);
    },
    listFiles: () => Object.keys(files),
  } as never;
}

/** Minimal rels file that includes diagram relationships with relative targets */
function makeRelsXml(opts: {
  resourceId: string;
  dataTarget?: string;
  layoutTarget?: string;
  colorsTarget?: string;
  quickStyleTarget?: string;
}): string {
  const ns = "http://schemas.openxmlformats.org/package/2006/relationships";
  const rels: string[] = [];
  rels.push(
    `<Relationship Id="${opts.resourceId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="${opts.dataTarget ?? "../diagrams/data1.xml"}"/>`,
  );
  rels.push(
    `<Relationship Id="rIdLayout" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout" Target="${opts.layoutTarget ?? "../diagrams/layout1.xml"}"/>`,
  );
  rels.push(
    `<Relationship Id="rIdColors" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramColors" Target="${opts.colorsTarget ?? "../diagrams/colors1.xml"}"/>`,
  );
  rels.push(
    `<Relationship Id="rIdQS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramQuickStyle" Target="${opts.quickStyleTarget ?? "../diagrams/quickStyle1.xml"}"/>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}">${rels.join("")}</Relationships>`;
}

/** Minimal diagram data XML with a ptLst containing given nodes */
function makeDiagramDataXml(nodes: { id: string; text: string }[]): string {
  const pts = nodes
    .map(
      (n) =>
        `<dgm:pt modelId="${n.id}" type="node"><dgm:t><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${n.text}</a:t></a:r></a:p></dgm:t></dgm:pt>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><dgm:ptLst>${pts}</dgm:ptLst></dgm:dataModel>`;
}

function makeMinimalXml(rootTag: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><${rootTag}></${rootTag}>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("applySmartArtUpdates", () => {
  it("returns immediately for empty specs", () => {
    const pkg = createMockZipPackage();
    // Should not throw
    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", []);
  });

  it("throws when diagram paths cannot be found", () => {
    const pkg = createMockZipPackage({
      "ppt/slides/_rels/slide1.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
    });

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId999",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Hello" }],
      },
    ];

    expect(() => applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs)).toThrow(
      'could not find diagram for resourceId "rId999"',
    );
  });

  it("throws when rels file is missing", () => {
    const pkg = createMockZipPackage();

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Hello" }],
      },
    ];

    expect(() => applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs)).toThrow(
      'could not find diagram for resourceId "rId1"',
    );
  });

  it("throws when rels XML has no root element", () => {
    const pkg = createMockZipPackage({
      "ppt/slides/_rels/slide1.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>`,
    });

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Hello" }],
      },
    ];

    expect(() => applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs)).toThrow(
      'could not find diagram for resourceId "rId1"',
    );
  });

  it("throws when diagram files are missing from the zip", () => {
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage({
      "ppt/slides/_rels/slide1.xml.rels": relsXml,
      // diagram files not provided
    });

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Hello" }],
      },
    ];

    expect(() => applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs)).toThrow(
      'missing diagram files for resourceId "rId1"',
    );
  });

  it("throws when some diagram files are missing", () => {
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage({
      "ppt/slides/_rels/slide1.xml.rels": relsXml,
      "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "1", text: "A" }]),
      "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
      // colors and quickStyle are missing
    });

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Hello" }],
      },
    ];

    expect(() => applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs)).toThrow(
      'missing diagram files for resourceId "rId1"',
    );
  });

  it("successfully applies nodeText change and writes back data XML", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "n1", text: "Original" }]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Updated" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.path).toBe("ppt/diagrams/data1.xml");
    expect(writes[0]!.content).toContain("Updated");
  });

  it("converts addNode change spec correctly", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "parent1", text: "Parent" }]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "addNode", parentId: "parent1", nodeId: "child1", text: "New Child" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).toContain("New Child");
    expect(writes[0]!.content).toContain("child1");
  });

  it("converts removeNode change spec correctly", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([
          { id: "n1", text: "Keep" },
          { id: "n2", text: "Remove" },
        ]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "removeNode", nodeId: "n2" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).not.toContain("Remove");
  });

  it("converts setConnection change spec correctly", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([
          { id: "n1", text: "A" },
          { id: "n2", text: "B" },
        ]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "setConnection", srcId: "n1", destId: "n2", connectionType: "parOf" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).toContain("parOf");
  });

  it("processes multiple specs in sequence", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([
          { id: "n1", text: "First" },
          { id: "n2", text: "Second" },
        ]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Updated First" }],
      },
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n2", text: "Updated Second" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    // Each spec triggers a separate write
    expect(writes.length).toBe(2);
  });

  it("resolves absolute target paths (starting with /)", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const ns = "http://schemas.openxmlformats.org/package/2006/relationships";
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="${ns}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="/ppt/diagrams/data1.xml"/>
  <Relationship Id="rIdLayout" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout" Target="/ppt/diagrams/layout1.xml"/>
  <Relationship Id="rIdColors" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramColors" Target="/ppt/diagrams/colors1.xml"/>
  <Relationship Id="rIdQS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramQuickStyle" Target="/ppt/diagrams/quickStyle1.xml"/>
</Relationships>`;

    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "n1", text: "Original" }]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Updated" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.path).toBe("ppt/diagrams/data1.xml");
  });

  it("falls back to diagram files search when rels lack type-specific entries", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const ns = "http://schemas.openxmlformats.org/package/2006/relationships";
    // Rels has a diagram rel for the resource but no typed diagram rels
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="${ns}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="../diagrams/data1.xml"/>
</Relationships>`;

    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "n1", text: "Test" }]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Changed" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).toContain("Changed");
  });

  it("writes serialized XML with declaration and standalone", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([{ id: "n1", text: "Original" }]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "X" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes[0]!.content).toContain('<?xml version="1.0"');
    expect(writes[0]!.content).toContain('standalone="yes"');
  });

  it("applies multiple changes within a single spec", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({ resourceId: "rId1" });
    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "ppt/diagrams/data1.xml": makeDiagramDataXml([
          { id: "n1", text: "A" },
          { id: "n2", text: "B" },
        ]),
        "ppt/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "ppt/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "ppt/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [
          { type: "nodeText", nodeId: "n1", text: "Alpha" },
          { type: "nodeText", nodeId: "n2", text: "Beta" },
        ],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).toContain("Alpha");
    expect(writes[0]!.content).toContain("Beta");
  });

  it("handles relative paths with .. segments correctly", () => {
    const writes: Array<{ path: string; content: string }> = [];
    const relsXml = makeRelsXml({
      resourceId: "rId1",
      dataTarget: "../../other/diagrams/data1.xml",
      layoutTarget: "../../other/diagrams/layout1.xml",
      colorsTarget: "../../other/diagrams/colors1.xml",
      quickStyleTarget: "../../other/diagrams/quickStyle1.xml",
    });

    const pkg = createMockZipPackage(
      {
        "ppt/slides/_rels/slide1.xml.rels": relsXml,
        "other/diagrams/data1.xml": makeDiagramDataXml([{ id: "n1", text: "Test" }]),
        "other/diagrams/layout1.xml": makeMinimalXml("dgm:layoutDef"),
        "other/diagrams/colors1.xml": makeMinimalXml("dgm:colorsDef"),
        "other/diagrams/quickStyle1.xml": makeMinimalXml("dgm:styleDef"),
      },
      (path, content) => writes.push({ path, content }),
    );

    const specs: SmartArtUpdateSpec[] = [
      {
        resourceId: "rId1",
        changes: [{ type: "nodeText", nodeId: "n1", text: "Done" }],
      },
    ];

    applySmartArtUpdates(pkg, "ppt/slides/slide1.xml", specs);

    expect(writes.length).toBe(1);
    expect(writes[0]!.content).toContain("Done");
  });
});
