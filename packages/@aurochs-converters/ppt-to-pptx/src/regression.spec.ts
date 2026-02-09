/**
 * @file Regression tests: compare converted PPTX against LibreOffice ref.pptx
 *
 * For each test case, converts ref.ppt → PPTX via our converter, then loads
 * both the converted output and ref.pptx through the PPTX parser to compare
 * structural properties (slide count, text, shape count, tables, media).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPptxFromBuffer } from "@aurochs-office/pptx/app";
import type { Presentation, Slide as ApiSlide } from "@aurochs-office/pptx/app";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import type { Slide as DomainSlide } from "@aurochs-office/pptx/domain/slide/types";
import { convert } from "./index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesDir = resolve(__dirname, "../cases");

const CASES = [
  "000_blank",
  "010_text_basic",
  "011_text_bullets",
  "012_text_alignment",
  "020_shapes_basic",
  "021_line_styles",
  "030_images_basic",
  "031_images_crop_rotate",
  "040_table_basic",
  "041_table_merged",
  "050_chart_bar",
  "051_chart_line",
  "060_hyperlink",
  "070_notes",
  "080_multislide",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Shape = DomainSlide["shapes"][number];

/** Extract plain text from a shape (handles sp and grpSp recursively) */
function extractText(shape: Shape): string {
  if (shape.type === "sp" && shape.textBody) {
    return shape.textBody.paragraphs
      .map((p) =>
        p.runs
          .map((r) => {
            if (r.type === "text" || r.type === "field") {
              return r.text;
            }
            if (r.type === "break") {
              return "\n";
            }
            return "";
          })
          .join(""),
      )
      .join("\n");
  }
  if (shape.type === "grpSp") {
    return shape.children.map(extractText).filter(Boolean).join("\n");
  }
  return "";
}

type ParsedPptx = {
  presentation: Presentation;
  files: readonly string[];
};

/** Load ref.ppt, convert to PPTX, and parse via PPTX loader */
async function loadConverted(caseId: string): Promise<ParsedPptx> {
  const pptBytes = new Uint8Array(readFileSync(resolve(casesDir, caseId, "ref.ppt")));
  const result = convert(pptBytes);
  const files = result.data.listFiles();
  const buffer = await result.data.toArrayBuffer();
  const { presentation } = await loadPptxFromBuffer(buffer);
  return { presentation, files };
}

/** Load ref.pptx and parse via PPTX loader */
async function loadReference(caseId: string): Promise<ParsedPptx> {
  const buffer = readFileSync(resolve(casesDir, caseId, "ref.pptx"));
  const { presentation, presentationFile } = await loadPptxFromBuffer(buffer);
  const files = presentationFile.listFiles?.() ?? [];
  return { presentation, files };
}

/** Parse an API slide to domain shapes */
function getShapes(apiSlide: ApiSlide): readonly Shape[] {
  const parsed = parseSlide(apiSlide.content);
  return parsed?.shapes ?? [];
}

/** Normalize text for comparison: strip all whitespace so paragraph/run boundary differences don't matter */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

/** Recursively collect all text from shapes, normalized and sorted for order-independent comparison */
function collectTexts(shapes: readonly Shape[]): string[] {
  return shapes
    .map((s) => normalizeText(extractText(s)))
    .filter((t) => t.length > 0)
    .sort();
}

/** Check if any shape is a graphicFrame with table content */
function hasTable(shapes: readonly Shape[]): boolean {
  return shapes.some((s) => s.type === "graphicFrame" && s.content.type === "table");
}

/** Count media files in file listing */
function countMedia(files: readonly string[]): number {
  return files.filter((f) => f.startsWith("ppt/media/")).length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const caseId of CASES) {
  describe(`regression: ${caseId}`, () => {
    // eslint-disable-next-line no-restricted-syntax -- mutable: shared state loaded in first test
    let converted: ParsedPptx;
    // eslint-disable-next-line no-restricted-syntax -- mutable: shared state loaded in first test
    let reference: ParsedPptx;

    // Load both once per case (shared across tests in this describe block)
    it("loads without error", async () => {
      [converted, reference] = await Promise.all([loadConverted(caseId), loadReference(caseId)]);
    });

    it("slide count matches ref.pptx", () => {
      expect(converted.presentation.count).toBe(reference.presentation.count);
    });

    it("text content matches ref.pptx (sorted)", () => {
      const slideCount = reference.presentation.count;
      for (let i = 1; i <= slideCount; i++) {
        const convSlide = converted.presentation.getSlide(i);
        const refSlide = reference.presentation.getSlide(i);
        const convTexts = collectTexts(getShapes(convSlide));
        const refTexts = collectTexts(getShapes(refSlide));
        expect(convTexts).toEqual(refTexts);
      }
    });

    it("shape count is at least 50% of ref.pptx", () => {
      const slideCount = reference.presentation.count;
      for (let i = 1; i <= slideCount; i++) {
        const convShapes = getShapes(converted.presentation.getSlide(i));
        const refShapes = getShapes(reference.presentation.getSlide(i));
        if (refShapes.length > 0) {
          expect(convShapes.length).toBeGreaterThanOrEqual(Math.floor(refShapes.length * 0.5));
        }
      }
    });

    // Table cases: verify graphicFrame(table) presence
    if (caseId === "040_table_basic" || caseId === "041_table_merged") {
      it("contains table graphicFrame", () => {
        const slideCount = converted.presentation.count;
        // eslint-disable-next-line no-restricted-syntax -- mutable flag for loop search
        let found = false;
        for (let i = 1; i <= slideCount; i++) {
          if (hasTable(getShapes(converted.presentation.getSlide(i)))) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      });
    }

    // Image cases: verify media file count
    if (caseId === "030_images_basic" || caseId === "031_images_crop_rotate" || caseId === "080_multislide") {
      it("media file count >= ref.pptx", () => {
        const convMedia = countMedia(converted.files);
        const refMedia = countMedia(reference.files);
        if (refMedia > 0) {
          expect(convMedia).toBeGreaterThanOrEqual(refMedia);
        }
      });
    }
  });
}
