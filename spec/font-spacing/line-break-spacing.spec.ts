/**
 * @file Visual regression tests for line breaks with character spacing
 *
 * Tests how line breaks interact with character spacing.
 *
 * Test cases:
 * - break-with-spacing: Line breaks with consistent spacing
 * - mixed-spacing-breaks: Different spacing per line
 * - mixed-formatting-breaks: Mixed bold/normal with breaks
 * - paragraphs-vs-breaks: Paragraph separation vs soft breaks
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.1 (a:br)
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:spc)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "@aurochs-office/pptx";
import { openPresentation } from "@aurochs-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@aurochs-renderer/pptx/render-options";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots } from "../visual-regression/compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";

type TestCase = {
  name: string;
  pptxPath: string;
  description: string;
  maxDiffPercent: number;
};

const TEST_CASES: TestCase[] = [
  {
    name: "break-with-spacing",
    pptxPath: "fixtures/font-spacing/line-break/break-with-spacing.pptx",
    description: 'Line breaks with character spacing (spc="50")',
    maxDiffPercent: 5,
  },
  {
    name: "mixed-spacing-breaks",
    pptxPath: "fixtures/font-spacing/line-break/mixed-spacing-breaks.pptx",
    description: "Different spacing per line (normal, tight, loose)",
    maxDiffPercent: 5,
  },
  {
    name: "mixed-formatting-breaks",
    pptxPath: "fixtures/font-spacing/line-break/mixed-formatting-breaks.pptx",
    description: "Mixed formatting (bold/normal) with breaks",
    maxDiffPercent: 5,
  },
  {
    name: "paragraphs-vs-breaks",
    pptxPath: "fixtures/font-spacing/line-break/paragraphs-vs-breaks.pptx",
    description: "Paragraph separation vs soft line breaks",
    maxDiffPercent: 5,
  },
];

describe("Line Break with Character Spacing - ECMA-376 21.1.2.3.1", () => {
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

        const result = compareSvgToSnapshot({
          svg,
          snapshotName: testCase.name,
          slideNumber: 1,
          options: { maxDiffPercent: testCase.maxDiffPercent },
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
