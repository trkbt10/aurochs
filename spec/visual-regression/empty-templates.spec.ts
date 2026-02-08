/**
 * Visual regression tests for empty template PPTX files
 *
 * These tests verify that empty template slides render correctly as white,
 * matching LibreOffice output. They specifically verify:
 * - p:bgRef theme reference resolution (idx=1001 -> bgFillStyleLst[0])
 * - Background color scheme resolution (bg1 -> white)
 *
 * Baseline snapshots are generated with LibreOffice using:
 *   ./spec/visual-regression/scripts/generate-snapshots.sh <pptx-file>
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import * as fs from "node:fs";
import { openPresentation } from "@aurochs-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@aurochs-renderer/pptx/render-options";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots } from "./compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";

type EmptyTemplateTestCase = {
  name: string;
  pptxPath: string;
  description: string;
};

/**
 * Empty template files that should render as white
 * These files have:
 * - p:bgRef idx="1001" referencing theme's bgFillStyleLst[0]
 * - bg1 scheme color (typically white)
 * - Empty text placeholders
 */
const EMPTY_TEMPLATES: EmptyTemplateTestCase[] = [
  {
    name: "60042",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/60042.pptx",
    description: "Empty title slide template with p:bgRef idx=1001",
  },
  {
    name: "61515",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/61515.pptx",
    description: "Empty title slide template with p:bgRef idx=1001",
  },
];

describe("Empty Template Visual Regression", () => {
  for (const testCase of EMPTY_TEMPLATES) {
    describe(testCase.name, () => {
      it(`should match LibreOffice output: ${testCase.description}`, async () => {
        if (!fs.existsSync(testCase.pptxPath)) {
          console.warn(`SKIPPED: ${testCase.pptxPath} not found`);
          return;
        }

        const slides = listSnapshots(testCase.name);
        if (slides.length === 0) {
          console.warn(`SKIPPED: No snapshots found for ${testCase.name}`);
          return;
        }

        const { presentationFile } = await loadPptxFile(testCase.pptxPath);
        const presentation = openPresentation(presentationFile, {
          renderOptions: LIBREOFFICE_RENDER_OPTIONS,
        });

        for (const slideNum of slides) {
          if (!hasSnapshot(testCase.name, slideNum)) {
            continue;
          }

          const slide = presentation.getSlide(slideNum);
          const { svg } = renderSlideToSvg(slide);

          const result = await compareSvgToSnapshot({
            svg,
            snapshotName: testCase.name,
            slideNumber: slideNum,
            options: {
              // Empty templates should have very low diff (essentially white vs white)
              maxDiffPercent: 1,
            },
          });

          expect(result.match).toBe(true);
          if (!result.match) {
            console.error(
              `Slide ${slideNum} diff: ${result.diffPercent.toFixed(2)}% ` +
                `(threshold: 1%, pixels: ${result.diffPixels})`,
            );
          }
        }
      });
    });
  }
});
