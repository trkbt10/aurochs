/**
 * @file PDF → PPTX → Reload roundtrip integration tests
 *
 * Validates that PDF-imported shapes survive export and re-import with
 * consistent shape count, transforms, fills, and geometry within tolerance.
 *
 * Fixture PDFs are optional; when missing the test is skipped.
 *
 * @see docs/plans/pdf-import/phase-6/t6-1-roundtrip-tests.md
 */

import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importPdf } from "../../src/importer/pdf-importer";
import { exportPptx } from "@oxen-office/pptx/exporter";
import { convertToPresentationDocument, loadPptxFromBuffer } from "@oxen-office/pptx/app";
import { px } from "@oxen-office/ooxml/domain/units";
import type { PresentationDocument } from "@oxen-office/pptx/app/presentation-document";
import type { GroupTransform } from "@oxen-office/pptx/domain/geometry";
import type {
  Shape,
  SpShape,
  PicShape,
  GrpShape,
  CustomGeometry,
  PathCommand,
} from "@oxen-office/pptx/domain/shape";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "pdf");
const SAMPLES_DIR = path.resolve(__dirname, "../../../../../fixtures/samples");

const SLIDE_WIDTH = px(960);
const SLIDE_HEIGHT = px(540);

function readFixtureOrSkip(filePath: string): Uint8Array | null {
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIPPED: Fixture not found: ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath);
}

async function importExportReimport(
  pdfBuffer: ArrayBuffer | Uint8Array,
  options: Readonly<{
    slideSize?: Readonly<{ width: ReturnType<typeof px>; height: ReturnType<typeof px> }>;
  }> = {},
): Promise<{ original: PresentationDocument; reimported: PresentationDocument }> {
  const { document: original } = await importPdf(pdfBuffer, {
    slideSize: options.slideSize,
  });

  const { blob } = await exportPptx(original);
  const exported = await blob.arrayBuffer();

  const loaded = await loadPptxFromBuffer(exported);
  const reimported = convertToPresentationDocument(loaded);

  return { original, reimported };
}

function compareShapes(
  original: readonly Shape[],
  reimported: readonly Shape[],
  precisionDigits: number = 1,
): void {
  expect(reimported.length).toBe(original.length);

  for (let i = 0; i < original.length; i++) {
    const a = original[i];
    const b = reimported[i];
    if (!a || !b) {
      throw new Error(`Expected shapes at index ${i}`);
    }
    compareShape(a, b, precisionDigits);
  }
}

function compareShape(a: Shape, b: Shape, precisionDigits: number): void {
  expect(b.type).toBe(a.type);

  switch (a.type) {
    case "sp":
      if (b.type === "sp") {
        compareSpShape(a, b, precisionDigits);
      }
      return;
    case "pic":
      if (b.type === "pic") {
        comparePicShape(a, b, precisionDigits);
      }
      return;
    case "grpSp":
      if (b.type === "grpSp") {
        compareGrpShape(a, b, precisionDigits);
      }
      return;
    case "cxnSp":
    case "graphicFrame":
    case "contentPart":
      return;
  }
}

function compareTransform(
  a: Readonly<{ x: number; y: number; width: number; height: number }>,
  b: Readonly<{ x: number; y: number; width: number; height: number }>,
  precisionDigits: number,
): void {
  expect(b.x).toBeCloseTo(a.x, precisionDigits);
  expect(b.y).toBeCloseTo(a.y, precisionDigits);
  expect(b.width).toBeCloseTo(a.width, precisionDigits);
  expect(b.height).toBeCloseTo(a.height, precisionDigits);
}

function compareGroupTransform(a: GroupTransform, b: GroupTransform, precisionDigits: number): void {
  compareTransform(a, b, precisionDigits);
  expect(b.childOffsetX).toBeCloseTo(a.childOffsetX, precisionDigits);
  expect(b.childOffsetY).toBeCloseTo(a.childOffsetY, precisionDigits);
  expect(b.childExtentWidth).toBeCloseTo(a.childExtentWidth, precisionDigits);
  expect(b.childExtentHeight).toBeCloseTo(a.childExtentHeight, precisionDigits);
}

function compareGrpShape(a: GrpShape, b: GrpShape, precisionDigits: number): void {
  const ta = a.properties.transform;
  const tb = b.properties.transform;
  if (ta && tb) {
    compareGroupTransform(ta, tb, precisionDigits);
  }

  compareShapes(a.children, b.children, precisionDigits);
}

function compareSpShape(a: SpShape, b: SpShape, precisionDigits: number): void {
  const ta = a.properties.transform;
  const tb = b.properties.transform;
  if (ta && tb) {
    compareTransform(ta, tb, precisionDigits);
  }

  const ga = a.properties.geometry;
  const gb = b.properties.geometry;
  if (ga?.type === "preset" && gb?.type === "preset") {
    expect(gb.preset).toBe(ga.preset);
  } else if (ga?.type === "custom" && gb?.type === "custom") {
    compareCustomGeometry(ga, gb, precisionDigits);
  }

  const fa = a.properties.fill;
  const fb = b.properties.fill;
  if (fa && fb) {
    expect(fb.type).toBe(fa.type);
    if (fa.type === "solidFill" && fb.type === "solidFill") {
      expect(fb.color.spec.type).toBe(fa.color.spec.type);
      if (fa.color.spec.type === "srgb" && fb.color.spec.type === "srgb") {
        expect(fb.color.spec.value).toBe(fa.color.spec.value);
      }
    }
  }

  const la = a.properties.line;
  const lb = b.properties.line;
  if (la && lb) {
    expect(lb.width).toBeCloseTo(la.width, precisionDigits);
    expect(lb.fill.type).toBe(la.fill.type);
  }
}

function comparePicShape(a: PicShape, b: PicShape, precisionDigits: number): void {
  const ta = a.properties.transform;
  const tb = b.properties.transform;
  if (ta && tb) {
    compareTransform(ta, tb, precisionDigits);
  }
}

function compareCustomGeometry(a: CustomGeometry, b: CustomGeometry, precisionDigits: number): void {
  expect(b.paths.length).toBe(a.paths.length);

  for (let i = 0; i < a.paths.length; i++) {
    const pathA = a.paths[i];
    const pathB = b.paths[i];
    if (!pathA || !pathB) {
      throw new Error(`Expected paths at index ${i}`);
    }

    expect(pathB.commands.length).toBe(pathA.commands.length);

    for (let j = 0; j < pathA.commands.length; j++) {
      const cmdA = pathA.commands[j];
      const cmdB = pathB.commands[j];
      if (!cmdA || !cmdB) {
        throw new Error(`Expected path commands at index ${i}:${j}`);
      }
      comparePathCommand(cmdA, cmdB, precisionDigits);
    }
  }
}

function comparePoint(
  a: Readonly<{ x: number; y: number }>,
  b: Readonly<{ x: number; y: number }>,
  precisionDigits: number,
): void {
  expect(b.x).toBeCloseTo(a.x, precisionDigits);
  expect(b.y).toBeCloseTo(a.y, precisionDigits);
}

function comparePathCommand(a: PathCommand, b: PathCommand, precisionDigits: number): void {
  expect(b.type).toBe(a.type);

  switch (a.type) {
    case "moveTo":
    case "lineTo":
      if (b.type === a.type) {
        comparePoint(a.point, b.point, precisionDigits);
      }
      return;
    case "quadBezierTo":
      if (b.type === "quadBezierTo") {
        comparePoint(a.control, b.control, precisionDigits);
        comparePoint(a.end, b.end, precisionDigits);
      }
      return;
    case "cubicBezierTo":
      if (b.type === "cubicBezierTo") {
        comparePoint(a.control1, b.control1, precisionDigits);
        comparePoint(a.control2, b.control2, precisionDigits);
        comparePoint(a.end, b.end, precisionDigits);
      }
      return;
    case "arcTo":
      if (b.type === "arcTo") {
        expect(b.widthRadius).toBeCloseTo(a.widthRadius, precisionDigits);
        expect(b.heightRadius).toBeCloseTo(a.heightRadius, precisionDigits);
        expect(b.startAngle).toBeCloseTo(a.startAngle, precisionDigits);
        expect(b.swingAngle).toBeCloseTo(a.swingAngle, precisionDigits);
      }
      return;
    case "close":
      return;
  }
}

function flattenShapes(shapes: readonly Shape[]): Shape[] {
  const out: Shape[] = [];
  for (const shape of shapes) {
    out.push(shape);
    if (shape.type === "grpSp") {
      out.push(...flattenShapes(shape.children));
    }
  }
  return out;
}

function getTextContent(shapes: readonly Shape[]): string[] {
  const out: string[] = [];

  for (const shape of flattenShapes(shapes)) {
    if (shape.type !== "sp" || !shape.textBody) {
      continue;
    }
    for (const paragraph of shape.textBody.paragraphs) {
      for (const run of paragraph.runs) {
        if (run.type === "text") {
          out.push(run.text);
        }
      }
    }
  }

  return out;
}

describe("PDF Import Roundtrip", () => {
  describe("Basic shapes", () => {
    it("preserves rectangle through roundtrip", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "simple-rect.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { original, reimported } = await importExportReimport(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const originalShapes = original.slides[0]?.slide.shapes;
      const reimportedShapes = reimported.slides[0]?.slide.shapes;
      if (!originalShapes || !reimportedShapes) {
        throw new Error("Expected at least one slide");
      }

      compareShapes(originalShapes, reimportedShapes);
    });

    it("preserves bezier curves through roundtrip", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "bezier-curves.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { original, reimported } = await importExportReimport(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const originalShape = original.slides[0]?.slide.shapes[0];
      const reimportedShape = reimported.slides[0]?.slide.shapes[0];
      if (!originalShape || !reimportedShape) {
        throw new Error("Expected at least one shape on slide 1");
      }

      expect(originalShape.type).toBe(reimportedShape.type);

      if (originalShape.type === "sp" && reimportedShape.type === "sp") {
        const origGeom = originalShape.properties.geometry;
        const reimGeom = reimportedShape.properties.geometry;

        if (origGeom?.type === "custom" && reimGeom?.type === "custom") {
          expect(reimGeom.paths.some((p) => p.commands.some((c) => c.type === "cubicBezierTo"))).toBe(true);
        }
      }
    });
  });

  describe("Colors", () => {
    it("preserves fill colors through roundtrip", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "colored-shapes.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { original, reimported } = await importExportReimport(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const originalShapes = original.slides[0]?.slide.shapes;
      const reimportedShapes = reimported.slides[0]?.slide.shapes;
      if (!originalShapes || !reimportedShapes) {
        throw new Error("Expected at least one slide");
      }

      for (let i = 0; i < originalShapes.length; i++) {
        const orig = originalShapes[i];
        const reim = reimportedShapes[i];
        if (!orig || !reim) {
          throw new Error(`Expected shapes at index ${i}`);
        }

        if (orig.type === "sp" && reim.type === "sp") {
          const of = orig.properties.fill;
          const rf = reim.properties.fill;
          if (of?.type === "solidFill" && rf?.type === "solidFill") {
            expect(rf.color.spec.type).toBe(of.color.spec.type);
            if (of.color.spec.type === "srgb" && rf.color.spec.type === "srgb") {
              expect(rf.color.spec.value).toBe(of.color.spec.value);
            }
          }
        }
      }
    });
  });

  describe("Text", () => {
    it("preserves text content through roundtrip", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "text-content.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { original, reimported } = await importExportReimport(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const originalShapes = original.slides[0]?.slide.shapes;
      const reimportedShapes = reimported.slides[0]?.slide.shapes;
      if (!originalShapes || !reimportedShapes) {
        throw new Error("Expected at least one slide");
      }

      expect(getTextContent(reimportedShapes)).toEqual(getTextContent(originalShapes));
    });
  });

  describe("Multi-page documents", () => {
    it("preserves all pages through roundtrip", async () => {
      const pdfPath = path.join(FIXTURES_DIR, "multi-page.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { document: doc1, pageCount } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });
      expect(doc1.slides.length).toBe(pageCount);

      const { blob } = await exportPptx(doc1);
      const exported = await blob.arrayBuffer();

      const loaded = await loadPptxFromBuffer(exported);
      const reimported = convertToPresentationDocument(loaded);

      expect(reimported.slides.length).toBe(pageCount);
    });
  });

  describe("Complex PDF (modeling.pdf)", () => {
    it("imports and exports modeling.pdf with shapes, text, and images", async () => {
      const pdfPath = path.join(SAMPLES_DIR, "modeling.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { original, reimported } = await importExportReimport(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      // Verify slide count
      expect(reimported.slides.length).toBe(original.slides.length);

      const originalShapes = original.slides[0]?.slide.shapes;
      const reimportedShapes = reimported.slides[0]?.slide.shapes;
      if (!originalShapes || !reimportedShapes) {
        throw new Error("Expected at least one slide");
      }

      // Verify shape count is preserved
      expect(reimportedShapes.length).toBe(originalShapes.length);

      // Verify text content is preserved
      const originalText = getTextContent(originalShapes);
      const reimportedText = getTextContent(reimportedShapes);
      expect(reimportedText).toEqual(originalText);

      // Verify images are preserved
      const originalImages = originalShapes.filter((s) => s.type === "pic");
      const reimportedImages = reimportedShapes.filter((s) => s.type === "pic");
      expect(reimportedImages.length).toBe(originalImages.length);
    });

    it("decodes CID font text correctly", async () => {
      const pdfPath = path.join(SAMPLES_DIR, "modeling.pdf");
      const pdfBuffer = readFixtureOrSkip(pdfPath);
      if (!pdfBuffer) {
        return;
      }

      const { document } = await importPdf(pdfBuffer, {
        slideSize: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      });

      const shapes = document.slides[0]?.slide.shapes;
      if (!shapes) {
        throw new Error("Expected at least one slide");
      }

      // Get all text content and strip null bytes (UTF-16BE encoding artifacts)
      const rawTextContent = getTextContent(shapes).join("");
      const textContent = rawTextContent.split("\u0000").join("");

      // Verify text was decoded (should contain readable English, not garbled characters)
      expect(textContent).toContain("Web");
      expect(textContent).toContain("Audio");
      expect(textContent).toContain("Synthesis");
    });
  });
});
