/**
 * @file Contour extraction using Marching Squares algorithm
 *
 * Provides subpixel-accurate contour extraction from binary images.
 * Uses linear interpolation at cell edges for smooth contours.
 * Hole detection via flood fill from image edges.
 */

export type ImageDataLike = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
};

// =============================================================================
// Configuration
// =============================================================================

const THRESHOLD = 128;
/**
 * Douglas-Peucker simplification tolerance in pixels.
 * Applied after Marching Squares extraction.
 */
const SIMPLIFY_TOLERANCE = 0.3;
const MIN_CONTOUR_POINTS = 4;
const MAX_CONTOURS = 50;
/**
 * Minimum area threshold for contour filtering.
 * Contours with absolute area below this are considered noise.
 * Value is in scaled units (after dividing by RENDER_SCALE).
 */
const MIN_CONTOUR_AREA = 2.0;

type Point = { x: number; y: number };
type RawContour = Point[];

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract contours from image data using Marching Squares algorithm.
 * Returns both outer contours and hole contours with subpixel precision.
 */
export function extractContours(imageData: ImageDataLike): RawContour[] {
  const { width, height, data } = imageData;

  // Convert to grayscale values (0-255)
  const gray = new Float32Array(width * height);
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = data[i * 4]; // Use red channel
    binary[i] = gray[i] >= THRESHOLD ? 1 : 0;
  }

  // Detect holes via flood fill from edges
  const holeMask = extractHoleMask(binary, width, height);

  // Create filled version (holes filled in)
  const filledGray = new Float32Array(gray);
  for (let i = 0; i < width * height; i++) {
    if (holeMask[i] === 1) {
      filledGray[i] = 255; // Fill holes
    }
  }

  // Create hole-only grayscale
  const holeGray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    holeGray[i] = holeMask[i] === 1 ? 255 : 0;
  }

  // Extract outer contours from filled image
  const outerContours = marchingSquares({ gray: filledGray, width, height, threshold: THRESHOLD });

  // Extract hole contours from hole mask
  // Reverse point order so holes wind opposite to outers
  const holeContours = marchingSquares({ gray: holeGray, width, height, threshold: THRESHOLD }).map((contour) =>
    contour.slice().reverse(),
  );

  return [...outerContours, ...holeContours];
}

/**
 * Process raw contours: simplify, filter noise, and determine hole status.
 */
export function processContours(
  rawContours: RawContour[],
  scale: number,
  padding: number,
): { points: readonly Point[]; isHole: boolean }[] {
  return rawContours
    .filter((raw) => raw.length >= MIN_CONTOUR_POINTS)
    .map((raw) => {
      // Simplify using Douglas-Peucker
      const simplified = douglasPeucker(raw, SIMPLIFY_TOLERANCE);

      // Scale and offset (remove padding)
      const scaledPoints = simplified.map((p) => ({
        x: (p.x - padding) / scale,
        y: (p.y - padding) / scale,
      }));

      // Calculate signed area for winding and filtering
      const signedArea = calculateSignedArea(scaledPoints);
      const absArea = Math.abs(signedArea);

      // Determine winding: CCW = hole, CW = outer (after Y-flip in rendering)
      const isHole = signedArea < 0;
      return { points: scaledPoints, isHole, area: absArea };
    })
    .filter((contour) => contour.area >= MIN_CONTOUR_AREA)
    .map(({ points, isHole }) => ({ points, isHole }));
}

// =============================================================================
// Hole Detection (Flood Fill)
// =============================================================================

/**
 * Extract hole mask using flood fill from image edges.
 * Pixels that are 0 (background) but not reachable from edges are holes.
 */
function extractHoleMask(
  binary: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  // Flood fill from edges to find "outside" regions
  const outside = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed from all edges
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

  // BFS flood fill
  while (queue.length > 0) {
    const idx = queue.shift()!;
    const x = idx % width;
    const y = Math.floor(idx / width);

    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) {continue;}
      const nIdx = n.y * width + n.x;
      if (binary[nIdx] === 0 && outside[nIdx] === 0) {
        outside[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Holes are background pixels not reachable from outside
  const holeMask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (binary[i] === 0 && outside[i] === 0) {
      holeMask[i] = 1;
    }
  }

  return holeMask;
}

// =============================================================================
// Marching Squares Algorithm
// =============================================================================

/**
 * Marching Squares lookup table.
 * Case = TL | (TR<<1) | (BR<<2) | (BL<<3)
 * Edges: 0=top (TL-TR), 1=right (TR-BR), 2=bottom (BR-BL), 3=left (BL-TL)
 * Each segment connects two edges where the contour crosses.
 * Order matters for consistent CCW winding around filled region.
 */
const MARCHING_SQUARES_TABLE: readonly (readonly number[])[] = [
  [],           // 0: none inside
  [3, 0],       // 1: TL - left to top
  [0, 1],       // 2: TR - top to right
  [3, 1],       // 3: TL+TR - left to right
  [1, 2],       // 4: BR - right to bottom
  [3, 2, 0, 1], // 5: TL+BR saddle - left to bottom, top to right
  [0, 2],       // 6: TR+BR - top to bottom
  [3, 2],       // 7: TL+TR+BR - left to bottom
  [2, 3],       // 8: BL - bottom to left
  [2, 0],       // 9: TL+BL - bottom to top
  [2, 1, 0, 3], // 10: TR+BL saddle - bottom to right, top to left
  [2, 1],       // 11: TL+TR+BL - bottom to right
  [1, 3],       // 12: BR+BL - right to left
  [1, 0],       // 13: TL+BR+BL - right to top
  [0, 3],       // 14: TR+BR+BL - top to left
  [],           // 15: all inside
];

/**
 * Edge interpolation data.
 * Each edge connects two corners with positions for interpolation.
 */
type EdgeInterpolator = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly corner1: number;
  readonly corner2: number;
};

const EDGE_INTERPOLATORS: readonly EdgeInterpolator[] = [
  { x1: 0, y1: 0, x2: 1, y2: 0, corner1: 0, corner2: 1 }, // top
  { x1: 1, y1: 0, x2: 1, y2: 1, corner1: 1, corner2: 2 }, // right
  { x1: 1, y1: 1, x2: 0, y2: 1, corner1: 2, corner2: 3 }, // bottom
  { x1: 0, y1: 1, x2: 0, y2: 0, corner1: 3, corner2: 0 }, // left
];

/**
 * Extract contours using Marching Squares with linear interpolation.
 */
function marchingSquares(
  args: { readonly gray: Float32Array; readonly width: number; readonly height: number; readonly threshold: number }
): RawContour[] {
  const { gray, width, height, threshold } = args;
  const visitedEdges = new Set<string>();
  const contours: RawContour[] = [];

  for (let cy = 0; cy < height - 1 && contours.length < MAX_CONTOURS; cy++) {
    for (let cx = 0; cx < width - 1 && contours.length < MAX_CONTOURS; cx++) {
      const caseIndex = getCellCase({ gray, width, cx, cy, threshold });
      const edges = MARCHING_SQUARES_TABLE[caseIndex];

      if (edges.length === 0) {continue;}

      for (let i = 0; i < edges.length; i += 2) {
        // Use canonical edge key for visited tracking
        const edge1 = edges[i];
        const edge2 = edges[i + 1];
        const edgeKey = `${cx},${cy},${Math.min(edge1, edge2)}`;

        if (visitedEdges.has(edgeKey)) {continue;}

        // Start from edge2 to get correct winding direction
        const startEdge = edge2;

        const contour = traceContour({
          gray,
          width,
          height,
          threshold,
          startCx: cx,
          startCy: cy,
          startEdge,
          visitedEdges,
        });

        if (contour.length >= MIN_CONTOUR_POINTS) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

/**
 * Get the Marching Squares case index for a cell.
 * Corners: 0=TL, 1=TR, 2=BR, 3=BL
 */
function getCellCase(
  args: { readonly gray: Float32Array; readonly width: number; readonly cx: number; readonly cy: number; readonly threshold: number }
): number {
  const { gray, width, cx, cy, threshold } = args;
  const tl = gray[cy * width + cx] >= threshold ? 1 : 0;
  const tr = gray[cy * width + cx + 1] >= threshold ? 1 : 0;
  const br = gray[(cy + 1) * width + cx + 1] >= threshold ? 1 : 0;
  const bl = gray[(cy + 1) * width + cx] >= threshold ? 1 : 0;

  return tl | (tr << 1) | (br << 2) | (bl << 3);
}

/**
 * Get corner values for a cell.
 */
function getCellCorners(
  args: { readonly gray: Float32Array; readonly width: number; readonly cx: number; readonly cy: number }
): [number, number, number, number] {
  const { gray, width, cx, cy } = args;
  return [
    gray[cy * width + cx],
    gray[cy * width + cx + 1],
    gray[(cy + 1) * width + cx + 1],
    gray[(cy + 1) * width + cx],
  ];
}

/**
 * Interpolate edge crossing point with subpixel precision.
 */
function interpolateEdge(
  args: { readonly cx: number; readonly cy: number; readonly edge: number; readonly corners: readonly number[]; readonly threshold: number }
): Point {
  const { cx, cy, edge, corners, threshold } = args;
  const e = EDGE_INTERPOLATORS[edge];
  const v1 = corners[e.corner1];
  const v2 = corners[e.corner2];

  const t = Math.abs(v2 - v1) < 0.001 ? 0.5 : (threshold - v1) / (v2 - v1);
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    x: cx + e.x1 + (e.x2 - e.x1) * clampedT,
    y: cy + e.y1 + (e.y2 - e.y1) * clampedT,
  };
}

/**
 * Get the exit edge for a given entry edge in a cell.
 */
function getExitEdge(caseIndex: number, entryEdge: number): number {
  const edges = MARCHING_SQUARES_TABLE[caseIndex];

  for (let i = 0; i < edges.length; i += 2) {
    if (edges[i] === entryEdge) {return edges[i + 1];}
    if (edges[i + 1] === entryEdge) {return edges[i];}
  }

  return -1;
}

/**
 * Get the adjacent cell and entry edge when exiting through an edge.
 */
function getNextCell(
  cx: number,
  cy: number,
  exitEdge: number,
): { nx: number; ny: number; entryEdge: number } {
  const transitions: readonly { dx: number; dy: number; entry: number }[] = [
    { dx: 0, dy: -1, entry: 2 }, // exit top → enter from bottom
    { dx: 1, dy: 0, entry: 3 },  // exit right → enter from left
    { dx: 0, dy: 1, entry: 0 },  // exit bottom → enter from top
    { dx: -1, dy: 0, entry: 1 }, // exit left → enter from right
  ];

  const t = transitions[exitEdge];
  return { nx: cx + t.dx, ny: cy + t.dy, entryEdge: t.entry };
}

/**
 * Trace a single contour starting from a given cell and edge.
 */
function traceContour(
  args: {
    readonly gray: Float32Array;
    readonly width: number;
    readonly height: number;
    readonly threshold: number;
    readonly startCx: number;
    readonly startCy: number;
    readonly startEdge: number;
    readonly visitedEdges: Set<string>;
  }
): RawContour {
  const { gray, width, height, threshold, startCx, startCy, startEdge, visitedEdges } = args;
  const contour: RawContour = [];
  const maxIterations = (width + height) * 4;

  // eslint-disable-next-line no-restricted-syntax -- Algorithm state
  let cx = startCx;
  // eslint-disable-next-line no-restricted-syntax -- Algorithm state
  let cy = startCy;
  // eslint-disable-next-line no-restricted-syntax -- Algorithm state
  let entryEdge = startEdge;
  // eslint-disable-next-line no-restricted-syntax -- Algorithm state
  let iterations = 0;

  do {
    if (++iterations > maxIterations) {break;}
    if (cx < 0 || cx >= width - 1 || cy < 0 || cy >= height - 1) {break;}

    const caseIndex = getCellCase({ gray, width, cx, cy, threshold });
    if (caseIndex === 0 || caseIndex === 15) {break;}

    const exitEdge = getExitEdge(caseIndex, entryEdge);
    if (exitEdge < 0) {break;}

    const edgeKey = `${cx},${cy},${Math.min(entryEdge, exitEdge)}`;
    visitedEdges.add(edgeKey);

    const corners = getCellCorners({ gray, width, cx, cy });
    const point = interpolateEdge({ cx, cy, edge: entryEdge, corners, threshold });
    contour.push(point);

    const next = getNextCell(cx, cy, exitEdge);
    cx = next.nx;
    cy = next.ny;
    entryEdge = next.entryEdge;

  } while (!(cx === startCx && cy === startCy && entryEdge === startEdge));

  return contour;
}

// =============================================================================
// Douglas-Peucker Simplification
// =============================================================================

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {return points;}

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
  if (len === 0) {return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);}
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

// =============================================================================
// Area Calculation
// =============================================================================

/**
 * Calculate signed area using shoelace formula.
 * Positive = clockwise (outer), Negative = counter-clockwise (hole)
 */
function calculateSignedArea(points: readonly Point[]): number {
  return points.reduce((sum, point, i) => {
    const j = (i + 1) % points.length;
    return sum + point.x * points[j].y - points[j].x * point.y;
  }, 0) / 2;
}
