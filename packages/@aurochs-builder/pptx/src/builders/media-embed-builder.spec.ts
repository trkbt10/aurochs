/** @file Unit tests for media-embed-builder */
import { detectEmbeddedMediaType, buildMediaReferenceFromSpec } from "./media-embed-builder";
import type { MediaEmbedSpec } from "../types";

const DUMMY_DATA = new Uint8Array([0x00]);

describe("detectEmbeddedMediaType", () => {
  it("returns mimeType from spec", () => {
    const spec: MediaEmbedSpec = { type: "video", data: DUMMY_DATA, mimeType: "video/mp4" };
    expect(detectEmbeddedMediaType(spec)).toBe("video/mp4");
  });

  it("returns audio mimeType from spec", () => {
    const spec: MediaEmbedSpec = { type: "audio", data: DUMMY_DATA, mimeType: "audio/wav" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/wav");
  });
});

describe("buildMediaReferenceFromSpec", () => {
  it("builds video reference", () => {
    const spec: MediaEmbedSpec = { type: "video", data: DUMMY_DATA, mimeType: "video/mp4" };
    const result = buildMediaReferenceFromSpec(spec, "rId5", "video/mp4");
    expect(result.mediaType).toBe("video");
    expect(result.media.videoFile).toEqual({ link: "rId5", contentType: "video/mp4" });
  });

  it("builds audio reference", () => {
    const spec: MediaEmbedSpec = { type: "audio", data: DUMMY_DATA, mimeType: "audio/mpeg" };
    const result = buildMediaReferenceFromSpec(spec, "rId6", "audio/mpeg");
    expect(result.mediaType).toBe("audio");
    expect(result.media.audioFile).toEqual({ link: "rId6", contentType: "audio/mpeg" });
  });

  it("throws when spec is missing", () => {
    expect(() => buildMediaReferenceFromSpec(null as never, "rId1", "video/mp4")).toThrow("media spec is required");
  });

  it("throws when rId is missing", () => {
    const spec: MediaEmbedSpec = { type: "video", data: DUMMY_DATA, mimeType: "video/mp4" };
    expect(() => buildMediaReferenceFromSpec(spec, "", "video/mp4")).toThrow("media rId is required");
  });

  it("throws when type is missing", () => {
    const spec = { data: DUMMY_DATA, mimeType: "video/mp4" } as never;
    expect(() => buildMediaReferenceFromSpec(spec, "rId1", "video/mp4")).toThrow("media.type is required");
  });
});
