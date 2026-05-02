/** @file WebGL texture resource identity tests. */

import { imageTextureResource } from "./texture-resource";

describe("imageTextureResource", () => {
  it("namespaces image references into texture resource ids", () => {
    const resource = imageTextureResource("abc123");

    expect(resource.kind).toBe("image");
    expect(resource.id).toBe("image:abc123");
    expect(resource.imageRef).toBe("abc123");
  });

  it("rejects empty image references", () => {
    expect(() => imageTextureResource("")).toThrow("imageTextureResource requires a non-empty imageRef");
  });
});
