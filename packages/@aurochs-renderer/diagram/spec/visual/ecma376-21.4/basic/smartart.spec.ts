/**
 * @file SmartArt (Diagram) Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.4 (DrawingML Diagrams).
 *
 * @ecma376 21.4.2.19 layoutNode (Layout Node)
 * @ecma376 21.4.2.3 alg (Algorithm)
 * @ecma376 21.4.7.5 adj (Shape Adjust)
 */

import { runDiagramTest, DIAGRAM_THRESHOLDS, type DiagramTestCase } from "../../index";

const SMARTART_TESTS: DiagramTestCase[] = [
  {
    name: "SmartArt",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/SmartArt.pptx",
    slideNumber: 1,
    diagramType: "custom",
    ecmaSections: ["21.4.2.19", "21.4.2.3"],
    threshold: DIAGRAM_THRESHOLDS.experimental,
    description: "Basic SmartArt diagram rendering",
  },
  {
    name: "smartart-simple",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/smartart-simple.pptx",
    slideNumber: 1,
    diagramType: "list",
    ecmaSections: ["21.4.2.19"],
    threshold: DIAGRAM_THRESHOLDS.experimental,
    description: "Simple SmartArt list diagram",
  },
  {
    name: "smartart-rotated-text",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/smartart-rotated-text.pptx",
    slideNumber: 1,
    diagramType: "custom",
    ecmaSections: ["21.4.2.19", "21.4.7.5"],
    threshold: DIAGRAM_THRESHOLDS.experimental,
    description: "SmartArt with rotated text elements",
  },
];

describe("ECMA-376 21.4: SmartArt Diagrams", () => {
  for (const testCase of SMARTART_TESTS) {
    it(`renders ${testCase.name} correctly`, async () => {
      const result = await runDiagramTest(testCase);

      if (!result.match) {
        console.log(`[FAIL] ${testCase.name} (${testCase.diagramType})`);
        console.log(`  Diff: ${result.diffPercent.toFixed(2)}% (threshold: ${testCase.threshold}%)`);
        console.log(`  ECMA sections: ${testCase.ecmaSections.join(", ")}`);
      }

      expect(result.match).toBe(true);
    });
  }
});
