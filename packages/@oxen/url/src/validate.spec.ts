/**
 * @file Tests for URL validation utilities
 */

import { isExternalUrl } from "./validate";

describe("isExternalUrl", () => {
  it("returns true for http URLs", () => {
    expect(isExternalUrl("http://example.com/video.mp4")).toBe(true);
  });

  it("returns true for https URLs", () => {
    expect(isExternalUrl("https://example.com/video.mp4")).toBe(true);
  });

  it("returns true for ftp URLs", () => {
    expect(isExternalUrl("ftp://files.example.com/video.mp4")).toBe(true);
  });

  it("returns true for URLs with IP addresses", () => {
    expect(isExternalUrl("http://192.168.1.1/video.mp4")).toBe(true);
  });

  it("returns true for URLs with ports", () => {
    expect(isExternalUrl("http://example.com:8080/video.mp4")).toBe(true);
  });

  it("returns false for local file paths", () => {
    expect(isExternalUrl("ppt/media/video1.mp4")).toBe(false);
  });

  it("returns false for relative paths", () => {
    expect(isExternalUrl("./video.mp4")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isExternalUrl("")).toBe(false);
  });
});

