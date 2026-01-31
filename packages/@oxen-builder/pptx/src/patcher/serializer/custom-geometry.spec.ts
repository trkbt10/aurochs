/** @file Unit tests for custom geometry serialization */
import { getChild, getChildren } from "@oxen/xml";
import type { Degrees, Pixels } from "@oxen-office/ooxml/domain/units";
import type { CustomGeometry, GeometryPath, PathCommand } from "@oxen-office/pptx/domain/shape";
import {
  serializeCustomGeometry,
  serializeGeometryPath,
  serializePathCommand,
} from "./custom-geometry";

describe("serializePathCommand", () => {
  it("serializes moveTo command", () => {
    const cmd: PathCommand = {
      type: "moveTo",
      point: { x: 10 as Pixels, y: 20 as Pixels },
    };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:moveTo");
    const pt = getChild(el, "a:pt");
    expect(pt).toBeDefined();
    expect(pt!.attrs.x).toBe("95250"); // 10 * 9525
    expect(pt!.attrs.y).toBe("190500"); // 20 * 9525
  });

  it("serializes lineTo command", () => {
    const cmd: PathCommand = {
      type: "lineTo",
      point: { x: 30 as Pixels, y: 40 as Pixels },
    };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:lnTo");
    const pt = getChild(el, "a:pt");
    expect(pt).toBeDefined();
  });

  it("serializes arcTo command", () => {
    const cmd: PathCommand = {
      type: "arcTo",
      widthRadius: 50 as Pixels,
      heightRadius: 50 as Pixels,
      startAngle: 0 as Degrees,
      swingAngle: 90 as Degrees,
    };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:arcTo");
    expect(el.attrs.wR).toBe("476250"); // 50 * 9525
    expect(el.attrs.hR).toBe("476250");
    expect(el.attrs.stAng).toBe("0"); // 0 * 60000
    expect(el.attrs.swAng).toBe("5400000"); // 90 * 60000
  });

  it("serializes quadBezierTo command", () => {
    const cmd: PathCommand = {
      type: "quadBezierTo",
      control: { x: 25 as Pixels, y: 0 as Pixels },
      end: { x: 50 as Pixels, y: 50 as Pixels },
    };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:quadBezTo");
    const pts = getChildren(el, "a:pt");
    expect(pts.length).toBe(2);
  });

  it("serializes cubicBezierTo command", () => {
    const cmd: PathCommand = {
      type: "cubicBezierTo",
      control1: { x: 10 as Pixels, y: 0 as Pixels },
      control2: { x: 40 as Pixels, y: 50 as Pixels },
      end: { x: 50 as Pixels, y: 50 as Pixels },
    };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:cubicBezTo");
    const pts = getChildren(el, "a:pt");
    expect(pts.length).toBe(3);
  });

  it("serializes close command", () => {
    const cmd: PathCommand = { type: "close" };
    const el = serializePathCommand(cmd);

    expect(el.name).toBe("a:close");
    expect(el.children.length).toBe(0);
  });
});

describe("serializeGeometryPath", () => {
  it("serializes a path with default attributes", () => {
    const path: GeometryPath = {
      width: 100 as Pixels,
      height: 100 as Pixels,
      fill: "norm",
      stroke: true,
      extrusionOk: true,
      commands: [
        { type: "moveTo", point: { x: 0 as Pixels, y: 0 as Pixels } },
        { type: "lineTo", point: { x: 100 as Pixels, y: 100 as Pixels } },
        { type: "close" },
      ],
    };
    const el = serializeGeometryPath(path);

    expect(el.name).toBe("a:path");
    expect(el.attrs.w).toBe("952500");
    expect(el.attrs.h).toBe("952500");
    expect(el.attrs.fill).toBeUndefined(); // "norm" is default, not serialized
    expect(el.attrs.stroke).toBeUndefined(); // true is default, not serialized
    expect(el.attrs.extrusionOk).toBeUndefined(); // true is default, not serialized
    expect(el.children.length).toBe(3);
  });

  it("serializes non-default attributes", () => {
    const path: GeometryPath = {
      width: 50 as Pixels,
      height: 50 as Pixels,
      fill: "none",
      stroke: false,
      extrusionOk: false,
      commands: [{ type: "close" }],
    };
    const el = serializeGeometryPath(path);

    expect(el.attrs.fill).toBe("none");
    expect(el.attrs.stroke).toBe("0");
    expect(el.attrs.extrusionOk).toBe("0");
  });
});

describe("serializeCustomGeometry", () => {
  it("serializes a custom geometry with required elements", () => {
    const geom: CustomGeometry = {
      type: "custom",
      paths: [
        {
          width: 100 as Pixels,
          height: 100 as Pixels,
          fill: "norm",
          stroke: true,
          extrusionOk: true,
          commands: [
            { type: "moveTo", point: { x: 0 as Pixels, y: 0 as Pixels } },
            { type: "lineTo", point: { x: 100 as Pixels, y: 100 as Pixels } },
            { type: "close" },
          ],
        },
      ],
    };
    const el = serializeCustomGeometry(geom);

    expect(el.name).toBe("a:custGeom");

    const avLst = getChild(el, "a:avLst");
    expect(avLst).toBeDefined();

    const pathLst = getChild(el, "a:pathLst");
    expect(pathLst).toBeDefined();

    const paths = getChildren(pathLst!, "a:path");
    expect(paths.length).toBe(1);
  });

  it("throws for empty paths", () => {
    const geom: CustomGeometry = {
      type: "custom",
      paths: [],
    };

    expect(() => serializeCustomGeometry(geom)).toThrow("paths must not be empty");
  });

  it("serializes multiple paths", () => {
    const geom: CustomGeometry = {
      type: "custom",
      paths: [
        {
          width: 50 as Pixels,
          height: 50 as Pixels,
          fill: "norm",
          stroke: true,
          extrusionOk: true,
          commands: [{ type: "close" }],
        },
        {
          width: 100 as Pixels,
          height: 100 as Pixels,
          fill: "norm",
          stroke: true,
          extrusionOk: true,
          commands: [{ type: "close" }],
        },
      ],
    };
    const el = serializeCustomGeometry(geom);

    const pathLst = getChild(el, "a:pathLst");
    const paths = getChildren(pathLst!, "a:path");
    expect(paths.length).toBe(2);
  });

  it("serializes textRect if present", () => {
    const geom: CustomGeometry = {
      type: "custom",
      paths: [
        {
          width: 100 as Pixels,
          height: 100 as Pixels,
          fill: "norm",
          stroke: true,
          extrusionOk: true,
          commands: [{ type: "close" }],
        },
      ],
      textRect: {
        left: "l",
        top: "t",
        right: "r",
        bottom: "b",
      },
    };
    const el = serializeCustomGeometry(geom);

    const rect = getChild(el, "a:rect");
    expect(rect).toBeDefined();
    expect(rect!.attrs.l).toBe("l");
    expect(rect!.attrs.t).toBe("t");
    expect(rect!.attrs.r).toBe("r");
    expect(rect!.attrs.b).toBe("b");
  });
});
