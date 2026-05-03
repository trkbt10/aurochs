/** @file Fig image asset helper tests. */

import { createFigImageAsset } from "./image-asset";

describe("createFigImageAsset", () => {
  it("creates stable refs from image bytes and file extension", () => {
    const data = new Uint8Array([137, 80, 78, 71]);
    const image = createFigImageAsset({ data, mimeType: "image/png", fileName: "sample.png" });

    expect(image.ref).toBe("4e4a5c83.png");
    expect(image.data).toBe(data);
    expect(image.mimeType).toBe("image/png");
  });

  it("rejects non-image assets explicitly", () => {
    expect(() => createFigImageAsset({
      data: new Uint8Array([1]),
      mimeType: "text/plain",
      fileName: "note.txt",
    })).toThrow("Unsupported image MIME type");
  });
});
