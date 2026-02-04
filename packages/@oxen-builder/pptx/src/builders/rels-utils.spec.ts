/** @file Unit tests for rels-utils shared utilities */
import { getSlideRelsPath } from "./rels-utils";

describe("getSlideRelsPath", () => {
  it("converts slide path to rels path", () => {
    expect(getSlideRelsPath("ppt/slides/slide1.xml")).toBe("ppt/slides/_rels/slide1.xml.rels");
  });

  it("handles different slide numbers", () => {
    expect(getSlideRelsPath("ppt/slides/slide10.xml")).toBe("ppt/slides/_rels/slide10.xml.rels");
  });

  it("handles slideLayout paths", () => {
    expect(getSlideRelsPath("ppt/slideLayouts/slideLayout1.xml")).toBe(
      "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    );
  });
});
