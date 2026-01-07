/**
 * @file Visual regression tests for kerning (a:kern)
 *
 * Tests ECMA-376 Part 1, Section 21.1.2.3.9 kerning attribute.
 *
 * Test cases:
 * - kerning-default: Default kerning behavior
 * - kerning-none: Kerning disabled (kern="0")
 * - kerning-specific: Specific kerning threshold
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr kern attribute)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "../../src/pptx";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots } from "../visual-regression/compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";

type TestCase = {
  name: string;
  pptxPath: string;
  description: string;
  maxDiffPercent: number;
};

const TEST_CASES: TestCase[] = [
  {
    name: "kerning-default",
    pptxPath: "fixtures/font-spacing/kerning/kerning-default.pptx",
    description: "Default kerning (no kern attribute)",
    maxDiffPercent: 5,
  },
  {
    name: "kerning-none",
    pptxPath: "fixtures/font-spacing/kerning/kerning-none.pptx",
    description: "Kerning disabled (kern=\"0\")",
    maxDiffPercent: 5,
  },
  {
    name: "kerning-specific",
    pptxPath: "fixtures/font-spacing/kerning/kerning-specific.pptx",
    description: "Specific kerning threshold (kern=\"1200\")",
    maxDiffPercent: 5,
  },
];

describe("Kerning (a:kern) - ECMA-376 21.1.2.3.9", () => {
  for (const testCase of TEST_CASES) {
    describe(testCase.name, () => {
      // eslint-disable-next-line no-restricted-syntax -- beforeAll requires mutable state for async loading
      let presentationFile: PresentationFile | null = null;
      // eslint-disable-next-line no-restricted-syntax -- beforeAll requires mutable state for skip tracking
      let skipReason: string | null = null;

      beforeAll(async () => {
        if (!fs.existsSync(testCase.pptxPath)) {
          skipReason = `PPTX file not found: ${testCase.pptxPath}`;
          return;
        }

        const snapshots = listSnapshots(testCase.name);
        if (snapshots.length === 0) {
          skipReason = `No snapshots found. Run: ./spec/visual-regression/scripts/generate-snapshots.sh ${testCase.pptxPath}`;
          return;
        }

        ({ presentationFile } = await loadPptxFile(testCase.pptxPath));
      });

      it(`${testCase.description}`, () => {
        if (skipReason !== null) {
          console.warn(`SKIPPED: ${skipReason}`);
          return;
        }

        if (presentationFile === null) {
          throw new Error("Presentation file not loaded");
        }

        if (!hasSnapshot(testCase.name, 1)) {
          console.warn(`SKIPPED: No snapshot for slide 1`);
          return;
        }

        const presentation = openPresentation(presentationFile, {
          renderOptions: LIBREOFFICE_RENDER_OPTIONS,
        });
        const slide = presentation.getSlide(1);
        const svg = slide.renderSVG();

        const result = compareSvgToSnapshot(svg, testCase.name, 1, {
          maxDiffPercent: testCase.maxDiffPercent,
        });

        if (!result.match) {
          console.log(`Diff: ${result.diffPercent.toFixed(2)}% (threshold: ${testCase.maxDiffPercent}%)`);
          if (result.diffImagePath) {
            console.log(`Diff image: ${result.diffImagePath}`);
          }
        }

        expect(result.match).toBe(true);
      });
    });
  }
});
