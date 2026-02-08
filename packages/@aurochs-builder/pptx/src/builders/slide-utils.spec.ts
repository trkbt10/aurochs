/** @file Unit tests for slide-utils */
import { getShapeId } from "./slide-utils";

describe("getShapeId", () => {
  it("returns nonVisual id for regular shapes", () => {
    expect(getShapeId({ type: "sp", nonVisual: { id: "5" } })).toBe("5");
  });

  it('returns "0" for contentPart shapes', () => {
    expect(getShapeId({ type: "contentPart", nonVisual: { id: "10" } })).toBe("0");
  });

  it('returns "0" when nonVisual is undefined', () => {
    expect(getShapeId({ type: "sp" })).toBe("0");
  });

  it('returns "0" when nonVisual.id is undefined', () => {
    expect(getShapeId({ type: "sp", nonVisual: {} as { id: string } })).toBe("0");
  });
});
