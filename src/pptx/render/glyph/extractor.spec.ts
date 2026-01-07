/**
 * @file Tests for contour extraction with hole preservation
 */
import { extractContours, processContours, type ImageDataLike } from "./contour-extraction";

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

function createHoledRectImage(
  width: number,
  height: number,
  outer: Rect,
  holes: readonly Rect[],
): ImageDataLike {
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
  it("extracts A/B/D-style holes for regular stroke weights", () => {
    const aImage = createHoledRectImage(
      32,
      32,
      { x: 4, y: 4, width: 24, height: 24 },
      [{ x: 11, y: 11, width: 10, height: 10 }],
    );
    const bImage = createHoledRectImage(
      36,
      36,
      { x: 4, y: 4, width: 26, height: 28 },
      [
        { x: 12, y: 8, width: 10, height: 8 },
        { x: 12, y: 18, width: 10, height: 8 },
      ],
    );
    const dImage = createHoledRectImage(
      36,
      36,
      { x: 6, y: 4, width: 24, height: 28 },
      [{ x: 12, y: 10, width: 12, height: 14 }],
    );

    expectContourHoles(aImage, 1, 1);
    expectContourHoles(bImage, 1, 2);
    expectContourHoles(dImage, 1, 1);
  });

  it("extracts A/B/D-style holes for bold stroke weights", () => {
    const aImage = createHoledRectImage(
      32,
      32,
      { x: 3, y: 3, width: 26, height: 26 },
      [{ x: 12, y: 12, width: 8, height: 8 }],
    );
    const bImage = createHoledRectImage(
      36,
      36,
      { x: 3, y: 3, width: 28, height: 30 },
      [
        { x: 12, y: 8, width: 9, height: 7 },
        { x: 12, y: 19, width: 9, height: 7 },
      ],
    );
    const dImage = createHoledRectImage(
      36,
      36,
      { x: 5, y: 3, width: 26, height: 30 },
      [{ x: 12, y: 10, width: 10, height: 12 }],
    );

    expectContourHoles(aImage, 1, 1);
    expectContourHoles(bImage, 1, 2);
    expectContourHoles(dImage, 1, 1);
  });
});
