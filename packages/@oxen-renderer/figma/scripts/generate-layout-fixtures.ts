/**
 * @file Generate layouts.fig with comprehensive AutoLayout test cases
 *
 * Usage: bun packages/@oxen-renderer/figma/scripts/generate-layout-fixtures.ts
 *
 * Structure:
 * - FRAME (container with AutoLayout + SVG export settings)
 *   - ROUNDED_RECTANGLE (colored shape elements)
 */

import * as fs from "fs";
import * as path from "path";
import {
  loadFigFile,
  saveFigFile,
} from "@oxen/fig/builder";
import type { FigNode } from "@oxen/fig/types";

const TEMPLATE_FILE = path.join(import.meta.dir, "../../../@oxen/fig/samples/sample-file.fig");
const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/layouts");
const OUTPUT_FILE = path.join(FIXTURES_DIR, "layouts.fig");

// =============================================================================
// Node Creation Helpers
// =============================================================================

let nextLocalID = 100;
const sessionID = 0;

function getNextID(): number {
  return nextLocalID++;
}

function createGUID(localID: number) {
  return { sessionID, localID };
}

function createTransform(x: number, y: number) {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function createEnumValue(value: number, name: string) {
  return { value, name };
}

function createSolidPaint(r: number, g: number, b: number, a: number = 1) {
  return [{
    type: { value: 0, name: "SOLID" },
    color: { r, g, b, a },
    opacity: 1,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" },
  }];
}

// Note: For ROUNDED_RECTANGLE, we don't need fillGeometry - Figma generates it automatically
// Only provide fillGeometry for FRAME if needed

// SVG export settings
function createSvgExportSettings() {
  return [{
    suffix: "",
    imageType: { value: 2, name: "SVG" },  // SVG = 2
    constraint: {
      type: { value: 0, name: "CONTENT_SCALE" },
      value: 1,
    },
    contentsOnly: true,
    useAbsoluteBounds: false,
    colorProfile: { value: 0, name: "DOCUMENT" },
    useBicubicSampler: false,
  }];
}

// =============================================================================
// Figma Schema Enum Values
// =============================================================================

const StackModeValue = { NONE: 0, HORIZONTAL: 1, VERTICAL: 2, GRID: 3 };
const StackJustifyValue = { MIN: 0, CENTER: 1, MAX: 2, SPACE_EVENLY: 3, SPACE_BETWEEN: 4 };
const StackAlignValue = { MIN: 0, CENTER: 1, MAX: 2, BASELINE: 3 };
const StackCounterAlignValue = { MIN: 0, CENTER: 1, MAX: 2, STRETCH: 3, AUTO: 4, BASELINE: 5 };
const ConstraintTypeValue = { MIN: 0, CENTER: 1, MAX: 2, STRETCH: 3, SCALE: 4 };

// =============================================================================
// Node Builders
// =============================================================================

type FrameOptions = {
  localID: number;
  parentID: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background?: [number, number, number];
  cornerRadius?: number;
  // AutoLayout
  stackMode?: "HORIZONTAL" | "VERTICAL";
  stackSpacing?: number;
  stackPadding?: number;
  stackPrimaryAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  stackCounterAlignItems?: "MIN" | "CENTER" | "MAX";
  // Child constraints
  horizontalConstraint?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  verticalConstraint?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  stackChildAlignSelf?: "MIN" | "CENTER" | "MAX" | "STRETCH";
  // Export
  hasExport?: boolean;
};

function createFrameNode(opts: FrameOptions): FigNode {
  const node: Record<string, unknown> = {
    guid: createGUID(opts.localID),
    phase: createEnumValue(0, "CREATED"),
    type: createEnumValue(4, "FRAME"),
    name: opts.name,
    visible: true,
    opacity: 1,
    size: { x: opts.width, y: opts.height },
    transform: createTransform(opts.x, opts.y),
    strokeWeight: 0,
    strokeAlign: createEnumValue(1, "INSIDE"),
    strokeJoin: createEnumValue(0, "MITER"),
    frameMaskDisabled: false,
  };

  if (opts.parentID >= 0) {
    node.parentIndex = {
      guid: createGUID(opts.parentID),
      position: String.fromCharCode(33 + (opts.localID % 93)),
    };
  }

  if (opts.background) {
    node.fillPaints = createSolidPaint(...opts.background);
  } else {
    node.fillPaints = createSolidPaint(1, 1, 1);
  }

  if (opts.cornerRadius !== undefined) {
    node.cornerRadius = opts.cornerRadius;
  }

  // AutoLayout
  if (opts.stackMode) {
    node.stackMode = createEnumValue(StackModeValue[opts.stackMode], opts.stackMode);
  }
  if (opts.stackSpacing !== undefined) {
    node.stackSpacing = opts.stackSpacing;
  }
  if (opts.stackPadding !== undefined) {
    node.stackPadding = opts.stackPadding;
  }
  if (opts.stackPrimaryAlignItems) {
    node.stackPrimaryAlignItems = createEnumValue(
      StackJustifyValue[opts.stackPrimaryAlignItems],
      opts.stackPrimaryAlignItems
    );
  }
  if (opts.stackCounterAlignItems) {
    node.stackCounterAlignItems = createEnumValue(
      StackAlignValue[opts.stackCounterAlignItems],
      opts.stackCounterAlignItems
    );
  }

  // Child constraints
  if (opts.horizontalConstraint) {
    node.horizontalConstraint = createEnumValue(
      ConstraintTypeValue[opts.horizontalConstraint],
      opts.horizontalConstraint
    );
  }
  if (opts.verticalConstraint) {
    node.verticalConstraint = createEnumValue(
      ConstraintTypeValue[opts.verticalConstraint],
      opts.verticalConstraint
    );
  }
  if (opts.stackChildAlignSelf) {
    node.stackChildAlignSelf = createEnumValue(
      StackCounterAlignValue[opts.stackChildAlignSelf],
      opts.stackChildAlignSelf
    );
  }

  // Export settings
  if (opts.hasExport) {
    node.exportSettings = createSvgExportSettings();
  }

  return node as FigNode;
}

// ROUNDED_RECTANGLE for colored shape elements (type = 12)
function createRectNode(opts: {
  localID: number;
  parentID: number;
  name: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  r: number;
  g: number;
  b: number;
  cornerRadius?: number;
  horizontalConstraint?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  verticalConstraint?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
}): FigNode {
  const node: Record<string, unknown> = {
    guid: createGUID(opts.localID),
    phase: createEnumValue(0, "CREATED"),
    type: createEnumValue(12, "ROUNDED_RECTANGLE"),
    name: opts.name,
    visible: true,
    opacity: 1,
    size: { x: opts.width, y: opts.height },
    transform: createTransform(opts.x ?? 0, opts.y ?? 0),
    strokeWeight: 0,
    strokeAlign: createEnumValue(1, "INSIDE"),
    strokeJoin: createEnumValue(0, "MITER"),
    fillPaints: createSolidPaint(opts.r, opts.g, opts.b),
    cornerRadius: opts.cornerRadius ?? 0,
    parentIndex: {
      guid: createGUID(opts.parentID),
      position: String.fromCharCode(33 + (opts.localID % 93)),
    },
  };

  // Child constraints
  if (opts.horizontalConstraint) {
    node.horizontalConstraint = createEnumValue(
      ConstraintTypeValue[opts.horizontalConstraint],
      opts.horizontalConstraint
    );
  }
  if (opts.verticalConstraint) {
    node.verticalConstraint = createEnumValue(
      ConstraintTypeValue[opts.verticalConstraint],
      opts.verticalConstraint
    );
  }

  return node as FigNode;
}

// =============================================================================
// Test Case Definitions
// =============================================================================

type NodeAdder = (nodes: FigNode[]) => void;
type TestCase = {
  name: string;
  create: (canvasID: number, x: number, y: number) => NodeAdder;
};

const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const GRID_COLS = 4;
const GRID_GAP = 150; // Large gap for visibility
const GRID_OFFSET_X = 100;
const GRID_OFFSET_Y = 100;

function addRect(nodes: FigNode[], parentID: number, w: number, h: number, r: number, g: number, b: number, name: string) {
  const id = getNextID();
  nodes.push(createRectNode({
    localID: id,
    parentID,
    name,
    width: w,
    height: h,
    r, g, b,
    cornerRadius: 4,
  }));
  return id;
}

// =============================================================================
// AutoLayout Basic Test Cases
// =============================================================================

const autoLayoutBasicCases: TestCase[] = [
  {
    name: "auto-h-min",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-h-min",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 40, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 40, 60, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 40, 50, 0.3, 0.3, 0.9, "blue");
    },
  },
  {
    name: "auto-h-center",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-h-center",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "CENTER", stackCounterAlignItems: "CENTER",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 40, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 40, 60, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 40, 50, 0.3, 0.3, 0.9, "blue");
    },
  },
  {
    name: "auto-h-max",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-h-max",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "MAX", stackCounterAlignItems: "MAX",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 40, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 40, 60, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 40, 50, 0.3, 0.3, 0.9, "blue");
    },
  },
  {
    name: "auto-v-min",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-v-min",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "VERTICAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 30, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 60, 30, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 50, 30, 0.3, 0.3, 0.9, "blue");
    },
  },
  {
    name: "auto-v-center",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-v-center",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "VERTICAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "CENTER", stackCounterAlignItems: "CENTER",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 30, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 60, 30, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 50, 30, 0.3, 0.3, 0.9, "blue");
    },
  },
  {
    name: "auto-v-max",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-v-max",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "VERTICAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "MAX", stackCounterAlignItems: "MAX",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 30, 0.9, 0.3, 0.3, "red");
      addRect(nodes, frameID, 60, 30, 0.3, 0.9, 0.3, "green");
      addRect(nodes, frameID, 50, 30, 0.3, 0.3, 0.9, "blue");
    },
  },
];

const alignmentCases: TestCase[] = [
  {
    name: "auto-h-space-between",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-h-space-between",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 10, stackPadding: 10,
        stackPrimaryAlignItems: "SPACE_BETWEEN", stackCounterAlignItems: "CENTER",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 40, 0.9, 0.6, 0.3, "orange");
      addRect(nodes, frameID, 40, 40, 0.6, 0.9, 0.3, "lime");
      addRect(nodes, frameID, 40, 40, 0.3, 0.6, 0.9, "sky");
    },
  },
];

const gapPaddingCases: TestCase[] = [
  {
    name: "auto-gap-0",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-gap-0",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 0, stackPadding: 10,
        stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN",
        hasExport: true,
      }));
      addRect(nodes, frameID, 50, 50, 0.7, 0.3, 0.3, "r1");
      addRect(nodes, frameID, 50, 50, 0.3, 0.7, 0.3, "r2");
      addRect(nodes, frameID, 50, 50, 0.3, 0.3, 0.7, "r3");
    },
  },
  {
    name: "auto-gap-20",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-gap-20",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "HORIZONTAL", stackSpacing: 20, stackPadding: 10,
        stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN",
        hasExport: true,
      }));
      addRect(nodes, frameID, 40, 40, 0.7, 0.3, 0.3, "r1");
      addRect(nodes, frameID, 40, 40, 0.3, 0.7, 0.3, "r2");
      addRect(nodes, frameID, 40, 40, 0.3, 0.3, 0.7, "r3");
    },
  },
  {
    name: "auto-padding-20",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "auto-padding-20",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        stackMode: "VERTICAL", stackSpacing: 8, stackPadding: 20,
        stackPrimaryAlignItems: "MIN", stackCounterAlignItems: "MIN",
        hasExport: true,
      }));
      addRect(nodes, frameID, 80, 40, 0.6, 0.4, 0.8, "r1");
      addRect(nodes, frameID, 80, 40, 0.4, 0.6, 0.8, "r2");
    },
  },
];

const constraintCases: TestCase[] = [
  {
    name: "constraints-corners",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "constraints-corners",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.95, 0.95, 0.95],
        hasExport: true,
      }));

      // Top-left - use ROUNDED_RECTANGLE with constraints
      const tl = getNextID();
      nodes.push(createRectNode({
        localID: tl, parentID: frameID, name: "tl",
        x: 10, y: 10, width: 30, height: 30,
        r: 0.9, g: 0.3, b: 0.3,
        horizontalConstraint: "MIN", verticalConstraint: "MIN",
      }));

      // Top-right
      const tr = getNextID();
      nodes.push(createRectNode({
        localID: tr, parentID: frameID, name: "tr",
        x: 160, y: 10, width: 30, height: 30,
        r: 0.3, g: 0.9, b: 0.3,
        horizontalConstraint: "MAX", verticalConstraint: "MIN",
      }));

      // Center
      const c = getNextID();
      nodes.push(createRectNode({
        localID: c, parentID: frameID, name: "c",
        x: 85, y: 85, width: 30, height: 30,
        r: 0.9, g: 0.9, b: 0.3,
        horizontalConstraint: "CENTER", verticalConstraint: "CENTER",
      }));

      // Bottom-left
      const bl = getNextID();
      nodes.push(createRectNode({
        localID: bl, parentID: frameID, name: "bl",
        x: 10, y: 160, width: 30, height: 30,
        r: 0.3, g: 0.3, b: 0.9,
        horizontalConstraint: "MIN", verticalConstraint: "MAX",
      }));

      // Bottom-right
      const br = getNextID();
      nodes.push(createRectNode({
        localID: br, parentID: frameID, name: "br",
        x: 160, y: 160, width: 30, height: 30,
        r: 0.9, g: 0.3, b: 0.9,
        horizontalConstraint: "MAX", verticalConstraint: "MAX",
      }));
    },
  },
];

const simpleCases: TestCase[] = [
  {
    name: "simple-rects",
    create: (canvasID, x, y) => (nodes) => {
      const frameID = getNextID();
      nodes.push(createFrameNode({
        localID: frameID, parentID: canvasID, name: "simple-rects",
        x, y, width: FRAME_WIDTH, height: FRAME_HEIGHT,
        background: [0.98, 0.98, 0.98],
        hasExport: true,
      }));
      // Simple rectangles at fixed positions
      const r1 = getNextID();
      nodes.push({
        ...createRectNode({
          localID: r1, parentID: frameID, name: "rect1",
          width: 60, height: 60, r: 0.4, g: 0.6, b: 0.9,
        }),
        transform: createTransform(20, 20),
      } as FigNode);

      const r2 = getNextID();
      nodes.push({
        ...createRectNode({
          localID: r2, parentID: frameID, name: "rect2",
          width: 80, height: 40, r: 0.9, g: 0.5, b: 0.4,
        }),
        transform: createTransform(100, 80),
      } as FigNode);
    },
  },
];

// =============================================================================
// Main Generator
// =============================================================================

async function generateLayoutFixtures() {
  console.log("Generating layout fixtures...\n");

  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error(`Template not found: ${TEMPLATE_FILE}`);
    process.exit(1);
  }

  console.log(`Loading template: ${TEMPLATE_FILE}`);
  const templateData = fs.readFileSync(TEMPLATE_FILE);
  const loaded = await loadFigFile(new Uint8Array(templateData));

  console.log(`Template: ${loaded.nodeChanges.length} nodes, ${loaded.schema.definitions.length} schema definitions\n`);

  // Get document and canvas IDs
  let docID = 0;
  let canvasID = 1;

  // Find first DOCUMENT and first CANVAS with sessionID=0
  for (const node of loaded.nodeChanges) {
    const d = node as Record<string, unknown>;
    const type = d.type as { name: string };
    const guid = d.guid as { sessionID: number; localID: number };

    if (type?.name === "DOCUMENT" && docID === 0) {
      docID = guid.localID;
    }
    // Use only the first CANVAS with sessionID=0 for consistency
    if (type?.name === "CANVAS" && canvasID === 1 && guid.sessionID === 0) {
      canvasID = guid.localID;
    }
  }

  // Clear and rebuild
  loaded.nodeChanges.length = 0;

  // Add DOCUMENT
  loaded.nodeChanges.push({
    guid: createGUID(docID),
    phase: createEnumValue(0, "CREATED"),
    type: createEnumValue(1, "DOCUMENT"),
    name: "Layout Tests",
    visible: true,
    opacity: 1,
    transform: createTransform(0, 0),
    strokeWeight: 0,
    strokeAlign: createEnumValue(0, "CENTER"),
    strokeJoin: createEnumValue(1, "BEVEL"),
  } as FigNode);

  // Add CANVAS
  loaded.nodeChanges.push({
    guid: createGUID(canvasID),
    phase: createEnumValue(0, "CREATED"),
    type: createEnumValue(2, "CANVAS"),
    name: "AutoLayout Tests",
    visible: true,
    opacity: 1,
    transform: createTransform(0, 0),
    strokeWeight: 0,
    strokeAlign: createEnumValue(0, "CENTER"),
    strokeJoin: createEnumValue(1, "BEVEL"),
    backgroundOpacity: 1,
    backgroundColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
    backgroundEnabled: true,
    parentIndex: {
      guid: createGUID(docID),
      position: "!",
    },
  } as FigNode);

  // All test cases
  const allCases: TestCase[] = [
    ...simpleCases,
    ...autoLayoutBasicCases,
    ...alignmentCases,
    ...gapPaddingCases,
    ...constraintCases,
  ];

  console.log(`Creating ${allCases.length} test cases...\n`);

  allCases.forEach((testCase, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const x = GRID_OFFSET_X + col * (FRAME_WIDTH + GRID_GAP);
    const y = GRID_OFFSET_Y + row * (FRAME_HEIGHT + GRID_GAP);

    const adder = testCase.create(canvasID, x, y);
    adder(loaded.nodeChanges);
    console.log(`  [${index + 1}/${allCases.length}] ${testCase.name}`);
  });

  console.log("\nSaving...");
  const figData = await saveFigFile(loaded, {
    metadata: { fileName: "Layout Tests" },
  });

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`\nSaved: ${OUTPUT_FILE}`);
  console.log(`Size: ${(figData.length / 1024).toFixed(1)} KB`);
  console.log(`\nTest cases: ${allCases.length}`);
  console.log("  - Simple: 1");
  console.log("  - AutoLayout Basic: 6");
  console.log("  - Alignment: 1");
  console.log("  - Gap/Padding: 3");
  console.log("  - Constraints: 1");
}

generateLayoutFixtures().catch(console.error);
