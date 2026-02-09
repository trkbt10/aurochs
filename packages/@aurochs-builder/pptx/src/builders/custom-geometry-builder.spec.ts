/** @file Unit tests for custom-geometry-builder */
import { buildCustomGeometryFromSpec } from "./custom-geometry-builder";

describe("buildCustomGeometryFromSpec", () => {
  it("builds simple rectangle path", () => {
    const geom = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 50,
          commands: [
            { type: "moveTo", x: 0, y: 0 },
            { type: "lineTo", x: 100, y: 0 },
            { type: "lineTo", x: 100, y: 50 },
            { type: "lineTo", x: 0, y: 50 },
            { type: "close" },
          ],
        },
      ],
    });
    expect(geom.type).toBe("custom");
    expect(geom.paths).toHaveLength(1);
    expect(geom.paths[0].commands).toHaveLength(5);
    expect(geom.paths[0].width).toBe(100);
    expect(geom.paths[0].height).toBe(50);
  });

  it("builds arcTo command", () => {
    const geom = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 100,
          commands: [
            { type: "moveTo", x: 0, y: 50 },
            { type: "arcTo", widthRadius: 50, heightRadius: 50, startAngle: 0, swingAngle: 180 },
          ],
        },
      ],
    });
    const arc = geom.paths[0].commands[1];
    expect(arc.type).toBe("arcTo");
    if (arc.type === "arcTo") {
      expect(arc.widthRadius).toBe(50);
      expect(arc.heightRadius).toBe(50);
      expect(arc.startAngle).toBe(0);
      expect(arc.swingAngle).toBe(180);
    }
  });

  it("builds quadBezierTo command", () => {
    const geom = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 100,
          commands: [
            { type: "moveTo", x: 0, y: 0 },
            { type: "quadBezierTo", control: { x: 50, y: 100 }, end: { x: 100, y: 0 } },
          ],
        },
      ],
    });
    const quad = geom.paths[0].commands[1];
    expect(quad.type).toBe("quadBezierTo");
  });

  it("builds cubicBezierTo command", () => {
    const geom = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 100,
          commands: [
            { type: "moveTo", x: 0, y: 0 },
            {
              type: "cubicBezierTo",
              control1: { x: 30, y: 100 },
              control2: { x: 70, y: 100 },
              end: { x: 100, y: 0 },
            },
          ],
        },
      ],
    });
    const cubic = geom.paths[0].commands[1];
    expect(cubic.type).toBe("cubicBezierTo");
  });

  it("passes fill and stroke through", () => {
    const geom = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 100,
          fill: "norm",
          stroke: true,
          commands: [{ type: "moveTo", x: 0, y: 0 }, { type: "close" }],
        },
      ],
    });
    expect(geom.paths[0].fill).toBe("norm");
    expect(geom.paths[0].stroke).toBe(true);
  });

  it("throws when spec is falsy", () => {
    expect(() => buildCustomGeometryFromSpec(null as never)).toThrow("customGeometry is required");
  });

  it("throws when paths is empty", () => {
    expect(() => buildCustomGeometryFromSpec({ paths: [] })).toThrow("customGeometry.paths is required");
  });

  it("throws when commands is empty", () => {
    expect(() =>
      buildCustomGeometryFromSpec({
        paths: [{ width: 100, height: 100, commands: [] }],
      }),
    ).toThrow("path.commands is required");
  });

  it("throws when moveTo.x is missing", () => {
    expect(() =>
      buildCustomGeometryFromSpec({
        paths: [
          {
            width: 100,
            height: 100,
            commands: [{ type: "moveTo", y: 0 } as never],
          },
        ],
      }),
    ).toThrow("moveTo.x is required");
  });
});
