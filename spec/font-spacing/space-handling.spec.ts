/**
 * @file Visual regression tests for space handling (half-width/full-width)
 *
 * Tests how spaces are rendered and their interaction with character spacing.
 *
 * Test cases:
 * - half-width-spaces: ASCII space rendering
 * - full-width-spaces: Full-width (Japanese) space rendering
 * - mixed-spaces: Mixed half/full-width spaces
 * - spaces-with-spc: Space interaction with a:spc
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:spc)
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
    name: "half-width-spaces",
    pptxPath: "fixtures/font-spacing/space-handling/half-width-spaces.pptx",
    description: "ASCII space rendering (single, double, triple)",
    maxDiffPercent: 5,
  },
  {
    name: "full-width-spaces",
    pptxPath: "fixtures/font-spacing/space-handling/full-width-spaces.pptx",
    description: "Full-width Japanese space rendering",
    maxDiffPercent: 10, // Higher threshold for CJK
  },
  {
    name: "mixed-spaces",
    pptxPath: "fixtures/font-spacing/space-handling/mixed-spaces.pptx",
    description: "Mixed half/full-width space comparison",
    maxDiffPercent: 10,
  },
  {
    name: "spaces-with-spc",
    pptxPath: "fixtures/font-spacing/space-handling/spaces-with-spc.pptx",
    description: "Space interaction with character spacing",
    maxDiffPercent: 5,
  },
];

describe("Space Handling - Half-width/Full-width", () => {
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
