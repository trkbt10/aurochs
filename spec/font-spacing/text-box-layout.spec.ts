/**
 * @file Visual regression tests for text box layout
 *
 * Tests text body properties affecting layout.
 *
 * Test cases:
 * - anchor-top: Text anchored at top
 * - anchor-center: Text vertically centered
 * - anchor-bottom: Text anchored at bottom
 * - custom-insets: Custom lIns/rIns/tIns/bIns
 * - wrap-none: No word wrap mode
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:bodyPr)
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
    name: "anchor-top",
    pptxPath: "fixtures/font-spacing/text-box/anchor-top.pptx",
    description: 'Text anchored at top (anchor="t")',
    maxDiffPercent: 5,
  },
  {
    name: "anchor-center",
    pptxPath: "fixtures/font-spacing/text-box/anchor-center.pptx",
    description: 'Text vertically centered (anchor="ctr")',
    maxDiffPercent: 5,
  },
  {
    name: "anchor-bottom",
    pptxPath: "fixtures/font-spacing/text-box/anchor-bottom.pptx",
    description: 'Text anchored at bottom (anchor="b")',
    maxDiffPercent: 5,
  },
  {
    name: "custom-insets",
    pptxPath: "fixtures/font-spacing/text-box/custom-insets.pptx",
    description: "Custom insets (lIns/rIns/tIns/bIns)",
    maxDiffPercent: 5,
  },
  {
    name: "wrap-none",
    pptxPath: "fixtures/font-spacing/text-box/wrap-none.pptx",
    description: 'No word wrap (wrap="none")',
    maxDiffPercent: 5,
  },
];

describe("Text Box Layout (a:bodyPr) - ECMA-376 21.1.2.1.2", () => {
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
