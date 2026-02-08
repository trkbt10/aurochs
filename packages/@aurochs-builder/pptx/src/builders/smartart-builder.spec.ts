/** @file Unit tests for smartart-builder */
import { applySmartArtUpdates } from "./smartart-builder";
import type { SmartArtUpdateSpec } from "../types";
import type { ZipPackage } from "@aurochs/zip";

function createMockZipPackage(files: Record<string, string | null> = {}): ZipPackage {
  // eslint-disable-next-line custom/no-as-outside-guard -- test mock
  return {
    readText: (path: string) => files[path] ?? null,
    writeText: () => {},
    listFiles: () => Object.keys(files),
  } as unknown as ZipPackage;
}

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
});
