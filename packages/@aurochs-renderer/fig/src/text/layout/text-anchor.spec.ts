/** @file Shared text-anchor mapping tests. */

import { textAlignHorizontalToAnchor } from "./text-anchor";

describe("textAlignHorizontalToAnchor", () => {
  it("maps all fig horizontal text alignments to renderer anchors", () => {
    expect(textAlignHorizontalToAnchor("LEFT")).toBe("start");
    expect(textAlignHorizontalToAnchor("JUSTIFIED")).toBe("start");
    expect(textAlignHorizontalToAnchor("CENTER")).toBe("middle");
    expect(textAlignHorizontalToAnchor("RIGHT")).toBe("end");
  });
});
