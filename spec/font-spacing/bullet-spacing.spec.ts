/**
 * @file Visual regression tests for bullet spacing
 *
 * Tests bullet rendering with various spacing and indentation settings.
 *
 * Test cases:
 * - bullet-char-default: Character bullets with default marL/indent
 * - bullet-auto-number: Auto-numbered bullets
 * - bullet-nested: Multi-level nested bullets
 * - bullet-custom-font: Bullets with custom fonts (Wingdings, Symbol)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "@oxen-office/pptx";
import { openPresentation } from "@oxen-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@oxen-renderer/pptx/render-options";
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
    name: "bullet-char-default",
    pptxPath: "fixtures/font-spacing/bullet-spacing/bullet-char-default.pptx",
    description: "Character bullets with marL/indent",
    maxDiffPercent: 5,
  },
  {
    name: "bullet-auto-number",
    pptxPath: "fixtures/font-spacing/bullet-spacing/bullet-auto-number.pptx",
    description: "Auto-numbered bullets (arabicPeriod)",
    maxDiffPercent: 5,
  },
  {
    name: "bullet-nested",
    pptxPath: "fixtures/font-spacing/bullet-spacing/bullet-nested.pptx",
    description: "Multi-level nested bullets",
    maxDiffPercent: 5,
  },
  {
    name: "bullet-custom-font",
    pptxPath: "fixtures/font-spacing/bullet-spacing/bullet-custom-font.pptx",
    description: "Bullets with custom fonts (Wingdings, Symbol)",
    maxDiffPercent: 10, // Higher threshold for font differences
  },
];

describe("Bullet Spacing - ECMA-376 21.1.2.4", () => {
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
