/** @file Unit tests for line-properties builder */
import { buildLine, buildLineEnd, buildLineFromSpec } from "./line-properties";

describe("buildLineEnd", () => {
  it("builds with defaults", () => {
    const end = buildLineEnd({ type: "triangle" });
    expect(end.type).toBe("triangle");
    expect(end.width).toBe("med");
    expect(end.length).toBe("med");
  });

  it("maps type values", () => {
    expect(buildLineEnd({ type: "stealth" }).type).toBe("stealth");
    expect(buildLineEnd({ type: "diamond" }).type).toBe("diamond");
    expect(buildLineEnd({ type: "oval" }).type).toBe("oval");
    expect(buildLineEnd({ type: "arrow" }).type).toBe("arrow");
    expect(buildLineEnd({ type: "none" }).type).toBe("none");
  });

  it("maps size values", () => {
    const end = buildLineEnd({ type: "triangle", width: "lg", length: "sm" });
    expect(end.width).toBe("lg");
    expect(end.length).toBe("sm");
  });

  it("defaults unknown type to none", () => {
    const end = buildLineEnd({ type: "bogus" } as never);
    expect(end.type).toBe("none");
  });
});

describe("buildLineFromSpec", () => {
  it("builds from hex string color", () => {
    const line = buildLineFromSpec("FF0000", 2);
    expect(line.width).toBe(2);
    expect(line.fill.type).toBe("solidFill");
  });

  it("builds from theme color spec", () => {
    const line = buildLineFromSpec({ theme: "accent1" }, 1);
    expect(line.fill.type).toBe("solidFill");
  });

  it("passes options through", () => {
    const line = buildLineFromSpec("000000", 1, {
      cap: "round",
      join: "bevel",
      dash: "dash",
      compound: "dbl",
    });
    expect(line.cap).toBe("round");
    expect(line.join).toBe("bevel");
    expect(line.dash).toBe("dash");
    expect(line.compound).toBe("dbl");
  });

  it("builds head and tail ends", () => {
    const line = buildLineFromSpec("000000", 1, {
      headEnd: { type: "triangle", width: "lg" },
      tailEnd: { type: "stealth", length: "sm" },
    });
    expect(line.headEnd?.type).toBe("triangle");
    expect(line.tailEnd?.type).toBe("stealth");
  });
});

describe("buildLine", () => {
  it("defaults cap to flat", () => {
    const line = buildLine("000000", 1);
    expect(line.cap).toBe("flat");
  });

  it("accepts cap round", () => {
    const line = buildLine("000000", 1, { cap: "round" });
    expect(line.cap).toBe("round");
  });

  it("accepts cap square", () => {
    const line = buildLine("000000", 1, { cap: "square" });
    expect(line.cap).toBe("square");
  });

  it("defaults join to round", () => {
    const line = buildLine("000000", 1);
    expect(line.join).toBe("round");
  });

  it("accepts join bevel", () => {
    const line = buildLine("000000", 1, { join: "bevel" });
    expect(line.join).toBe("bevel");
  });

  it("defaults compound to sng", () => {
    const line = buildLine("000000", 1);
    expect(line.compound).toBe("sng");
  });

  it("accepts compound dbl", () => {
    const line = buildLine("000000", 1, { compound: "dbl" });
    expect(line.compound).toBe("dbl");
  });

  it("defaults dash to solid", () => {
    const line = buildLine("000000", 1);
    expect(line.dash).toBe("solid");
  });

  it("accepts dash dashDot", () => {
    const line = buildLine("000000", 1, { dash: "dashDot" });
    expect(line.dash).toBe("dashDot");
  });

  it("strips # from line color", () => {
    const line = buildLine("#FF0000", 2);
    if (line.fill.type === "solidFill") {
      expect(line.fill.color.spec).toEqual({ type: "srgb", value: "FF0000" });
    }
  });

  it("builds with head and tail ends", () => {
    const line = buildLine("000000", 1, {
      headEnd: { type: "triangle" },
      tailEnd: { type: "arrow", width: "lg", length: "lg" },
    });
    expect(line.headEnd?.type).toBe("triangle");
    expect(line.tailEnd?.type).toBe("arrow");
    expect(line.tailEnd?.width).toBe("lg");
  });

  it("omits ends when not specified", () => {
    const line = buildLine("000000", 1);
    expect(line.headEnd).toBeUndefined();
    expect(line.tailEnd).toBeUndefined();
  });
});
