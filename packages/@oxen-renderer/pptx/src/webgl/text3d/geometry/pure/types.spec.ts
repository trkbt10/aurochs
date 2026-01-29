/**
 * @file Tests for pure geometry types
 */

import {
  point2d,
  point3d,
  emptyShape,
  shapeFromPoints,
  shapeWithHoles,
  emptyGeometry,
  getVertexCount,
  getTriangleCount,
  isGeometryEmpty,
  computeBoundingBox,
  getBoundingBoxSize,
  getBoundingBoxCenter,
} from "./types";

describe("Point2D", () => {
  it("creates 2D point", () => {
    const p = point2d(3, 4);
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
  });
});

describe("Point3D", () => {
  it("creates 3D point", () => {
    const p = point3d(1, 2, 3);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.z).toBe(3);
  });
});

describe("ShapeData", () => {
  it("creates empty shape", () => {
    const shape = emptyShape();
    expect(shape.points).toHaveLength(0);
    expect(shape.holes).toHaveLength(0);
  });

  it("creates shape from points", () => {
    const points = [point2d(0, 0), point2d(10, 0), point2d(10, 10)];
    const shape = shapeFromPoints(points);
    expect(shape.points).toHaveLength(3);
    expect(shape.holes).toHaveLength(0);
  });

  it("creates shape with holes", () => {
    const outer = [point2d(0, 0), point2d(100, 0), point2d(100, 100), point2d(0, 100)];
    const hole = [point2d(25, 25), point2d(75, 25), point2d(75, 75), point2d(25, 75)];
    const shape = shapeWithHoles(outer, [hole]);
    expect(shape.points).toHaveLength(4);
    expect(shape.holes).toHaveLength(1);
    expect(shape.holes[0]).toHaveLength(4);
  });
});

describe("GeometryData", () => {
  it("creates empty geometry", () => {
    const geom = emptyGeometry();
    expect(geom.positions).toHaveLength(0);
    expect(geom.normals).toHaveLength(0);
    expect(geom.uvs).toHaveLength(0);
    expect(geom.indices).toHaveLength(0);
  });

  it("calculates vertex count", () => {
    const geom = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]), // 3 vertices
      normals: new Float32Array(9),
      uvs: new Float32Array(6),
      indices: new Uint32Array([0, 1, 2]),
    };
    expect(getVertexCount(geom)).toBe(3);
  });

  it("calculates triangle count", () => {
    const geom = {
      positions: new Float32Array(12), // 4 vertices
      normals: new Float32Array(12),
      uvs: new Float32Array(8),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]), // 2 triangles
    };
    expect(getTriangleCount(geom)).toBe(2);
  });

  it("checks if geometry is empty", () => {
    expect(isGeometryEmpty(emptyGeometry())).toBe(true);
    expect(isGeometryEmpty({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array(3),
      uvs: new Float32Array(2),
      indices: new Uint32Array(0),
    })).toBe(false);
  });
});

describe("BoundingBox", () => {
  it("computes bounding box", () => {
    const geom = {
      positions: new Float32Array([
        0, 0, 0,
        10, 5, 2,
        -5, 10, -3,
      ]),
      normals: new Float32Array(9),
      uvs: new Float32Array(6),
      indices: new Uint32Array([0, 1, 2]),
    };

    const box = computeBoundingBox(geom);
    expect(box.min.x).toBe(-5);
    expect(box.min.y).toBe(0);
    expect(box.min.z).toBe(-3);
    expect(box.max.x).toBe(10);
    expect(box.max.y).toBe(10);
    expect(box.max.z).toBe(2);
  });

  it("computes bounding box size", () => {
    const box = {
      min: point3d(0, 0, 0),
      max: point3d(10, 20, 30),
    };
    const size = getBoundingBoxSize(box);
    expect(size.x).toBe(10);
    expect(size.y).toBe(20);
    expect(size.z).toBe(30);
  });

  it("computes bounding box center", () => {
    const box = {
      min: point3d(0, 0, 0),
      max: point3d(10, 20, 30),
    };
    const center = getBoundingBoxCenter(box);
    expect(center.x).toBe(5);
    expect(center.y).toBe(10);
    expect(center.z).toBe(15);
  });

  it("handles empty geometry", () => {
    const box = computeBoundingBox(emptyGeometry());
    expect(box.min.x).toBe(0);
    expect(box.min.y).toBe(0);
    expect(box.min.z).toBe(0);
    expect(box.max.x).toBe(0);
    expect(box.max.y).toBe(0);
    expect(box.max.z).toBe(0);
  });
});
