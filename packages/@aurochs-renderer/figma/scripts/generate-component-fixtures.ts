#!/usr/bin/env bun
/**
 * @file Generate component fixture .fig file
 *
 * Creates a .fig file with component (SYMBOL/INSTANCE) examples for testing:
 * - Basic symbol with children
 * - Single instance
 * - Multiple instances
 * - Instance with fill override
 * - Nested components
 * - Instances in auto-layout
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-component-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createFigFile, frameNode, symbolNode, instanceNode, textNode, roundedRectNode } from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/components");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "components.fig");

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateComponentFixtures(): Promise<void> {
  console.log("Generating component fixtures...");

  const figFile = createFigFile();

  // Create document and canvas
  const docID = figFile.addDocument("Components");
  const canvasID = figFile.addCanvas(docID, "Components Canvas");

  let nextID = 10;

  // ==========================================================================
  // Symbol 1: Basic Button Component
  // ==========================================================================
  const buttonSymbolID = nextID++;
  figFile.addSymbol(
    symbolNode(buttonSymbolID, canvasID)
      .name("Button")
      .size(120, 40)
      .position(50, 50)
      .background(0.2, 0.5, 0.9)
      .cornerRadius(8)
      .autoLayout("HORIZONTAL")
      .gap(8)
      .padding(8, 16, 8, 16)
      .primaryAlign("CENTER")
      .counterAlign("CENTER")
      .exportAsSVG()
      .build(),
  );

  // Button background rect
  const buttonBgID = nextID++;
  figFile.addRoundedRectangle(
    roundedRectNode(buttonBgID, buttonSymbolID)
      .name("bg")
      .size(120, 40)
      .position(0, 0)
      .fill(0.2, 0.5, 0.9)
      .cornerRadius(8)
      .build(),
  );

  // Button text
  const buttonTextID = nextID++;
  figFile.addTextNode(
    textNode(buttonTextID, buttonSymbolID)
      .name("label")
      .text("Click Me")
      .font("Inter", "Medium")
      .fontSize(14)
      .color(1, 1, 1)
      .size(60, 20)
      .position(30, 10)
      .build(),
  );

  // ==========================================================================
  // Frame 1: Single Instance
  // ==========================================================================
  const frame1ID = nextID++;
  figFile.addFrame(
    frameNode(frame1ID, canvasID)
      .name("instance-single")
      .size(160, 80)
      .position(50, 150)
      .background(0.95, 0.95, 0.95)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const instance1ID = nextID++;
  figFile.addInstance(
    instanceNode(instance1ID, frame1ID, buttonSymbolID).name("Button Instance").size(120, 40).position(20, 20).build(),
  );

  // ==========================================================================
  // Frame 2: Multiple Instances
  // ==========================================================================
  const frame2ID = nextID++;
  figFile.addFrame(
    frameNode(frame2ID, canvasID)
      .name("instance-multi")
      .size(160, 160)
      .position(50, 250)
      .background(0.95, 0.95, 0.95)
      .autoLayout("VERTICAL")
      .gap(10)
      .padding(20)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  for (let i = 0; i < 3; i++) {
    const instanceID = nextID++;
    figFile.addInstance(
      instanceNode(instanceID, frame2ID, buttonSymbolID)
        .name(`Button ${i + 1}`)
        .size(120, 40)
        .position(20, 20 + i * 50)
        .build(),
    );
  }

  // ==========================================================================
  // Frame 3: Instance with Override
  // ==========================================================================
  const frame3ID = nextID++;
  figFile.addFrame(
    frameNode(frame3ID, canvasID)
      .name("instance-override-fill")
      .size(300, 80)
      .position(50, 430)
      .background(0.95, 0.95, 0.95)
      .autoLayout("HORIZONTAL")
      .gap(20)
      .padding(20)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Original color instance
  const overrideInstance1ID = nextID++;
  figFile.addInstance(
    instanceNode(overrideInstance1ID, frame3ID, buttonSymbolID).name("Original").size(120, 40).position(20, 20).build(),
  );

  // Red override instance
  const overrideInstance2ID = nextID++;
  figFile.addInstance(
    instanceNode(overrideInstance2ID, frame3ID, buttonSymbolID)
      .name("Red Override")
      .size(120, 40)
      .position(160, 20)
      .overrideBackground(0.9, 0.2, 0.2)
      .build(),
  );

  // ==========================================================================
  // Symbol 2: Card Component (for nesting)
  // ==========================================================================
  const cardSymbolID = nextID++;
  figFile.addSymbol(
    symbolNode(cardSymbolID, canvasID)
      .name("Card")
      .size(180, 100)
      .position(250, 50)
      .background(1, 1, 1)
      .cornerRadius(12)
      .autoLayout("VERTICAL")
      .gap(8)
      .padding(16)
      .exportAsSVG()
      .build(),
  );

  // Card title
  const cardTitleID = nextID++;
  figFile.addTextNode(
    textNode(cardTitleID, cardSymbolID)
      .name("title")
      .text("Card Title")
      .font("Inter", "Bold")
      .fontSize(16)
      .color(0.1, 0.1, 0.1)
      .size(148, 20)
      .position(16, 16)
      .build(),
  );

  // Nested button instance inside card symbol
  const nestedButtonID = nextID++;
  figFile.addInstance(
    instanceNode(nestedButtonID, cardSymbolID, buttonSymbolID).name("action").size(120, 40).position(16, 44).build(),
  );

  // ==========================================================================
  // Frame 4: Nested Components
  // ==========================================================================
  const frame4ID = nextID++;
  figFile.addFrame(
    frameNode(frame4ID, canvasID)
      .name("instance-nested")
      .size(220, 140)
      .position(250, 150)
      .background(0.9, 0.9, 0.95)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const cardInstanceID = nextID++;
  figFile.addInstance(
    instanceNode(cardInstanceID, frame4ID, cardSymbolID).name("Card Instance").size(180, 100).position(20, 20).build(),
  );

  // ==========================================================================
  // Frame 5: Instances in Auto-Layout
  // ==========================================================================
  const frame5ID = nextID++;
  figFile.addFrame(
    frameNode(frame5ID, canvasID)
      .name("instance-in-autolayout")
      .size(400, 80)
      .position(250, 310)
      .background(0.95, 0.95, 0.95)
      .autoLayout("HORIZONTAL")
      .gap(16)
      .padding(20)
      .primaryAlign("SPACE_BETWEEN")
      .counterAlign("CENTER")
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  for (let i = 0; i < 3; i++) {
    const alInstanceID = nextID++;
    figFile.addInstance(
      instanceNode(alInstanceID, frame5ID, buttonSymbolID)
        .name(`Action ${i + 1}`)
        .size(100, 40)
        .position(20 + i * 130, 20)
        .primarySizing("FILL")
        .build(),
    );
  }

  // ==========================================================================
  // Symbol 3: Simple Icon Component
  // ==========================================================================
  const iconSymbolID = nextID++;
  figFile.addSymbol(
    symbolNode(iconSymbolID, canvasID)
      .name("Icon")
      .size(24, 24)
      .position(500, 50)
      .background(0.5, 0.5, 0.5)
      .cornerRadius(4)
      .exportAsSVG()
      .build(),
  );

  // ==========================================================================
  // Frame 6: Multiple Icon Instances
  // ==========================================================================
  const frame6ID = nextID++;
  figFile.addFrame(
    frameNode(frame6ID, canvasID)
      .name("instance-icons")
      .size(200, 60)
      .position(250, 410)
      .background(0.95, 0.95, 0.95)
      .autoLayout("HORIZONTAL")
      .gap(8)
      .padding(18)
      .primaryAlign("MIN")
      .counterAlign("CENTER")
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  for (let i = 0; i < 5; i++) {
    const iconInstanceID = nextID++;
    figFile.addInstance(
      instanceNode(iconInstanceID, frame6ID, iconSymbolID)
        .name(`icon-${i + 1}`)
        .size(24, 24)
        .position(18 + i * 32, 18)
        .build(),
    );
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create actual/ directory for SVG exports
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }

  // Build and write the .fig file
  const figData = await figFile.buildAsync({ fileName: "components" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`\nSymbols:`);
  console.log(`  - Button (120x40)`);
  console.log(`  - Card (180x100) - contains nested Button`);
  console.log(`  - Icon (24x24)`);
  console.log(`\nTest Frames:`);
  console.log(`  - instance-single: Single button instance`);
  console.log(`  - instance-multi: Multiple button instances in vertical layout`);
  console.log(`  - instance-override-fill: Instances with fill overrides`);
  console.log(`  - instance-nested: Card with nested button (2-level nesting)`);
  console.log(`  - instance-in-autolayout: Buttons in horizontal auto-layout`);
  console.log(`  - instance-icons: Multiple small icon instances`);

  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Adjust positions if needed`);
  console.log(`3. Export each frame as SVG to ${actualDir}/`);
  console.log(`4. Run: npx vitest run packages/@aurochs-renderer/figma/spec/components.spec.ts`);
}

// Run
generateComponentFixtures().catch(console.error);
