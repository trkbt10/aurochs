/**
 * @file Visual regression tests for paragraph spacing (a:spcBef, a:spcAft)
 *
 * Tests ECMA-376 Part 1, Section 21.1.2.2.18-19 paragraph spacing attributes.
 *
 * Test cases:
 * - para-spacing-before: Space before paragraphs
 * - para-spacing-after: Space after paragraphs
 * - para-spacing-both: Combined before and after spacing
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.18 (a:spcAft)
 * @see ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcBef)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "@oxen-office/pptx";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "@oxen-office/pptx";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots } from "../visual-regression/compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

type TestCase = {
  name: string;
  pptxPath: string;
  description: string;
  maxDiffPercent: number;
};

const TEST_CASES: TestCase[] = [
  {
    name: "para-spacing-before",
    pptxPath: "fixtures/font-spacing/paragraph-spacing/para-spacing-before.pptx",
    description: "Space before paragraphs (spcBef)",
    maxDiffPercent: 5,
  },
  {
    name: "para-spacing-after",
    pptxPath: "fixtures/font-spacing/paragraph-spacing/para-spacing-after.pptx",
    description: "Space after paragraphs (spcAft)",
    maxDiffPercent: 5,
  },
  {
    name: "para-spacing-both",
    pptxPath: "fixtures/font-spacing/paragraph-spacing/para-spacing-both.pptx",
    description: "Combined before and after spacing",
    maxDiffPercent: 5,
  },
];

describe("Paragraph Spacing (a:spcBef, a:spcAft) - ECMA-376 21.1.2.2.18-19", () => {
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
