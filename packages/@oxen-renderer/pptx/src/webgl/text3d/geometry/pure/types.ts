/**
 * @file Pure Geometry Types
 *
 * Renderer-agnostic geometry data types. These types represent geometry
 * as raw typed arrays, independent of any rendering library (Three.js, WebGPU, etc.).
 *
 * ## Design Principles
 *
 * 1. **No renderer dependencies** - Only uses standard TypeScript/JavaScript types
 * 2. **Immutable by convention** - Use `readonly` for all properties
 * 3. **Composable** - Types can be combined to build complex geometries
 * 4. **Serializable** - All types can be serialized to JSON or transferred to workers
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// =============================================================================
// Basic Types
// =============================================================================

/**
 * 2D point/vector (x, y coordinates)
 */
export type Point2D = {
  readonly x: number;
  readonly y: number;
};

/**
 * 3D point/vector (x, y, z coordinates)
 */
export type Point3D = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/**
 * Create a Point2D
 */
export function point2d(x: number, y: number): Point2D {
  return { x, y };
}

/**
 * Create a Point3D
 */
export function point3d(x: number, y: number, z: number): Point3D {
  return { x, y, z };
}

// =============================================================================
// Shape Types (2D paths for extrusion)
// =============================================================================

/**
 * A 2D shape defined by an outer contour and optional holes.
 *
 * This is the input format for extrusion operations.
 * Points should be in counter-clockwise order for outer contour,
 * clockwise for holes.
 */
export type ShapeData = {
  /** Outer contour points */
  readonly points: readonly Point2D[];
  /** Hole contours (each hole is an array of points) */
  readonly holes: readonly (readonly Point2D[])[];
};

/**
 * Create an empty shape
 */
export function emptyShape(): ShapeData {
  return { points: [], holes: [] };
}

/**
 * Create a shape from points (no holes)
 */
export function shapeFromPoints(points: readonly Point2D[]): ShapeData {
  return { points, holes: [] };
}

/**
 * Create a shape with holes
 */
export function shapeWithHoles(
  points: readonly Point2D[],
  holes: readonly (readonly Point2D[])[],
): ShapeData {
  return { points, holes };
}

// =============================================================================
// Geometry Data Types (3D mesh data)
// =============================================================================

/**
 * Raw geometry data as typed arrays.
 *
 * This is the universal geometry format that can be converted to any
 * renderer's native format (THREE.BufferGeometry, WebGPU buffers, etc.).
 *
 * ## Attribute Layout
 *
 * - **positions**: Float32Array, 3 components per vertex (x, y, z)
 * - **normals**: Float32Array, 3 components per vertex (nx, ny, nz)
 * - **uvs**: Float32Array, 2 components per vertex (u, v)
 * - **indices**: Uint32Array, 1 component per index (vertex index)
 */
export type GeometryData = {
  /** Vertex positions (x, y, z) */
  readonly positions: Float32Array;
  /** Vertex normals (nx, ny, nz) */
  readonly normals: Float32Array;
  /** Texture coordinates (u, v) */
  readonly uvs: Float32Array;
  /** Triangle indices (3 per triangle) */
  readonly indices: Uint32Array;
};

/**
 * Create an empty GeometryData
 */
export function emptyGeometry(): GeometryData {
  return {
    positions: new Float32Array(0),
    normals: new Float32Array(0),
    uvs: new Float32Array(0),
    indices: new Uint32Array(0),
  };
}

/**
 * Get vertex count from geometry
 */
export function getVertexCount(geometry: GeometryData): number {
  return geometry.positions.length / 3;
}

/**
 * Get triangle count from geometry
 */
export function getTriangleCount(geometry: GeometryData): number {
  return geometry.indices.length / 3;
}

/**
 * Check if geometry is empty
 */
export function isGeometryEmpty(geometry: GeometryData): boolean {
  return geometry.positions.length === 0;
}

// =============================================================================
// Geometry Bounds
// =============================================================================

/**
 * Axis-aligned bounding box in 3D
 */
export type BoundingBox3D = {
  readonly min: Point3D;
  readonly max: Point3D;
};

/**
 * Compute bounding box of geometry
 */
export function computeBoundingBox(geometry: GeometryData): BoundingBox3D {
  const positions = geometry.positions;

  if (positions.length === 0) {
    return {
      min: point3d(0, 0, 0),
      max: point3d(0, 0, 0),
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return {
    min: point3d(minX, minY, minZ),
    max: point3d(maxX, maxY, maxZ),
  };
}

/**
 * Get size of bounding box
 */
export function getBoundingBoxSize(box: BoundingBox3D): Point3D {
  return point3d(
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  );
}

/**
 * Get center of bounding box
 */
export function getBoundingBoxCenter(box: BoundingBox3D): Point3D {
  return point3d(
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
    (box.min.z + box.max.z) / 2,
  );
}

// =============================================================================
// Extended Geometry Data (with custom attributes)
// =============================================================================

/**
 * Extended geometry data with support for custom attributes.
 *
 * Use this when you need to attach additional per-vertex data
 * beyond the standard position/normal/uv.
 */
export type ExtendedGeometryData = GeometryData & {
  /** Custom attributes (name → Float32Array with consistent component count) */
  readonly customAttributes: Readonly<Record<string, Float32Array>>;
  /** Component count for each custom attribute */
  readonly customAttributeSizes: Readonly<Record<string, number>>;
};

/**
 * Create extended geometry from base geometry
 */
export function extendGeometry(
  base: GeometryData,
  customAttributes: Record<string, Float32Array> = {},
  customAttributeSizes: Record<string, number> = {},
): ExtendedGeometryData {
  return {
    ...base,
    customAttributes,
    customAttributeSizes,
  };
}
