/** @file Unit tests for media-embed-builder */
import { detectEmbeddedMediaType, buildMediaReferenceFromSpec } from "./media-embed-builder";
import type { MediaEmbedSpec } from "../types";

describe("detectEmbeddedMediaType", () => {
  it("detects mp4 video", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.mp4" };
    expect(detectEmbeddedMediaType(spec)).toBe("video/mp4");
  });

  it("detects webm video", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.webm" };
    expect(detectEmbeddedMediaType(spec)).toBe("video/webm");
  });

  it("detects mov video", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.mov" };
    expect(detectEmbeddedMediaType(spec)).toBe("video/quicktime");
  });

  it("detects mp3 audio", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.mp3" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/mpeg");
  });

  it("detects wav audio", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.wav" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/wav");
  });

  it("detects m4a audio", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.m4a" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/mp4");
  });

  it("detects ogg audio", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.ogg" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/ogg");
  });

  it("prefers explicit mimeType", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.mp4", mimeType: "video/webm" };
    expect(detectEmbeddedMediaType(spec)).toBe("video/webm");
  });

  it("uses mimeType when data is provided", () => {
    const spec: MediaEmbedSpec = { type: "audio", data: new Uint8Array([1]), mimeType: "audio/wav" };
    expect(detectEmbeddedMediaType(spec)).toBe("audio/wav");
  });

  it("throws for unsupported video extension", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.avi" };
    expect(() => detectEmbeddedMediaType(spec)).toThrow("Unsupported video extension");
  });

  it("throws for unsupported audio extension", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.flac" };
    expect(() => detectEmbeddedMediaType(spec)).toThrow("Unsupported audio extension");
  });
});

describe("buildMediaReferenceFromSpec", () => {
  it("builds video reference", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.mp4" };
    const result = buildMediaReferenceFromSpec(spec, "rId5", "video/mp4");
    expect(result.mediaType).toBe("video");
    expect(result.media.videoFile).toEqual({ link: "rId5", contentType: "video/mp4" });
  });

  it("builds audio reference", () => {
    const spec: MediaEmbedSpec = { type: "audio", path: "sound.mp3" };
    const result = buildMediaReferenceFromSpec(spec, "rId6", "audio/mpeg");
    expect(result.mediaType).toBe("audio");
    expect(result.media.audioFile).toEqual({ link: "rId6", contentType: "audio/mpeg" });
  });

  it("throws when spec is missing", () => {
    expect(() => buildMediaReferenceFromSpec(null as never, "rId1", "video/mp4")).toThrow("media spec is required");
  });

  it("throws when rId is missing", () => {
    const spec: MediaEmbedSpec = { type: "video", path: "clip.mp4" };
    expect(() => buildMediaReferenceFromSpec(spec, "", "video/mp4")).toThrow("media rId is required");
  });

  it("throws when type is missing", () => {
    const spec = { path: "clip.mp4" } as never;
    expect(() => buildMediaReferenceFromSpec(spec, "rId1", "video/mp4")).toThrow("media.type is required");
  });

  it("throws when neither path nor data is provided", () => {
    const spec = { type: "video" } as MediaEmbedSpec;
    expect(() => buildMediaReferenceFromSpec(spec, "rId1", "video/mp4")).toThrow(
      "media.path or media.data is required",
    );
  });
});

describe("detectEmbeddedMediaType edge cases", () => {
  it("throws for unknown media type", () => {
    const spec = { type: "subtitle", path: "file.srt" } as never;
    expect(() => detectEmbeddedMediaType(spec)).toThrow("Unsupported media type");
  });
});
