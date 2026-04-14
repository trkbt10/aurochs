/**
 * Type definitions for path-bool (vendored)
 *
 * Original: https://github.com/nicbarker/path-bool (npm: path-bool@0.0.7)
 * Author: Adam Platkevič <rflashster@gmail.com>
 * License: MIT (see LICENSE in this directory)
 */

export type Vector = [number, number];

export type PathLineSegment = ["L", Vector, Vector];
export type PathCubicSegment = ["C", Vector, Vector, Vector, Vector];
export type PathQuadraticSegment = ["Q", Vector, Vector, Vector];
export type PathArcSegment = [
  "A",
  Vector,
  number,
  number,
  number,
  boolean,
  boolean,
  Vector,
];
export type PathSegment =
  | PathLineSegment
  | PathCubicSegment
  | PathQuadraticSegment
  | PathArcSegment;

export type Path = PathSegment[];

export type AbsolutePathCommand =
  | ["M", Vector]
  | ["L", Vector]
  | ["C", Vector, Vector, Vector]
  | ["S", Vector, Vector]
  | ["Q", Vector, Vector]
  | ["T", Vector]
  | ["A", number, number, number, boolean, boolean, Vector]
  | ["Z"]
  | ["z"];

export type PathCommand = AbsolutePathCommand;

export declare enum PathBooleanOperation {
  Union = 0,
  Difference = 1,
  Intersection = 2,
  Exclusion = 3,
  Division = 4,
  Fracture = 5,
}

export declare enum FillRule {
  NonZero = 0,
  EvenOdd = 1,
}

export declare function pathBoolean(
  a: Path,
  aFillRule: FillRule,
  b: Path,
  bFillRule: FillRule,
  op: PathBooleanOperation,
): Path[];

export declare function pathFromPathData(d: string): Path;
export declare function pathToPathData(path: Path, eps?: number): string;
export declare function commandsFromPathData(
  d: string,
): Iterable<PathCommand>;
export declare function pathFromCommands(
  commands: Iterable<PathCommand>,
): Iterable<PathSegment>;
export declare function pathToCommands(
  segments: Iterable<PathSegment>,
  eps?: number,
): Iterable<PathCommand>;

export declare function arcSegmentToCubics(
  arc: PathArcSegment,
  maxDeltaTheta?: number,
): PathCubicSegment[] | [PathLineSegment];

export declare function pathSegmentBoundingBox(seg: PathSegment): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export declare const samplePathSegmentAt: (
  seg: PathSegment,
  t: number,
) => Vector;

export declare function pathSegmentIntersection(
  a: PathSegment,
  b: PathSegment,
): [number, number][];

export declare function pathCubicSegmentSelfIntersection(
  seg: PathCubicSegment,
): [number, number] | null;
