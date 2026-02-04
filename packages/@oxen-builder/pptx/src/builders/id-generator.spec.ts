/** @file Unit tests for builders/id-generator */
import { generateShapeId } from "./id-generator";

describe("generateShapeId", () => {
  it('returns "1" for empty list', () => {
    expect(generateShapeId([])).toBe("1");
  });

  it("returns max + 1", () => {
    expect(generateShapeId(["1", "5", "3"])).toBe("6");
  });

  it("ignores non-numeric ids", () => {
    expect(generateShapeId(["abc", "2"])).toBe("3");
  });

  it("handles single element", () => {
    expect(generateShapeId(["10"])).toBe("11");
  });

  it("handles all non-numeric ids", () => {
    expect(generateShapeId(["a", "b"])).toBe("1");
  });
});
