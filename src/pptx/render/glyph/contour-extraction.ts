/**
 * @file Shared contour extraction helpers
 */

export type ImageDataLike = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
};

const THRESHOLD = 128;
const SIMPLIFY_TOLERANCE = 0.8;
const MIN_CONTOUR_POINTS = 4;
const MAX_TRACE_ITERATIONS = 5000;
const MAX_CONTOURS_PER_CHAR = 20;

type Point = { x: number; y: number };
type RawContour = Point[];

export function extractContours(imageData: ImageDataLike): RawContour[] {
  const { width, height, data } = imageData;
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i * 4] >= THRESHOLD ? 1 : 0;
  }

  const holeMask = extractHoleMask(binary, width, height);
  const filledBinary = fillHoles(binary, holeMask);
  const outerContours = extractContoursFromBinary(filledBinary, width, height);
  const holeContours = extractContoursFromBinary(holeMask, width, height);

  return [...outerContours, ...holeContours];
}

export function processContours(
  rawContours: RawContour[],
  scale: number,
  padding: number,
): { points: readonly { x: number; y: number }[]; isHole: boolean }[] {
  return rawContours.map((raw) => {
    // Subsample long contours if needed
    const points = subsampleIfNeeded(raw, 300);

    // Simplify
    const simplified = douglasPeucker(points, SIMPLIFY_TOLERANCE);

    // Scale and offset (remove padding)
    const scaledPoints = simplified.map((p) => ({
      x: (p.x - padding) / scale,
      y: (p.y - padding) / scale,
    }));

    const isHole = !isClockwise(scaledPoints);
    return { points: scaledPoints, isHole };
  });
}

function subsampleIfNeeded(points: Point[], maxLength: number): Point[] {
  if (points.length <= maxLength) {
    return points;
  }
  const step = Math.ceil(points.length / maxLength);
  return points.filter((_, i) => i % step === 0);
}

export function getContourExtractionWorkerCode(): string {
  return [
    `const THRESHOLD = ${THRESHOLD};`,
    `const SIMPLIFY_TOLERANCE = ${SIMPLIFY_TOLERANCE};`,
    `const MIN_CONTOUR_POINTS = ${MIN_CONTOUR_POINTS};`,
    `const MAX_TRACE_ITERATIONS = ${MAX_TRACE_ITERATIONS};`,
    `const MAX_CONTOURS_PER_CHAR = ${MAX_CONTOURS_PER_CHAR};`,
    extractContoursFromBinary.toString(),
    extractHoleMask.toString(),
    fillHoles.toString(),
    extractContours.toString(),
    isBoundary.toString(),
    traceBoundary.toString(),
    subsampleIfNeeded.toString(),
    processContours.toString(),
    findFarthestPoint.toString(),
    douglasPeucker.toString(),
    perpDistance.toString(),
    isClockwise.toString(),
  ].join("\n");
}

function extractContoursFromBinary(
  binary: Uint8Array,
  width: number,
  height: number,
): RawContour[] {
  const contours: RawContour[] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 1; y < height - 1 && contours.length < MAX_CONTOURS_PER_CHAR; y++) {
    for (let x = 1; x < width - 1 && contours.length < MAX_CONTOURS_PER_CHAR; x++) {
      const idx = y * width + x;

      if (binary[idx] === 1 && visited[idx] === 0 && isBoundary(binary, x, y, width)) {
        const contour = traceBoundary(binary, visited, x, y, width, height);
        if (contour.length >= MIN_CONTOUR_POINTS) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

function extractHoleMask(binary: Uint8Array, width: number, height: number): Uint8Array {
  const outside = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let x = 0; x < width; x++) {
    const topIdx = x;
    const bottomIdx = (height - 1) * width + x;
    if (binary[topIdx] === 0 && outside[topIdx] === 0) {
      outside[topIdx] = 1;
      queue.push(topIdx);
    }
    if (binary[bottomIdx] === 0 && outside[bottomIdx] === 0) {
      outside[bottomIdx] = 1;
      queue.push(bottomIdx);
    }
  }

  for (let y = 0; y < height; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);
    if (binary[leftIdx] === 0 && outside[leftIdx] === 0) {
      outside[leftIdx] = 1;
      queue.push(leftIdx);
    }
    if (binary[rightIdx] === 0 && outside[rightIdx] === 0) {
      outside[rightIdx] = 1;
      queue.push(rightIdx);
    }
  }

  while (queue.length > 0) {
    const idx = queue.shift();
    if (idx === undefined) {
      continue;
    }
    const x = idx % width;
    const y = Math.floor(idx / width);
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x <= 0 || neighbor.x >= width - 1 || neighbor.y <= 0 || neighbor.y >= height - 1) {
        continue;
      }
      const nIdx = neighbor.y * width + neighbor.x;
      if (binary[nIdx] === 0 && outside[nIdx] === 0) {
        outside[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  const holeMask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (binary[i] === 0 && outside[i] === 0) {
      holeMask[i] = 1;
    }
  }

  return holeMask;
}

function fillHoles(binary: Uint8Array, holeMask: Uint8Array): Uint8Array {
  const filled = new Uint8Array(binary);
  for (let i = 0; i < filled.length; i++) {
    if (holeMask[i] === 1) {
      filled[i] = 1;
    }
  }
  return filled;
}

function isBoundary(binary: Uint8Array, x: number, y: number, width: number): boolean {
  const idx = y * width + x;
  if (binary[idx] === 0) {
    return false;
  }
  return (
    binary[idx - 1] === 0 ||
    binary[idx + 1] === 0 ||
    binary[idx - width] === 0 ||
    binary[idx + width] === 0
  );
}

function traceBoundary(
  binary: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number,
): RawContour {
  const contour: RawContour = [];
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  // eslint-disable-next-line no-restricted-syntax -- Performance: boundary tracing algorithm requires mutable state
  let x = startX;
  // eslint-disable-next-line no-restricted-syntax -- Performance: boundary tracing algorithm requires mutable state
  let y = startY;
  // eslint-disable-next-line no-restricted-syntax -- Performance: boundary tracing algorithm requires mutable state
  let dir = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: boundary tracing algorithm requires mutable state
  let iterations = 0;

  do {
    if (++iterations > MAX_TRACE_ITERATIONS) {
      break;
    }

    const idx = y * width + x;
    visited[idx] = 1;
    contour.push({ x, y });

    // eslint-disable-next-line no-restricted-syntax -- Performance: boundary tracing algorithm
    let found = false;
    const startDir = (dir + 5) % 8;

    for (let i = 0; i < 8; i++) {
      const checkDir = (startDir + i) % 8;
      const nx = x + dx[checkDir];
      const ny = y + dy[checkDir];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (binary[ny * width + nx] === 1) {
          x = nx;
          y = ny;
          dir = checkDir;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      break;
    }
  } while (!(x === startX && y === startY) || contour.length < 3);

  return contour;
}

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const { maxDist, maxIdx } = findFarthestPoint(points, first, last);

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function findFarthestPoint(
  points: Point[],
  first: Point,
  last: Point,
): { maxDist: number; maxIdx: number } {
  return points.slice(1, -1).reduce(
    (acc, point, i) => {
      const dist = perpDistance(point, first, last);
      return dist > acc.maxDist ? { maxDist: dist, maxIdx: i + 1 } : acc;
    },
    { maxDist: 0, maxIdx: 0 },
  );
}

function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function isClockwise(points: readonly { x: number; y: number }[]): boolean {
  const area = points.reduce((sum, point, i) => {
    const j = (i + 1) % points.length;
    return sum + point.x * points[j].y - points[j].x * point.y;
  }, 0);
  return area > 0;
}
