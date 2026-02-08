/**
 * @file Tests for contour extraction with hole preservation
 */
import { extractContours, processContours, type ImageDataLike } from "./contour";

type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const WHITE = 255;
const BLACK = 0;

function createImage(width: number, height: number, fill: number): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    data[offset] = fill;
    data[offset + 1] = fill;
    data[offset + 2] = fill;
    data[offset + 3] = 255;
  }
  return { width, height, data };
}

function fillRect(image: ImageDataLike, rect: Rect, value: number): void {
  const { width, height, data } = image;
  const startX = Math.max(0, rect.x);
  const startY = Math.max(0, rect.y);
  const endX = Math.min(width, rect.x + rect.width);
  const endY = Math.min(height, rect.y + rect.height);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
}

function createHoledRectImage({
  width,
  height,
  outer,
  holes,
}: {
  readonly width: number;
  readonly height: number;
  readonly outer: Rect;
  readonly holes: readonly Rect[];
}): ImageDataLike {
  const image = createImage(width, height, BLACK);
  fillRect(image, outer, WHITE);
  for (const hole of holes) {
    fillRect(image, hole, BLACK);
  }
  return image;
}

function calculateArea(points: readonly { x: number; y: number }[]): number {
  const sum = points.reduce((acc, point, index) => {
    const next = points[(index + 1) % points.length];
    return acc + point.x * next.y - next.x * point.y;
  }, 0);
  return sum / 2;
}

function isPointInPolygon(
  point: { x: number; y: number },
  polygon: readonly { x: number; y: number }[],
): boolean {
  // eslint-disable-next-line no-restricted-syntax -- Performance: ray casting algorithm requires mutable state
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function countContainedContours(paths: readonly { points: readonly { x: number; y: number }[] }[]): {
  readonly outerCount: number;
  readonly holeCount: number;
} {
  const metas = paths.map((path) => ({
    points: path.points,
    area: Math.abs(calculateArea(path.points)),
  }));

  const parentIndices = metas.map((child, childIndex) => {
    const candidates = metas
      .map((parent, parentIndex) => ({ parent, parentIndex }))
      .filter(({ parentIndex }) => parentIndex !== childIndex)
      .filter(({ parent }) => parent.area > child.area)
      .filter(({ parent }) => isPointInPolygon(child.points[0], parent.points));

    if (candidates.length === 0) {
      return null;
    }
    const best = candidates.reduce((currentBest, candidate) => {
      if (!currentBest) {
        return candidate;
      }
      return candidate.parent.area < currentBest.parent.area ? candidate : currentBest;
    }, null as { parent: { area: number }; parentIndex: number } | null);
    return best?.parentIndex ?? null;
  });

  const outerCount = parentIndices.filter((parent) => parent === null).length;
  const holeCount = parentIndices.filter((parent) => parent !== null).length;
  return { outerCount, holeCount };
}

function expectContourHoles(
  image: ImageDataLike,
  expectedOuter: number,
  expectedHoles: number,
): void {
  const raw = extractContours(image);
  const paths = processContours(raw, 1, 0);
  const filteredPaths = paths.filter((path) => Math.abs(calculateArea(path.points)) > 5);
  const { outerCount, holeCount } = countContainedContours(filteredPaths);
  expect(outerCount).toBe(expectedOuter);
  expect(holeCount).toBe(expectedHoles);
}

describe("extractContours", () => {
  it("correctly sets isHole flag based on winding direction", () => {
    // Simple O-shape: outer rectangle with inner hole
    const oImage = createHoledRectImage({
      width: 40,
      height: 40,
      outer: { x: 5, y: 5, width: 30, height: 30 },
      holes: [{ x: 12, y: 12, width: 16, height: 16 }],
    });

    const raw = extractContours(oImage);
    const paths = processContours(raw, 1, 0);

    // Filter out noise
    const significantPaths = paths.filter((p) => Math.abs(calculateArea(p.points)) > 10);

    // Should have exactly 2 paths: 1 outer, 1 hole
    expect(significantPaths.length).toBe(2);

    // Find outer (larger area) and hole (smaller area, contained)
    const sortedByArea = [...significantPaths].sort(
      (a, b) => Math.abs(calculateArea(b.points)) - Math.abs(calculateArea(a.points)),
    );
    const outer = sortedByArea[0];
    const hole = sortedByArea[1];

    // Verify geometric containment
    expect(isPointInPolygon(hole.points[0], outer.points)).toBe(true);

    // Verify isHole flags are correct
    expect(outer.isHole).toBe(false);
    expect(hole.isHole).toBe(true);

    // Verify winding directions (signed area)
    const outerArea = calculateArea(outer.points);
    const holeArea = calculateArea(hole.points);

    // Outer should be positive (CW), hole should be negative (CCW)
    expect(outerArea).toBeGreaterThan(0);
    expect(holeArea).toBeLessThan(0);
  });

  it("produces opposite winding for outer vs hole contours", () => {
    // Test with multiple holes (like letter B)
    const bImage = createHoledRectImage({
      width: 50,
      height: 60,
      outer: { x: 5, y: 5, width: 40, height: 50 },
      holes: [
        { x: 15, y: 10, width: 20, height: 15 },
        { x: 15, y: 30, width: 20, height: 15 },
      ],
    });

    const raw = extractContours(bImage);
    const paths = processContours(raw, 1, 0);
    const significantPaths = paths.filter((p) => Math.abs(calculateArea(p.points)) > 10);

    // Should have 3 paths: 1 outer + 2 holes
    expect(significantPaths.length).toBe(3);

    const outers = significantPaths.filter((p) => !p.isHole);
    const holes = significantPaths.filter((p) => p.isHole);

    expect(outers.length).toBe(1);
    expect(holes.length).toBe(2);

    // All outers should have positive area
    for (const outer of outers) {
      expect(calculateArea(outer.points)).toBeGreaterThan(0);
    }

    // All holes should have negative area
    for (const hole of holes) {
      expect(calculateArea(hole.points)).toBeLessThan(0);
    }
  });

  it("maintains correct winding after Y-flip (for THREE.js compatibility)", () => {
    // Simple O-shape
    const oImage = createHoledRectImage({
      width: 40,
      height: 40,
      outer: { x: 5, y: 5, width: 30, height: 30 },
      holes: [{ x: 12, y: 12, width: 16, height: 16 }],
    });

    const raw = extractContours(oImage);
    const paths = processContours(raw, 1, 0);
    const significantPaths = paths.filter((p) => Math.abs(calculateArea(p.points)) > 10);

    // Find outer and hole
    const outer = significantPaths.find((p) => !p.isHole)!;
    const hole = significantPaths.find((p) => p.isHole)!;

    expect(outer).toBeDefined();
    expect(hole).toBeDefined();

    // Log actual values for debugging
    const outerAreaOriginal = calculateArea(outer.points);
    const holeAreaOriginal = calculateArea(hole.points);
    console.log("=== Contour Extraction Winding Check ===");
    console.log("Outer area (original, screen coords):", outerAreaOriginal, outerAreaOriginal > 0 ? "CW" : "CCW");
    console.log("Hole area (original, screen coords):", holeAreaOriginal, holeAreaOriginal > 0 ? "CW" : "CCW");

    // Simulate Y-flip that happens in THREE.js conversion
    const flipY = (pts: readonly { x: number; y: number }[]) =>
      pts.map((p) => ({ x: p.x, y: -p.y }));

    const outerFlipped = flipY(outer.points);
    const holeFlipped = flipY(hole.points);

    const outerAreaFlipped = calculateArea(outerFlipped);
    const holeAreaFlipped = calculateArea(holeFlipped);

    console.log("Outer area (after Y-flip):", outerAreaFlipped, outerAreaFlipped > 0 ? "CW" : "CCW");
    console.log("Hole area (after Y-flip):", holeAreaFlipped, holeAreaFlipped > 0 ? "CW" : "CCW");
    console.log("THREE.js expects: outer=CCW (negative), hole=CW (positive)");

    // After Y-flip:
    // THREE.js expects: outer=CCW (negative area), hole=CW (positive area)
    // Because Y-flip reverses winding direction
    expect(outerAreaFlipped).toBeLessThan(0); // CCW after flip
    expect(holeAreaFlipped).toBeGreaterThan(0); // CW after flip
  });

  it("extracts A/B/D-style holes for regular stroke weights", () => {
    const aImage = createHoledRectImage({
      width: 32,
      height: 32,
      outer: { x: 4, y: 4, width: 24, height: 24 },
      holes: [{ x: 11, y: 11, width: 10, height: 10 }],
    });
    const bImage = createHoledRectImage({
      width: 36,
      height: 36,
      outer: { x: 4, y: 4, width: 26, height: 28 },
      holes: [
        { x: 12, y: 8, width: 10, height: 8 },
        { x: 12, y: 18, width: 10, height: 8 },
      ],
    });
    const dImage = createHoledRectImage({
      width: 36,
      height: 36,
      outer: { x: 6, y: 4, width: 24, height: 28 },
      holes: [{ x: 12, y: 10, width: 12, height: 14 }],
    });

    expectContourHoles(aImage, 1, 1);
    expectContourHoles(bImage, 1, 2);
    expectContourHoles(dImage, 1, 1);
  });

  it("extracts A/B/D-style holes for bold stroke weights", () => {
    const aImage = createHoledRectImage({
      width: 32,
      height: 32,
      outer: { x: 3, y: 3, width: 26, height: 26 },
      holes: [{ x: 12, y: 12, width: 8, height: 8 }],
    });
    const bImage = createHoledRectImage({
      width: 36,
      height: 36,
      outer: { x: 3, y: 3, width: 28, height: 30 },
      holes: [
        { x: 12, y: 8, width: 9, height: 7 },
        { x: 12, y: 19, width: 9, height: 7 },
      ],
    });
    const dImage = createHoledRectImage({
      width: 36,
      height: 36,
      outer: { x: 5, y: 3, width: 26, height: 30 },
      holes: [{ x: 12, y: 10, width: 10, height: 12 }],
    });

    expectContourHoles(aImage, 1, 1);
    expectContourHoles(bImage, 1, 2);
    expectContourHoles(dImage, 1, 1);
  });
});
