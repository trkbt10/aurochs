/** @file Fig export download helper tests. */

import type { FigMetadata } from "@aurochs/fig/roundtrip";
import {
  createFigExportBlob,
  downloadFigExport,
  resolveFigExportFilename,
} from "./fig-export-download";

describe("resolveFigExportFilename", () => {
  it("uses sanitized metadata filename and preserves one fig extension", () => {
    const metadata: FigMetadata = { fileName: " Project/File.fig " };

    expect(resolveFigExportFilename(metadata)).toBe("Project-File.fig");
  });

  it("uses an explicit untitled filename when metadata has no usable name", () => {
    const metadata: FigMetadata = { fileName: " / " };

    expect(resolveFigExportFilename(metadata)).toBe("untitled.fig");
  });
});

describe("createFigExportBlob", () => {
  it("keeps only the exported byte range", async () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4]);
    const data = backing.subarray(1, 4);
    const blob = createFigExportBlob({ data, size: data.length });

    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe("downloadFigExport", () => {
  it("creates a browser download with the resolved filename", () => {
    const createdTags: string[] = [];
    const objectUrls: Blob[] = [];
    const revokedUrls: string[] = [];
    const clicks: string[] = [];
    const anchor = {
      href: "",
      download: "",
      click: () => {
        clicks.push("click");
      },
    };
    const documentRef = {
      createElement: (tagName: "a") => {
        createdTags.push(tagName);
        return anchor;
      },
    };
    const urlRef = {
      createObjectURL: (blob: Blob) => {
        objectUrls.push(blob);
        return "blob:fig-export";
      },
      revokeObjectURL: (url: string) => {
        revokedUrls.push(url);
      },
    };

    downloadFigExport({ data: new Uint8Array([1, 2, 3]), size: 3 }, "sample.fig", {
      document: documentRef,
      url: urlRef,
    });

    expect(createdTags).toEqual(["a"]);
    expect(anchor.href).toBe("blob:fig-export");
    expect(anchor.download).toBe("sample.fig");
    expect(clicks).toEqual(["click"]);
    expect(objectUrls).toHaveLength(1);
    expect(revokedUrls).toEqual(["blob:fig-export"]);
  });
});
