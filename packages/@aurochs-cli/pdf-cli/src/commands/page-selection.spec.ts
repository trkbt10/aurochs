/**
 * @file Tests for page selection parsing
 */

import { parseOptionalPageSelection, parsePageSelection } from "./page-selection";

describe("parsePageSelection", () => {
  it("parses single pages and ranges", () => {
    expect(parsePageSelection("1,3-5", 8)).toEqual([1, 3, 4, 5]);
  });

  it("deduplicates and sorts selected pages", () => {
    expect(parsePageSelection("5,3,4,3-5", 8)).toEqual([3, 4, 5]);
  });

  it("throws when page is out of range", () => {
    expect(() => parsePageSelection("1,9", 8)).toThrow("out of range");
  });

  it("throws for invalid token", () => {
    expect(() => parsePageSelection("1,a", 8)).toThrow("Invalid page number");
  });
});

describe("parseOptionalPageSelection", () => {
  it("returns undefined when option is omitted", () => {
    expect(parseOptionalPageSelection(undefined, 3)).toBeUndefined();
  });

  it("parses selection when option is set", () => {
    expect(parseOptionalPageSelection("2-3", 3)).toEqual([2, 3]);
  });
});
