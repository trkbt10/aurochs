/**
 * @file ZIP utilities tests
 */

import {
  getRelationshipsPath,
  normalizePath,
  getPartDirectory,
  resolvePartPath,
} from "./zip-utils";

describe("zip-utils", () => {
  describe("getRelationshipsPath", () => {
    it("converts slide path to rels path", () => {
      expect(getRelationshipsPath("ppt/slides/slide1.xml")).toBe(
        "ppt/slides/_rels/slide1.xml.rels",
      );
    });

    it("converts presentation path to rels path", () => {
      expect(getRelationshipsPath("ppt/presentation.xml")).toBe(
        "ppt/_rels/presentation.xml.rels",
      );
    });

    it("converts document path to rels path", () => {
      expect(getRelationshipsPath("word/document.xml")).toBe(
        "word/_rels/document.xml.rels",
      );
    });
  });

  describe("normalizePath", () => {
    it("removes leading slash", () => {
      expect(normalizePath("/ppt/slides/slide1.xml")).toBe("ppt/slides/slide1.xml");
    });

    it("preserves path without leading slash", () => {
      expect(normalizePath("ppt/slides/slide1.xml")).toBe("ppt/slides/slide1.xml");
    });
  });

  describe("getPartDirectory", () => {
    it("extracts directory from path", () => {
      expect(getPartDirectory("ppt/slides/slide1.xml")).toBe("ppt/slides");
    });

    it("returns empty string for root level files", () => {
      expect(getPartDirectory("[Content_Types].xml")).toBe("");
    });

    it("handles nested paths", () => {
      expect(getPartDirectory("ppt/slideLayouts/_rels/slideLayout1.xml.rels")).toBe(
        "ppt/slideLayouts/_rels",
      );
    });
  });

  describe("resolvePartPath", () => {
    it("resolves relative path", () => {
      expect(resolvePartPath("ppt/slides/slide1.xml", "../media/image1.png")).toBe(
        "ppt/media/image1.png",
      );
    });

    it("resolves absolute path", () => {
      expect(resolvePartPath("ppt/slides/slide1.xml", "/ppt/theme/theme1.xml")).toBe(
        "ppt/theme/theme1.xml",
      );
    });

    it("resolves same directory path", () => {
      expect(resolvePartPath("ppt/slides/slide1.xml", "slide2.xml")).toBe(
        "ppt/slides/slide2.xml",
      );
    });

    it("handles multiple parent traversals", () => {
      expect(resolvePartPath("ppt/slides/slide1.xml", "../../docProps/core.xml")).toBe(
        "docProps/core.xml",
      );
    });
  });
});
