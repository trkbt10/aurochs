/**
 * @file Visual regression tests for line spacing (a:lnSpc)
 *
 * Tests ECMA-376 Part 1, Section 21.1.2.2.5 line spacing attribute.
 *
 * Test cases:
 * - line-spacing-single: 100% line spacing (baseline)
 * - line-spacing-1.5: 150% line spacing
 * - line-spacing-double: 200% line spacing
 * - line-spacing-exact: Exact point-based line spacing
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "../../src/pptx";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots } from "../visual-regression/compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../../src/pptx/render/svg";

type TestCase = {
  name: string;
  pptxPath: string;
  description: string;
  maxDiffPercent: number;
};

const TEST_CASES: TestCase[] = [
  {
    name: "line-spacing-single",
    pptxPath: "fixtures/font-spacing/line-spacing/line-spacing-single.pptx",
    description: "Single line spacing (100%)",
    maxDiffPercent: 5,
  },
  {
    name: "line-spacing-1.5",
    pptxPath: "fixtures/font-spacing/line-spacing/line-spacing-1.5.pptx",
    description: "1.5x line spacing (150%)",
    maxDiffPercent: 5,
  },
  {
    name: "line-spacing-double",
    pptxPath: "fixtures/font-spacing/line-spacing/line-spacing-double.pptx",
    description: "Double line spacing (200%)",
    maxDiffPercent: 5,
  },
  {
    name: "line-spacing-exact",
    pptxPath: "fixtures/font-spacing/line-spacing/line-spacing-exact.pptx",
    description: "Exact 24pt line spacing",
    maxDiffPercent: 5,
  },
];

describe("Line Spacing (a:lnSpc) - ECMA-376 21.1.2.2.5", () => {
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
        const { svg } = renderSlideToSvg(slide);

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
