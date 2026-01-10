/**
 * @file slide-id-manager unit tests
 */

import { generateSlideId, generateSlideRId } from "./slide-id-manager";

describe("slide-id-manager", () => {
  it("generates slide IDs starting from 256", () => {
    expect(generateSlideId([])).toBe(256);
    expect(generateSlideId([1, 2, 3])).toBe(256);
  });

  it("generates slide IDs as max(existing)+1", () => {
    expect(generateSlideId([256, 257, 258])).toBe(259);
    expect(generateSlideId([256, 300, 257])).toBe(301);
  });

  it("generates relationship IDs (rIdN)", () => {
    expect(generateSlideRId([])).toBe("rId1");
    expect(generateSlideRId(["rId1", "rId2"])).toBe("rId3");
    expect(generateSlideRId(["rId9", "rId3"])).toBe("rId10");
    expect(generateSlideRId(["foo", "rId2"])).toBe("rId3");
  });
});

