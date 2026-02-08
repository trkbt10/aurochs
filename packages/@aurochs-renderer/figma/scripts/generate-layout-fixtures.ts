/**
 * @file Generate layouts.fig with pre-computed AutoLayout positions
 *
 * Positions are pre-computed to match Figma's AutoLayout calculations.
 * This ensures the generated file renders correctly without needing
 * Figma to recalculate positions.
 *
 * Usage: bun packages/@aurochs-renderer/figma/scripts/generate-layout-fixtures.ts
 */

import * as fs from "fs";
import * as path from "path";
import { loadFigFile, saveFigFile } from "@aurochs/fig/builder";
import type { FigNode } from "@aurochs/fig/types";

const TEMPLATE_FILE = path.join(import.meta.dir, "../../../@aurochs/fig/samples/sample-file.fig");
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
  return [
    {
      type: { value: 0, name: "SOLID" },
      color: { r, g, b, a },
      opacity: 1,
      visible: true,
      blendMode: { value: 1, name: "NORMAL" },
    },
  ];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function createSvgExportSettings() {
  return [
    {
      suffix: "",
      imageType: { value: 2, name: "SVG" },
      constraint: { type: { value: 0, name: "CONTENT_SCALE" }, value: 1 },
      contentsOnly: true,
      useAbsoluteBounds: false,
      colorProfile: { value: 0, name: "DOCUMENT" },
      useBicubicSampler: false,
    },
  ];
}

// =============================================================================
// Figma Schema Enum Values
// =============================================================================

const StackModeValue = { NONE: 0, HORIZONTAL: 1, VERTICAL: 2, GRID: 3 };
const StackJustifyValue = { MIN: 0, CENTER: 1, MAX: 2, SPACE_EVENLY: 3, SPACE_BETWEEN: 4 };
const StackAlignValue = { MIN: 0, CENTER: 1, MAX: 2, BASELINE: 3 };

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
  background: string;
  // AutoLayout (optional - only set if needed for metadata, positions are pre-computed)
  stackMode?: "HORIZONTAL" | "VERTICAL";
  stackSpacing?: number;
  stackPrimaryAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  stackCounterAlignItems?: "MIN" | "CENTER" | "MAX";
  hasExport?: boolean;
};

function createFrameNode(opts: FrameOptions): FigNode {
  const [r, g, b] = hexToRgb(opts.background);
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
    fillPaints: createSolidPaint(r, g, b),
  };

  if (opts.parentID >= 0) {
    node.parentIndex = {
      guid: createGUID(opts.parentID),
      position: String.fromCharCode(33 + (opts.localID % 93)),
    };
  }

  // AutoLayout properties (for metadata)
  if (opts.stackMode) {
    node.stackMode = createEnumValue(StackModeValue[opts.stackMode], opts.stackMode);
  }
  if (opts.stackSpacing !== undefined) {
    node.stackSpacing = opts.stackSpacing;
  }
  if (opts.stackPrimaryAlignItems) {
    node.stackPrimaryAlignItems = createEnumValue(
      StackJustifyValue[opts.stackPrimaryAlignItems],
      opts.stackPrimaryAlignItems,
    );
  }
  if (opts.stackCounterAlignItems) {
    node.stackCounterAlignItems = createEnumValue(
      StackAlignValue[opts.stackCounterAlignItems],
      opts.stackCounterAlignItems,
    );
  }

  if (opts.hasExport) {
    node.exportSettings = createSvgExportSettings();
  }

  return node as FigNode;
}

type RectOptions = {
  localID: number;
  parentID: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  cornerRadius?: number;
};

function createRectNode(opts: RectOptions): FigNode {
  const [r, g, b] = hexToRgb(opts.fill);
  return {
    guid: createGUID(opts.localID),
    phase: createEnumValue(0, "CREATED"),
    type: createEnumValue(12, "ROUNDED_RECTANGLE"),
    name: opts.name,
    visible: true,
    opacity: 1,
    size: { x: opts.width, y: opts.height },
    transform: createTransform(opts.x, opts.y),
    strokeWeight: 0,
    strokeAlign: createEnumValue(1, "INSIDE"),
    strokeJoin: createEnumValue(0, "MITER"),
    fillPaints: createSolidPaint(r, g, b),
    cornerRadius: opts.cornerRadius ?? 0,
    parentIndex: {
      guid: createGUID(opts.parentID),
      position: String.fromCharCode(33 + (opts.localID % 93)),
    },
  } as FigNode;
}

// =============================================================================
// Test Case Data (matching autolayout.fig exactly)
// =============================================================================

type ChildData = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  cornerRadius?: number;
};

type FrameData = {
  name: string;
  width: number;
  height: number;
  background: string;
  stackMode?: "HORIZONTAL" | "VERTICAL";
  stackSpacing?: number;
  stackPrimaryAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  stackCounterAlignItems?: "MIN" | "CENTER" | "MAX";
  children: ChildData[];
};

// Pre-computed layout data matching Figma's calculations
const TEST_CASES: FrameData[] = [
  {
    name: "simple-rects",
    width: 200,
    height: 200,
    background: "#f2f2f2",
    children: [
      { name: "rect1", x: 20, y: 20, width: 60, height: 60, fill: "#6699e5" },
      { name: "rect2", x: 100, y: 80, width: 80, height: 40, fill: "#e58066" },
    ],
  },
  {
    name: "auto-h-min",
    width: 140,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    stackSpacing: 10,
    children: [
      { name: "red", x: 0, y: 0, width: 40, height: 40, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 50, y: 0, width: 40, height: 60, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 100, y: 0, width: 40, height: 50, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-h-center",
    width: 140,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    stackSpacing: 10,
    stackPrimaryAlignItems: "CENTER",
    stackCounterAlignItems: "CENTER",
    children: [
      { name: "red", x: 0, y: 80, width: 40, height: 40, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 50, y: 70, width: 40, height: 60, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 100, y: 75, width: 40, height: 50, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-h-max",
    width: 140,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    stackSpacing: 10,
    stackPrimaryAlignItems: "MAX",
    stackCounterAlignItems: "MAX",
    children: [
      { name: "red", x: 0, y: 160, width: 40, height: 40, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 50, y: 140, width: 40, height: 60, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 100, y: 150, width: 40, height: 50, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-v-min",
    width: 200,
    height: 110,
    background: "#f2f2f2",
    stackMode: "VERTICAL",
    stackSpacing: 10,
    children: [
      { name: "red", x: 0, y: 0, width: 40, height: 30, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 0, y: 40, width: 60, height: 30, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 0, y: 80, width: 50, height: 30, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-v-center",
    width: 200,
    height: 110,
    background: "#f2f2f2",
    stackMode: "VERTICAL",
    stackSpacing: 10,
    stackPrimaryAlignItems: "CENTER",
    stackCounterAlignItems: "CENTER",
    children: [
      { name: "red", x: 80, y: 0, width: 40, height: 30, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 70, y: 40, width: 60, height: 30, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 75, y: 80, width: 50, height: 30, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-v-max",
    width: 200,
    height: 110,
    background: "#f2f2f2",
    stackMode: "VERTICAL",
    stackSpacing: 10,
    stackPrimaryAlignItems: "MAX",
    stackCounterAlignItems: "MAX",
    children: [
      { name: "red", x: 160, y: 0, width: 40, height: 30, fill: "#e54d4d", cornerRadius: 4 },
      { name: "green", x: 140, y: 40, width: 60, height: 30, fill: "#4de54d", cornerRadius: 4 },
      { name: "blue", x: 150, y: 80, width: 50, height: 30, fill: "#4d4de5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-h-space-between",
    width: 120,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    stackSpacing: 10,
    stackPrimaryAlignItems: "SPACE_BETWEEN",
    stackCounterAlignItems: "CENTER",
    children: [
      { name: "orange", x: 0, y: 80, width: 40, height: 40, fill: "#e5994d", cornerRadius: 4 },
      { name: "lime", x: 40, y: 80, width: 40, height: 40, fill: "#99e54d", cornerRadius: 4 },
      { name: "sky", x: 80, y: 80, width: 40, height: 40, fill: "#4d99e5", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-gap-0",
    width: 150,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    children: [
      { name: "r1", x: 0, y: 0, width: 50, height: 50, fill: "#b24d4d", cornerRadius: 4 },
      { name: "r2", x: 50, y: 0, width: 50, height: 50, fill: "#4db24d", cornerRadius: 4 },
      { name: "r3", x: 100, y: 0, width: 50, height: 50, fill: "#4d4db2", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-gap-20",
    width: 160,
    height: 200,
    background: "#f2f2f2",
    stackMode: "HORIZONTAL",
    stackSpacing: 20,
    children: [
      { name: "r1", x: 0, y: 0, width: 40, height: 40, fill: "#b24d4d", cornerRadius: 4 },
      { name: "r2", x: 60, y: 0, width: 40, height: 40, fill: "#4db24d", cornerRadius: 4 },
      { name: "r3", x: 120, y: 0, width: 40, height: 40, fill: "#4d4db2", cornerRadius: 4 },
    ],
  },
  {
    name: "auto-padding-20",
    width: 200,
    height: 88,
    background: "#f2f2f2",
    stackMode: "VERTICAL",
    stackSpacing: 8,
    children: [
      { name: "r1", x: 0, y: 0, width: 80, height: 40, fill: "#9966cc", cornerRadius: 4 },
      { name: "r2", x: 0, y: 48, width: 80, height: 40, fill: "#6699cc", cornerRadius: 4 },
    ],
  },
  {
    name: "constraints-corners",
    width: 200,
    height: 200,
    background: "#f2f2f2",
    children: [
      { name: "tl", x: 10, y: 10, width: 30, height: 30, fill: "#e54d4d" },
      { name: "tr", x: 160, y: 10, width: 30, height: 30, fill: "#4de54d" },
      { name: "c", x: 85, y: 85, width: 30, height: 30, fill: "#e5e54d" },
      { name: "bl", x: 10, y: 160, width: 30, height: 30, fill: "#4d4de5" },
      { name: "br", x: 160, y: 160, width: 30, height: 30, fill: "#e54de5" },
    ],
  },
];

// =============================================================================
// Grid Layout
// =============================================================================

const GRID_COLS = 4;
const GRID_GAP = 100;
const GRID_OFFSET_X = 100;
const GRID_OFFSET_Y = 100;

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

  // Get document and canvas IDs from template
  let docID = 0;
  let canvasID = 1;

  for (const node of loaded.nodeChanges) {
    const d = node as Record<string, unknown>;
    const type = d.type as { name: string };
    const guid = d.guid as { sessionID: number; localID: number };

    if (type?.name === "DOCUMENT" && docID === 0) {
      docID = guid.localID;
    }
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

  console.log(`Creating ${TEST_CASES.length} test cases...\n`);

  // Calculate max frame dimensions for grid layout
  const maxWidth = Math.max(...TEST_CASES.map((tc) => tc.width));
  const maxHeight = Math.max(...TEST_CASES.map((tc) => tc.height));

  TEST_CASES.forEach((testCase, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const x = GRID_OFFSET_X + col * (maxWidth + GRID_GAP);
    const y = GRID_OFFSET_Y + row * (maxHeight + GRID_GAP);

    const frameID = getNextID();

    // Create frame
    loaded.nodeChanges.push(
      createFrameNode({
        localID: frameID,
        parentID: canvasID,
        name: testCase.name,
        x,
        y,
        width: testCase.width,
        height: testCase.height,
        background: testCase.background,
        stackMode: testCase.stackMode,
        stackSpacing: testCase.stackSpacing,
        stackPrimaryAlignItems: testCase.stackPrimaryAlignItems,
        stackCounterAlignItems: testCase.stackCounterAlignItems,
        hasExport: true,
      }),
    );

    // Create children
    for (const child of testCase.children) {
      const childID = getNextID();
      loaded.nodeChanges.push(
        createRectNode({
          localID: childID,
          parentID: frameID,
          name: child.name,
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
          fill: child.fill,
          cornerRadius: child.cornerRadius,
        }),
      );
    }

    console.log(`  [${index + 1}/${TEST_CASES.length}] ${testCase.name} (${testCase.width}x${testCase.height})`);
  });

  console.log("\nSaving...");
  const figData = await saveFigFile(loaded, {
    metadata: { fileName: "Layout Tests" },
  });

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`\nSaved: ${OUTPUT_FILE}`);
  console.log(`Size: ${(figData.length / 1024).toFixed(1)} KB`);
  console.log(`\nTest cases: ${TEST_CASES.length}`);
}

generateLayoutFixtures().catch(console.error);
