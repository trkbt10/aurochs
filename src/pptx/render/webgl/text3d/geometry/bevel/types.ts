/**
 * @file Bevel Geometry Types (Three.js Independent)
 *
 * Core type definitions for bevel geometry generation.
 * These types are independent of any graphics library.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

// =============================================================================
// Basic Types
// =============================================================================

/**
 * 2D vector (Three.js independent)
 */
export type Vector2 = {
  readonly x: number;
  readonly y: number;
};

/**
 * Create a Vector2
 */
export function vec2(x: number, y: number): Vector2 {
  return { x, y };
}

/**
 * Vector2 operations
 */
export const Vec2 = {
  add(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  scale(v: Vector2, s: number): Vector2 {
    return { x: v.x * s, y: v.y * s };
  },

  normalize(v: Vector2): Vector2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) {return { x: 0, y: 0 };}
    return { x: v.x / len, y: v.y / len };
  },

  lengthSq(v: Vector2): number {
    return v.x * v.x + v.y * v.y;
  },

  length(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  negate(v: Vector2): Vector2 {
    return { x: -v.x, y: -v.y };
  },

  /**
   * Perpendicular vector (rotate 90° CCW)
   */
  perpCCW(v: Vector2): Vector2 {
    return { x: -v.y, y: v.x };
  },
} as const;

// =============================================================================
// Bevel Path Types
// =============================================================================

/**
 * A point on a bevel path with its inward normal
 */
export type BevelPathPoint = {
  /** Position on the shape outline */
  readonly position: Vector2;
  /** Inward-facing normal (toward center of shape) */
  readonly normal: Vector2;
  /**
   * Miter length factor for corner handling.
   *
   * At corners, the inset distance must be scaled by this factor to ensure
   * the bevel inner edge aligns with the shrunk shape used for inner cap.
   *
   * miterFactor = 1 / cos(halfAngle) where halfAngle is the angle between
   * the normal and the corner bisector.
   *
   * For straight edges: miterFactor = 1
   * For 90° corners: miterFactor ≈ 1.414
   */
  readonly miterFactor: number;
};

/**
 * A path extracted from a shape for bevel generation
 */
export type BevelPath = {
  /** Ordered points with normals */
  readonly points: readonly BevelPathPoint[];
  /** Whether this is a hole (inner path) */
  readonly isHole: boolean;
  /** Whether the path is closed */
  readonly isClosed: boolean;
};

// =============================================================================
// Bevel Profile Types
// =============================================================================

/**
 * Profile curve point definition for bevel shape.
 *
 * The profile is defined in normalized coordinates:
 * - t: 0 (edge) to 1 (end of bevel)
 * - inset: how far to move inward (0 to 1, scaled by bevel width)
 * - depth: how far to move in Z (0 to 1, scaled by bevel height)
 */
export type BevelProfilePoint = {
  /** Parameter along the profile (0 to 1) */
  readonly t: number;
  /** Inset distance (normalized, 0 = edge, 1 = full width) */
  readonly inset: number;
  /** Depth distance (normalized, 0 = surface, 1 = full height) */
  readonly depth: number;
};

/**
 * Complete bevel profile definition
 */
export type BevelProfile = {
  /** Name of the profile (ECMA-376 preset name) */
  readonly name: string;
  /** Points defining the profile curve */
  readonly points: readonly BevelProfilePoint[];
};

// =============================================================================
// Bevel Configuration Types
// =============================================================================

/**
 * Configuration for bevel generation
 */
export type BevelMeshConfig = {
  /** Bevel width (inset distance on face) - ECMA-376 'w' */
  readonly width: number;
  /** Bevel height (depth in Z direction) - ECMA-376 'h' */
  readonly height: number;
  /** Profile to use */
  readonly profile: BevelProfile;
  /** Z position of the face */
  readonly zPosition: number;
  /** Direction: 1 for front bevel (outward), -1 for back bevel (inward) */
  readonly zDirection: 1 | -1;
};

// =============================================================================
// Output Types
// =============================================================================

/**
 * Raw geometry data (Three.js independent)
 *
 * This can be converted to any graphics library's geometry format.
 */
export type BevelGeometryData = {
  /** Vertex positions (x, y, z for each vertex) */
  readonly positions: Float32Array;
  /** Vertex normals (x, y, z for each vertex) */
  readonly normals: Float32Array;
  /** UV coordinates (u, v for each vertex) */
  readonly uvs: Float32Array;
  /** Triangle indices */
  readonly indices: Uint32Array;
};

/**
 * Create empty geometry data
 */
export function emptyGeometryData(): BevelGeometryData {
  return {
    positions: new Float32Array(0),
    normals: new Float32Array(0),
    uvs: new Float32Array(0),
    indices: new Uint32Array(0),
  };
}

// =============================================================================
// Input Types (for path extraction)
// =============================================================================

/**
 * Shape input for bevel path extraction (Three.js independent)
 *
 * This is a simplified shape representation that can be created from
 * any graphics library's shape type.
 */
export type ShapeInput = {
  /** Points of the outer contour */
  readonly points: readonly Vector2[];
  /** Holes (inner contours) */
  readonly holes: readonly (readonly Vector2[])[];
};
