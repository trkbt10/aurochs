/**
 * @file Tests for numFmt section picker
 */

import { pickFormatSection } from "./section-picker";

describe("pickFormatSection", () => {
  it("picks positive/negative/zero sections by sign when no conditions exist", () => {
    expect(pickFormatSection("0.0;-0.0;\"Z\"", 1.2)).toEqual({ section: "0.0", hasNegativeSection: true });
    expect(pickFormatSection("0.0;-0.0;\"Z\"", -1.2)).toEqual({ section: "-0.0", hasNegativeSection: true });
    expect(pickFormatSection("0.0;-0.0;\"Z\"", 0)).toEqual({ section: "\"Z\"", hasNegativeSection: true });
  });

  it("respects leading numeric conditions", () => {
    expect(pickFormatSection("[<10]0;0", 5)).toEqual({ section: "[<10]0", hasNegativeSection: true });
    expect(pickFormatSection("[<10]0;0", 10)).toEqual({ section: "0", hasNegativeSection: true });
  });
});

