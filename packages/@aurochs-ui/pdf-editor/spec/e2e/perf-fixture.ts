/**
 * @file Performance test fixture — generates a large PdfDocument
 *
 * Creates a document with many pages and many elements per page
 * to reproduce slow editing behavior with large PDFs.
 *
 * Each page has:
 * - Multiple text elements at various positions
 * - Path elements (rectangles, lines)
 * - Varying font sizes and styles
 *
 * This creates a realistic workload that exercises the full rendering
 * and state management pipeline.
 */

import type { PdfDocument, PdfPage, PdfText, PdfPath, PdfGraphicsState } from "@aurochs/pdf";

function makeGraphicsState(overrides?: Partial<PdfGraphicsState>): PdfGraphicsState {
  return {
    ctm: [1, 0, 0, 1, 0, 0],
    fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
    strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
    lineWidth: 1,
    lineJoin: 0,
    lineCap: 0,
    miterLimit: 10,
    dashArray: [],
    dashPhase: 0,
    fillAlpha: 1,
    strokeAlpha: 1,
    charSpacing: 0,
    wordSpacing: 0,
    horizontalScaling: 100,
    textLeading: 0,
    textRenderingMode: 0,
    textRise: 0,
    ...overrides,
  };
}

function makeText(opts: {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  bold?: boolean;
  color?: [number, number, number];
}): PdfText {
  return {
    type: "text",
    text: opts.text,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.fontSize,
    fontName: opts.bold ? "F2" : "F1",
    baseFont: opts.bold ? "Helvetica-Bold" : "Helvetica",
    fontSize: opts.fontSize,
    isBold: opts.bold,
    fontMetrics: { ascender: 800, descender: -200 },
    graphicsState: makeGraphicsState(
      opts.color ? { fillColor: { colorSpace: "DeviceRGB", components: opts.color } } : undefined,
    ),
  };
}

type RectParams = { x: number; y: number; w: number; h: number; fill: [number, number, number] };
function makeRect({ x, y, w, h, fill }: RectParams): PdfPath {
  return {
    type: "path",
    operations: [{ type: "rect", x, y, width: w, height: h }],
    paintOp: "fillStroke",
    graphicsState: makeGraphicsState({
      fillColor: { colorSpace: "DeviceRGB", components: fill },
      strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
      lineWidth: 0.5,
    }),
  };
}

/**
 * Generate a single page with a realistic set of elements.
 *
 * Each page gets:
 * - 1 header text (bold, large)
 * - 6 body text paragraphs
 * - 3 decorative rectangles
 * - 2 additional styled text elements
 * Total: ~12 elements per page
 */
function generatePage(pageNumber: number): PdfPage {
  const elements: (PdfText | PdfPath)[] = [];

  // Header
  elements.push(makeText({
    text: `Page ${pageNumber} — Performance Test Document`,
    x: 72, y: 720, width: 400, fontSize: 20, bold: true,
  }));

  // Body paragraphs
  const paragraphs = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.",
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
    "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur.",
  ];
  for (let i = 0; i < paragraphs.length; i++) {
    elements.push(makeText({
      text: paragraphs[i],
      x: 72, y: 680 - i * 50, width: 468, fontSize: 11,
    }));
  }

  // Decorative rectangles
  elements.push(makeRect({ x: 72, y: 350, w: 200, h: 80, fill: [0.9, 0.93, 1.0] }));
  elements.push(makeRect({ x: 300, y: 350, w: 200, h: 80, fill: [1.0, 0.93, 0.9] }));
  elements.push(makeRect({ x: 72, y: 240, w: 428, h: 2, fill: [0.7, 0.7, 0.7] })); // horizontal rule

  // Styled text elements
  elements.push(makeText({
    text: "Important note: This is highlighted text",
    x: 85, y: 375, width: 180, fontSize: 10, bold: true, color: [0, 0, 0.7],
  }));
  elements.push(makeText({
    text: `Footer — page ${pageNumber}`,
    x: 250, y: 50, width: 112, fontSize: 9, color: [0.5, 0.5, 0.5],
  }));

  return {
    pageNumber,
    width: 612,
    height: 792,
    elements,
  };
}

/**
 * Create a large PDF document with the specified number of pages.
 *
 * Default: 50 pages × ~12 elements each = ~600 elements total.
 * This is representative of a medium-sized real PDF that users
 * would encounter in practice.
 */
export function createLargeDocument(pageCount: number = 50): PdfDocument {
  const pages: PdfPage[] = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push(generatePage(i));
  }
  return { pages };
}

/**
 * Create an extra-large document for stress testing.
 * 200 pages × ~12 elements = ~2400 elements.
 */
export function createExtraLargeDocument(): PdfDocument {
  return createLargeDocument(200);
}
