/**
 * Visual regression tests for PPTX rendering
 *
 * These tests compare SVG output from web-pptx against baseline PNG images
 * generated from LibreOffice rendering.
 *
 * To generate/update baseline snapshots:
 *   ./spec/visual-regression/scripts/generate-snapshots.sh <pptx-file>
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "@oxen-office/pptx";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "@oxen-office/pptx";
import { compareSvgToSnapshot, hasSnapshot, listSnapshots, type CompareOptions } from "./compare";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

// Note: loadPptxFile is now imported from scripts/lib/pptx-loader.ts
// This shared utility avoids duplicating ZIP loading logic across tests

type TestCase = {
  name: string;
  pptxPath: string;
  slides: number[];
  options?: CompareOptions;
  mapHiddenSlides?: boolean;
}

function resolveSlides(testCase: TestCase): number[] {
  if (testCase.slides.length > 0) {
    return testCase.slides;
  }
  return listSnapshots(testCase.name);
}

function isHiddenSlideXml(xml: string): boolean {
  return /<p:sld\b[^>]*\bshow="0"/.test(xml);
}

function resolveVisibleSlideNumbers(presentationFile: PresentationFile): number[] {
  // Use LibreOffice dialect since baselines are generated with LibreOffice
  const presentation = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const slideNumbers = presentation
    .list()
    .map((info) => info.number)
    .sort((a, b) => a - b);
  return slideNumbers.filter((slideNumber) => {
    const xml = presentationFile.readText(`ppt/slides/slide${slideNumber}.xml`);
    if (xml === null) {
      return true;
    }
    return !isHiddenSlideXml(xml);
  });
}

function resolveSlideNumber(slideNum: number, visibleSlideNumbers: number[] | null): number {
  if (visibleSlideNumbers === null) {
    return slideNum;
  }
  const mapped = visibleSlideNumbers[slideNum - 1];
  if (mapped === undefined) {
    throw new Error(`Visible slide ${slideNum} not found`);
  }
  return mapped;
}

/**
 * Visual regression test configuration
 * Add new PPTX files here to include them in visual testing
 */
const TEST_CASES: TestCase[] = [
  {
    name: "2411-Performance_Up",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx",
    slides: [],
    mapHiddenSlides: true,
    options: {
      maxDiffPercent: 5,
    },
  },
  {
    name: "hello-world-unsigned",
    pptxPath: "fixtures/poi-test-data/test-data/xmldsign/hello-world-unsigned.pptx",
    slides: [1],
    options: {
      maxDiffPercent: 10, // Initial threshold, will tighten after fixes
    },
  },
  {
    name: "backgrounds",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/backgrounds.pptx",
    slides: [1, 2, 3, 4],
    options: {
      // Improved from 65%+ to ~20-30% via gradient and image fill fixes
      // Remaining diff from: z-order, text rendering, opacity handling
      maxDiffPercent: 35,
    },
  },
  {
    name: "table_test",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/table_test.pptx",
    slides: [1],
    options: {
      maxDiffPercent: 5, // Tables working well
    },
  },
  {
    name: "pie-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/pie-chart.pptx",
    slides: [1],
    options: {
      maxDiffPercent: 15, // Charts may have rendering differences
    },
  },
  {
    name: "bar-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/bar-chart.pptx",
    slides: [1],
    options: {
      maxDiffPercent: 15, // Charts may have rendering differences
    },
  },
  {
    name: "aptia",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/aptia.pptx",
    slides: [],
    options: {
      maxDiffPercent: 10,
    },
  },
  {
    name: "themes",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/themes.pptx",
    slides: [], // All 10 slides (auto-detected from snapshots)
    options: {
      // Theme application tests - verifying correct:
      // - Color scheme resolution (a:clrScheme)
      // - Font scheme resolution (a:fontScheme)
      // - Color map application (p:clrMap)
      // - Style reference colors (a:fillRef, a:fontRef)
      maxDiffPercent: 15, // Initial threshold, will tighten after fixes
    },
  },
  {
    name: "54542_cropped_bitmap",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/54542_cropped_bitmap.pptx",
    slides: [1],
    options: {
      // Image cropping tests - verifying correct:
      // - a:srcRect cropping (l, t, r, b percentages)
      // - Negative srcRect values (image expansion)
      // - a:stretch + a:fillRect fill mode
      // - Group rotation with nested cropped images
      // - rotWithShape attribute
      // @see ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect)
      // Measured diff: ~6.6% (improved from 11% after srcRect implementation)
      // Remaining diff: text rendering, some edge cases
      maxDiffPercent: 10,
    },
  },
  {
    name: "portfolio",
    pptxPath: "fixtures/samples/portfolio.pptx",
    slides: [], // All slides (auto-detected from snapshots)
    options: {
      // Layout shape inheritance tests - verifying correct:
      // - Non-placeholder shapes from slideLayout rendered behind slide content
      // - Connector shapes (p:cxnSp) from layout
      // - Background decorative rectangles and triangles
      // - Two-column layout split (slide 7)
      // @see ECMA-376 Part 1, Section 19.3.1.38 (sld)
      // @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
      maxDiffPercent: 5,
    },
  },
];

describe("Visual Regression Tests", () => {
  for (const testCase of TEST_CASES) {
    describe(testCase.name, () => {
      let presentationFile: PresentationFile | null = null;
      let skipReason: string | null = null;
      let visibleSlideNumbers: number[] | null = null;

      beforeAll(async () => {
        const fullPath = path.resolve(testCase.pptxPath);

        if (!fs.existsSync(fullPath)) {
          skipReason = `PPTX file not found: ${testCase.pptxPath}`;
          return;
        }

        const availableSnapshots = listSnapshots(testCase.name);
        if (availableSnapshots.length === 0) {
          skipReason = `No baseline snapshots found for ${testCase.name}. Run: ./spec/visual-regression/scripts/generate-snapshots.sh ${testCase.pptxPath}`;
          return;
        }

        ({ presentationFile } = await loadPptxFile(fullPath));
        visibleSlideNumbers = testCase.mapHiddenSlides ? resolveVisibleSlideNumbers(presentationFile) : null;
      });

      const slides = resolveSlides(testCase);

      for (const slideNum of slides) {
        it(`slide ${slideNum} matches baseline`, () => {
          if (skipReason !== null) {
            console.warn(`SKIPPED: ${skipReason}`);
            return;
          }

          if (!hasSnapshot(testCase.name, slideNum)) {
            console.warn(`SKIPPED: No baseline snapshot for slide ${slideNum}`);
            return;
          }

          if (presentationFile === null) {
            throw new Error("Presentation file not loaded");
          }

          // Use LibreOffice dialect since baselines are generated with LibreOffice
          const presentation = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
          const resolvedSlideNum = resolveSlideNumber(slideNum, visibleSlideNumbers);
          const slide = presentation.getSlide(resolvedSlideNum);
          const svg = renderSlideToSvg(slide).svg;

          const result = compareSvgToSnapshot(svg, testCase.name, slideNum, testCase.options);

          if (!result.match) {
            console.log(`\nVisual diff detected for ${testCase.name} slide ${slideNum}:`);
            console.log(`  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
            console.log(`  Diff percent: ${result.diffPercent.toFixed(2)}%`);
            if (result.diffImagePath !== null) {
              console.log(`  Diff image: ${result.diffImagePath}`);
            }
          }

          expect(result.match).toBe(true);
        });
      }
    });
  }
});

/**
 * Test helper to compare a specific slide manually
 * Usage in tests:
 *   const result = await testSlide('fixtures/path/to/file.pptx', 'snapshot-name', 1);
 */
export async function testSlide(
  ...args: readonly [
    pptxPath: string,
    snapshotName: string,
    slideNumber: number,
    options?: CompareOptions,
  ]
): Promise<{
  svg: string;
  result: ReturnType<typeof compareSvgToSnapshot>;
}> {
  const [pptxPath, snapshotName, slideNumber, options] = args;
  const { presentationFile } = await loadPptxFile(pptxPath);
  // Use LibreOffice dialect since baselines are generated with LibreOffice
  const presentation = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const slide = presentation.getSlide(slideNumber);
  const svg = renderSlideToSvg(slide).svg;

  const result = compareSvgToSnapshot(svg, snapshotName, slideNumber, options);

  return { svg, result };
}
