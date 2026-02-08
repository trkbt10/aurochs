#!/usr/bin/env bun
/**
 * @file Generate symbol-resolution fixture .fig file
 *
 * Realistic, multi-canvas fixtures that test symbol (component) resolution
 * through deep nesting, frame-level rounding/clipping, property inheritance,
 * and real-world UI component patterns.
 *
 * Canvas 1 — "Components":  UI component patterns (buttons, cards, nav bars)
 * Canvas 2 — "Clipping":    Frame-level rounding and clip behavior
 * Canvas 3 — "Deep Nesting": 5-level nesting and inheritance chains
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-symbol-resolution-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  symbolNode,
  instanceNode,
  roundedRectNode,
  ellipseNode,
  dropShadow,
} from "@aurochs/fig/builder";
import type { Color } from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/symbol-resolution");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "symbol-resolution.fig");

// =============================================================================
// Colors (iOS-inspired palette)
// =============================================================================

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 };
const IOS_BLUE: Color = { r: 0, g: 0.478, b: 1, a: 1 };
const IOS_RED: Color = { r: 1, g: 0.231, b: 0.188, a: 1 };
const IOS_GREEN: Color = { r: 0.204, g: 0.78, b: 0.349, a: 1 };
const IOS_ORANGE: Color = { r: 1, g: 0.584, b: 0, a: 1 };
const IOS_PURPLE: Color = { r: 0.686, g: 0.322, b: 0.871, a: 1 };
const IOS_GRAY_BG: Color = { r: 0.949, g: 0.949, b: 0.969, a: 1 };
const IOS_GRAY_2: Color = { r: 0.682, g: 0.682, b: 0.698, a: 1 };
const IOS_GRAY_3: Color = { r: 0.78, g: 0.78, b: 0.8, a: 1 };
const CARD_SHADOW: Color = { r: 0, g: 0, b: 0, a: 0.15 };
const DARK_BG: Color = { r: 0.11, g: 0.11, b: 0.118, a: 1 };

// =============================================================================
// ID allocator
// =============================================================================

let nextID = 100;
function id(): number {
  return nextID++;
}

// =============================================================================
// Generate
// =============================================================================

async function generate(): Promise<void> {
  console.log("Generating symbol-resolution fixtures (realistic multi-canvas)...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("SymbolResolution");

  // =========================================================================
  // Canvas 1: "Components" — UI component patterns
  // =========================================================================
  const canvas1 = figFile.addCanvas(docID, "Components");

  // --- Symbol: IconCircle (24x24 colored circle) ---
  const iconCircleID = id();
  figFile.addSymbol(
    symbolNode(iconCircleID, canvas1).name("IconCircle").size(24, 24).position(0, -600).clipsContent(true).build(),
  );
  const iconCircleBg = id();
  figFile.addEllipse(
    ellipseNode(iconCircleBg, iconCircleID).name("icon-bg").size(24, 24).position(0, 0).fill(IOS_BLUE).build(),
  );

  // --- Symbol: Badge (18x18 notification badge, fully rounded) ---
  const badgeID = id();
  figFile.addSymbol(
    symbolNode(badgeID, canvas1)
      .name("Badge")
      .size(18, 18)
      .position(100, -600)
      .background(IOS_RED)
      .cornerRadius(9)
      .clipsContent(true)
      .build(),
  );
  const badgeDot = id();
  figFile.addEllipse(ellipseNode(badgeDot, badgeID).name("dot").size(6, 6).position(6, 6).fill(WHITE).build());

  // --- Symbol: IconWithBadge (32x32 frame, IconCircle + Badge at top-right) ---
  const iconBadgeID = id();
  figFile.addSymbol(
    symbolNode(iconBadgeID, canvas1)
      .name("IconWithBadge")
      .size(32, 32)
      .position(200, -600)
      .clipsContent(false) // badge extends beyond icon bounds
      .build(),
  );
  const ibIcon = id();
  figFile.addInstance(instanceNode(ibIcon, iconBadgeID, iconCircleID).name("icon").size(24, 24).position(4, 8).build());
  const ibBadge = id();
  figFile.addInstance(instanceNode(ibBadge, iconBadgeID, badgeID).name("badge").size(18, 18).position(18, -4).build());

  // --- Symbol: ButtonBase (120x44, rounded rect, blue fill) ---
  const buttonBaseID = id();
  figFile.addSymbol(
    symbolNode(buttonBaseID, canvas1)
      .name("ButtonBase")
      .size(120, 44)
      .position(350, -600)
      .background(IOS_BLUE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const btnLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(btnLabel, buttonBaseID)
      .name("label-bg")
      .size(100, 28)
      .position(10, 8)
      .fill(WHITE)
      .opacity(0.15)
      .cornerRadius(6)
      .build(),
  );

  // --- Symbol: CardHeader (fills parent width, 48px tall, colored bg) ---
  const cardHeaderID = id();
  figFile.addSymbol(
    symbolNode(cardHeaderID, canvas1)
      .name("CardHeader")
      .size(280, 48)
      .position(550, -600)
      .background(IOS_BLUE)
      .clipsContent(true)
      .build(),
  );
  const headerStripe = id();
  figFile.addRoundedRectangle(
    roundedRectNode(headerStripe, cardHeaderID)
      .name("stripe")
      .size(280, 4)
      .position(0, 44)
      .fill(BLACK)
      .opacity(0.1)
      .build(),
  );

  // --- Symbol: CardBody (280x120, white bg, 2 content rects) ---
  const cardBodyID = id();
  figFile.addSymbol(
    symbolNode(cardBodyID, canvas1)
      .name("CardBody")
      .size(280, 120)
      .position(900, -600)
      .background(WHITE)
      .clipsContent(true)
      .build(),
  );
  const bodyRect1 = id();
  figFile.addRoundedRectangle(
    roundedRectNode(bodyRect1, cardBodyID)
      .name("content-1")
      .size(120, 80)
      .position(16, 16)
      .fill(IOS_GRAY_BG)
      .cornerRadius(8)
      .build(),
  );
  const bodyRect2 = id();
  figFile.addRoundedRectangle(
    roundedRectNode(bodyRect2, cardBodyID)
      .name("content-2")
      .size(120, 80)
      .position(144, 16)
      .fill(IOS_GRAY_BG)
      .cornerRadius(8)
      .build(),
  );

  // --- Symbol: Card (280x200, rounded frame, header + body, drop shadow, clips) ---
  const cardID = id();
  figFile.addSymbol(
    symbolNode(cardID, canvas1)
      .name("Card")
      .size(280, 200)
      .position(1250, -600)
      .background(WHITE)
      .cornerRadius(16)
      .clipsContent(true)
      .build(),
  );
  const cardHeaderInst = id();
  figFile.addInstance(
    instanceNode(cardHeaderInst, cardID, cardHeaderID).name("header").size(280, 48).position(0, 0).build(),
  );
  const cardBodyInst = id();
  figFile.addInstance(
    instanceNode(cardBodyInst, cardID, cardBodyID).name("body").size(280, 120).position(0, 48).build(),
  );
  // Footer rect
  const cardFooter = id();
  figFile.addRoundedRectangle(
    roundedRectNode(cardFooter, cardID).name("footer").size(280, 32).position(0, 168).fill(IOS_GRAY_BG).build(),
  );

  // --- Symbol: NavItem (48x56, icon + label area) ---
  const navItemID = id();
  figFile.addSymbol(
    symbolNode(navItemID, canvas1).name("NavItem").size(48, 56).position(1600, -600).clipsContent(false).build(),
  );
  const navIcon = id();
  figFile.addInstance(
    instanceNode(navIcon, navItemID, iconBadgeID).name("icon-badge").size(32, 32).position(8, 4).build(),
  );
  const navLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(navLabel, navItemID)
      .name("label-placeholder")
      .size(40, 10)
      .position(4, 42)
      .fill(IOS_GRAY_2)
      .cornerRadius(2)
      .build(),
  );

  // --- Symbol: NavBar (320x64, dark bg, 4 NavItem instances) ---
  const navBarID = id();
  figFile.addSymbol(
    symbolNode(navBarID, canvas1)
      .name("NavBar")
      .size(320, 64)
      .position(1800, -600)
      .background(DARK_BG)
      .cornerRadius(0)
      .clipsContent(true)
      .build(),
  );
  for (let i = 0; i < 4; i++) {
    const navI = id();
    figFile.addInstance(
      instanceNode(navI, navBarID, navItemID)
        .name(`nav-${i}`)
        .size(48, 56)
        .position(24 + i * 72, 4)
        .build(),
    );
  }
  // Separator line
  const navSep = id();
  figFile.addRoundedRectangle(
    roundedRectNode(navSep, navBarID)
      .name("separator")
      .size(320, 1)
      .position(0, 0)
      .fill(IOS_GRAY_3)
      .opacity(0.5)
      .build(),
  );

  // --- Canvas 1: Test Frames ---

  let frameX = 50;
  let frameY = 50;

  // 1. button-inherit: Instance of ButtonBase (inherits blue fill + 12px radius)
  const f_btn_inherit = id();
  figFile.addFrame(
    frameNode(f_btn_inherit, canvas1)
      .name("button-inherit")
      .size(140, 64)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_btn_inherit, buttonBaseID).name("ButtonBase").size(120, 44).position(10, 10).build(),
  );

  frameX += 170;

  // 2. button-override: Two buttons — original blue vs overridden green
  const f_btn_override = id();
  figFile.addFrame(
    frameNode(f_btn_override, canvas1)
      .name("button-override")
      .size(280, 64)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_btn_override, buttonBaseID).name("original").size(120, 44).position(10, 10).build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_btn_override, buttonBaseID)
      .name("green-override")
      .size(120, 44)
      .position(150, 10)
      .overrideBackground(IOS_GREEN)
      .build(),
  );

  frameX += 310;

  // 3. card-with-header: Card instance — 3-level nesting (Card > CardHeader/CardBody > content)
  const f_card = id();
  figFile.addFrame(
    frameNode(f_card, canvas1)
      .name("card-with-header")
      .size(300, 220)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_card, cardID).name("Card").size(280, 200).position(10, 10).build());

  // Row 2
  frameX = 50;
  frameY += 250;

  // 4. card-resized: Card at smaller size (240x160 instead of 280x200)
  const f_card_small = id();
  figFile.addFrame(
    frameNode(f_card_small, canvas1)
      .name("card-resized")
      .size(260, 180)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_card_small, cardID).name("Card-small").size(240, 160).position(10, 10).build(),
  );

  frameX += 290;

  // 5. icon-badge-nesting: IconWithBadge — 2-level nesting, badge outside icon
  const f_icon_badge = id();
  figFile.addFrame(
    frameNode(f_icon_badge, canvas1)
      .name("icon-badge-nesting")
      .size(52, 52)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(false) // no clip so badge is visible
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_icon_badge, iconBadgeID).name("IconWithBadge").size(32, 32).position(10, 10).build(),
  );

  frameX += 80;

  // 6. navbar-full: NavBar instance — 4-level nesting (NavBar > NavItem > IconWithBadge > Icon+Badge)
  const f_navbar = id();
  figFile.addFrame(
    frameNode(f_navbar, canvas1)
      .name("navbar-full")
      .size(340, 84)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_navbar, navBarID).name("NavBar").size(320, 64).position(10, 10).build());

  frameX += 370;

  // 7. navbar-resized: NavBar at wider size (400x64)
  const f_navbar_wide = id();
  figFile.addFrame(
    frameNode(f_navbar_wide, canvas1)
      .name("navbar-resized")
      .size(420, 84)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_navbar_wide, navBarID).name("NavBar-wide").size(400, 64).position(10, 10).build(),
  );

  // Row 3
  frameX = 50;
  frameY += 120;

  // 8. multi-button-sizes: 3 ButtonBase instances at different sizes
  const f_multi_btn = id();
  figFile.addFrame(
    frameNode(f_multi_btn, canvas1)
      .name("multi-button-sizes")
      .size(400, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_multi_btn, buttonBaseID).name("small").size(80, 32).position(10, 24).build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_multi_btn, buttonBaseID).name("medium").size(120, 44).position(100, 18).build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_multi_btn, buttonBaseID).name("large").size(180, 56).position(230, 12).build(),
  );

  // =========================================================================
  // Canvas 2: "Clipping" — Frame-level rounding and clip behavior
  // =========================================================================
  const canvas2 = figFile.addCanvas(docID, "Clipping");

  // --- Symbol: AvatarFrame (64x64, fully rounded frame, clips content) ---
  const avatarFrameID = id();
  figFile.addSymbol(
    symbolNode(avatarFrameID, canvas2)
      .name("AvatarFrame")
      .size(64, 64)
      .position(0, -600)
      .background(IOS_GRAY_3)
      .cornerRadius(32) // fully rounded
      .clipsContent(true)
      .build(),
  );
  // Large rect extending beyond (simulates an image)
  const avatarImage = id();
  figFile.addRoundedRectangle(
    roundedRectNode(avatarImage, avatarFrameID)
      .name("avatar-image")
      .size(80, 80)
      .position(-8, -8)
      .fill(IOS_PURPLE)
      .build(),
  );
  // Smaller accent circle
  const avatarAccent = id();
  figFile.addEllipse(
    ellipseNode(avatarAccent, avatarFrameID).name("accent").size(20, 20).position(22, 22).fill(IOS_ORANGE).build(),
  );

  // --- Symbol: RoundedContainer (200x120, 16px radius, clips, gray bg) ---
  const roundedContainerID = id();
  figFile.addSymbol(
    symbolNode(roundedContainerID, canvas2)
      .name("RoundedContainer")
      .size(200, 120)
      .position(200, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(16)
      .clipsContent(true)
      .build(),
  );
  // Child that extends beyond right and bottom edges
  const rcOverflow = id();
  figFile.addRoundedRectangle(
    roundedRectNode(rcOverflow, roundedContainerID)
      .name("overflow-child")
      .size(160, 100)
      .position(60, 40)
      .fill(IOS_RED)
      .cornerRadius(8)
      .build(),
  );
  // Child at top-left corner (should be visible)
  const rcCorner = id();
  figFile.addRoundedRectangle(
    roundedRectNode(rcCorner, roundedContainerID)
      .name("corner-child")
      .size(80, 60)
      .position(12, 12)
      .fill(IOS_BLUE)
      .cornerRadius(8)
      .build(),
  );

  // --- Symbol: NestedRoundedOuter (240x160, 20px radius, clips) ---
  const nestedOuterID = id();
  figFile.addSymbol(
    symbolNode(nestedOuterID, canvas2)
      .name("NestedRoundedOuter")
      .size(240, 160)
      .position(500, -600)
      .background(WHITE)
      .cornerRadius(20)
      .clipsContent(true)
      .build(),
  );
  // Contains instance of RoundedContainer — nested rounded clip
  const nroInst = id();
  figFile.addInstance(
    instanceNode(nroInst, nestedOuterID, roundedContainerID)
      .name("inner-container")
      .size(200, 120)
      .position(20, 20)
      .build(),
  );

  // --- Symbol: ClipChain (280x180, 12px radius, clips) ---
  // Contains NestedRoundedOuter (which contains RoundedContainer)
  // 3-level nested clipping chain
  const clipChainID = id();
  figFile.addSymbol(
    symbolNode(clipChainID, canvas2)
      .name("ClipChain")
      .size(280, 180)
      .position(800, -600)
      .background(DARK_BG)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const ccInst = id();
  figFile.addInstance(
    instanceNode(ccInst, clipChainID, nestedOuterID).name("nested-outer").size(240, 160).position(20, 10).build(),
  );

  // --- Symbol: MixedClipFrame (200x140, 24px radius, clips) ---
  // Has children at corners to test rounded clipping
  const mixedClipID = id();
  figFile.addSymbol(
    symbolNode(mixedClipID, canvas2)
      .name("MixedClipFrame")
      .size(200, 140)
      .position(1150, -600)
      .background(WHITE)
      .cornerRadius(24)
      .clipsContent(true)
      .build(),
  );
  // Top-left corner rect (should be clipped by rounded corner)
  const mcTL = id();
  figFile.addRoundedRectangle(
    roundedRectNode(mcTL, mixedClipID).name("top-left").size(60, 40).position(0, 0).fill(IOS_RED).build(),
  );
  // Top-right corner rect
  const mcTR = id();
  figFile.addRoundedRectangle(
    roundedRectNode(mcTR, mixedClipID).name("top-right").size(60, 40).position(140, 0).fill(IOS_GREEN).build(),
  );
  // Bottom-left corner rect
  const mcBL = id();
  figFile.addRoundedRectangle(
    roundedRectNode(mcBL, mixedClipID).name("bottom-left").size(60, 40).position(0, 100).fill(IOS_BLUE).build(),
  );
  // Bottom-right corner rect
  const mcBR = id();
  figFile.addRoundedRectangle(
    roundedRectNode(mcBR, mixedClipID).name("bottom-right").size(60, 40).position(140, 100).fill(IOS_ORANGE).build(),
  );
  // Center ellipse
  const mcCenter = id();
  figFile.addEllipse(
    ellipseNode(mcCenter, mixedClipID).name("center").size(80, 60).position(60, 40).fill(IOS_PURPLE).build(),
  );

  // --- Canvas 2: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 9. avatar-clip: AvatarFrame — fully rounded clip on overflowing content
  const f_avatar = id();
  figFile.addFrame(
    frameNode(f_avatar, canvas2)
      .name("avatar-clip")
      .size(84, 84)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_avatar, avatarFrameID).name("AvatarFrame").size(64, 64).position(10, 10).build(),
  );

  frameX += 120;

  // 10. avatar-small: AvatarFrame at 40x40 (smaller, tighter clip)
  const f_avatar_sm = id();
  figFile.addFrame(
    frameNode(f_avatar_sm, canvas2)
      .name("avatar-small")
      .size(60, 60)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_avatar_sm, avatarFrameID).name("AvatarFrame-sm").size(40, 40).position(10, 10).build(),
  );

  frameX += 90;

  // 11. rounded-container-clip: RoundedContainer with overflowing children
  const f_rounded = id();
  figFile.addFrame(
    frameNode(f_rounded, canvas2)
      .name("rounded-container-clip")
      .size(220, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_rounded, roundedContainerID).name("RoundedContainer").size(200, 120).position(10, 10).build(),
  );

  frameX += 250;

  // 12. mixed-clip-corners: MixedClipFrame — corner rects clipped by rounded frame
  const f_mixed = id();
  figFile.addFrame(
    frameNode(f_mixed, canvas2)
      .name("mixed-clip-corners")
      .size(220, 160)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_mixed, mixedClipID).name("MixedClipFrame").size(200, 140).position(10, 10).build(),
  );

  // Row 2
  frameX = 50;
  frameY += 200;

  // 13. nested-rounded-clip: NestedRoundedOuter — 2-level rounded clip chain
  const f_nested_round = id();
  figFile.addFrame(
    frameNode(f_nested_round, canvas2)
      .name("nested-rounded-clip")
      .size(260, 180)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_nested_round, nestedOuterID)
      .name("NestedRoundedOuter")
      .size(240, 160)
      .position(10, 10)
      .build(),
  );

  frameX += 290;

  // 14. clip-chain-3level: ClipChain — 3-level nested clip (dark bg > white > gray > content)
  const f_clip_chain = id();
  figFile.addFrame(
    frameNode(f_clip_chain, canvas2)
      .name("clip-chain-3level")
      .size(300, 200)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_clip_chain, clipChainID).name("ClipChain").size(280, 180).position(10, 10).build(),
  );

  frameX += 330;

  // 15. clip-chain-resized: ClipChain at smaller size
  const f_clip_chain_sm = id();
  figFile.addFrame(
    frameNode(f_clip_chain_sm, canvas2)
      .name("clip-chain-resized")
      .size(240, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_clip_chain_sm, clipChainID).name("ClipChain-sm").size(220, 140).position(10, 10).build(),
  );

  // Row 3
  frameX = 50;
  frameY += 230;

  // 16. avatar-row: 3 avatars in a row (with badge on each)
  const f_avatar_row = id();
  figFile.addFrame(
    frameNode(f_avatar_row, canvas2)
      .name("avatar-row")
      .size(260, 84)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  for (let i = 0; i < 3; i++) {
    figFile.addInstance(
      instanceNode(id(), f_avatar_row, avatarFrameID)
        .name(`avatar-${i}`)
        .size(64, 64)
        .position(10 + i * 84, 10)
        .build(),
    );
  }

  // =========================================================================
  // Canvas 3: "Deep Nesting" — 5-level nesting and inheritance chains
  // =========================================================================
  const canvas3 = figFile.addCanvas(docID, "Deep Nesting");

  // Build a 5-level deep component hierarchy
  // Level 1: Base element (colored rounded rect with shadow)
  const level1ID = id();
  figFile.addSymbol(
    symbolNode(level1ID, canvas3)
      .name("L1-BaseElement")
      .size(80, 48)
      .position(0, -600)
      .background(IOS_BLUE)
      .cornerRadius(8)
      .clipsContent(true)
      .build(),
  );
  const l1Inner = id();
  figFile.addRoundedRectangle(
    roundedRectNode(l1Inner, level1ID)
      .name("highlight")
      .size(60, 28)
      .position(10, 10)
      .fill(WHITE)
      .opacity(0.3)
      .cornerRadius(4)
      .build(),
  );

  // Level 2: Pair of L1 side by side
  const level2ID = id();
  figFile.addSymbol(
    symbolNode(level2ID, canvas3)
      .name("L2-Pair")
      .size(180, 68)
      .position(200, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  figFile.addInstance(instanceNode(id(), level2ID, level1ID).name("left").size(80, 48).position(10, 10).build());
  figFile.addInstance(
    instanceNode(id(), level2ID, level1ID)
      .name("right")
      .size(80, 48)
      .position(90, 10)
      .overrideBackground(IOS_GREEN)
      .build(),
  );

  // Level 3: L2 + decoration
  const level3ID = id();
  figFile.addSymbol(
    symbolNode(level3ID, canvas3)
      .name("L3-Decorated")
      .size(220, 108)
      .position(500, -600)
      .background(WHITE)
      .cornerRadius(16)
      .clipsContent(true)
      .build(),
  );
  figFile.addInstance(instanceNode(id(), level3ID, level2ID).name("pair").size(180, 68).position(20, 10).build());
  // Decoration bar below the pair
  const l3Bar = id();
  figFile.addRoundedRectangle(
    roundedRectNode(l3Bar, level3ID).name("bar").size(180, 8).position(20, 86).fill(IOS_ORANGE).cornerRadius(4).build(),
  );

  // Level 4: L3 + badge indicator
  const level4ID = id();
  figFile.addSymbol(
    symbolNode(level4ID, canvas3)
      .name("L4-WithBadge")
      .size(260, 140)
      .position(800, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(20)
      .clipsContent(true)
      .build(),
  );
  figFile.addInstance(instanceNode(id(), level4ID, level3ID).name("decorated").size(220, 108).position(20, 16).build());
  // Badge instance at top-right
  figFile.addInstance(instanceNode(id(), level4ID, badgeID).name("badge").size(18, 18).position(234, 8).build());

  // Level 5: L4 + frame wrapper with shadow effect
  const level5ID = id();
  figFile.addSymbol(
    symbolNode(level5ID, canvas3)
      .name("L5-Complete")
      .size(300, 180)
      .position(1150, -600)
      .background(WHITE)
      .cornerRadius(24)
      .clipsContent(true)
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), level5ID, level4ID).name("with-badge").size(260, 140).position(20, 20).build(),
  );
  // Drop shadow rect behind (simulating card shadow)
  const l5Shadow = id();
  figFile.addRoundedRectangle(
    roundedRectNode(l5Shadow, level5ID)
      .name("shadow-indicator")
      .size(280, 160)
      .position(10, 14)
      .noFill()
      .stroke(IOS_GRAY_3)
      .strokeWeight(1)
      .cornerRadius(22)
      .build(),
  );

  // --- Symbol: CrossCanvas — uses L1 from canvas3 but references work across canvases
  // (tests that symbol resolution works with symbols defined on different canvases)
  const crossCanvasID = id();
  figFile.addSymbol(
    symbolNode(crossCanvasID, canvas3)
      .name("CrossCanvas")
      .size(160, 100)
      .position(1500, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  // Uses level1 from this canvas + buttonBase from canvas1
  figFile.addInstance(
    instanceNode(id(), crossCanvasID, level1ID).name("element").size(80, 48).position(10, 26).build(),
  );
  figFile.addInstance(
    instanceNode(id(), crossCanvasID, buttonBaseID).name("button").size(60, 32).position(92, 34).build(),
  );

  // --- Canvas 3: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 17. depth-2: L2-Pair — 2-level nesting
  const f_d2 = id();
  figFile.addFrame(
    frameNode(f_d2, canvas3)
      .name("depth-2")
      .size(200, 88)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_d2, level2ID).name("L2-Pair").size(180, 68).position(10, 10).build());

  frameX += 230;

  // 18. depth-3: L3-Decorated — 3-level nesting
  const f_d3 = id();
  figFile.addFrame(
    frameNode(f_d3, canvas3)
      .name("depth-3")
      .size(240, 128)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_d3, level3ID).name("L3-Decorated").size(220, 108).position(10, 10).build());

  frameX += 270;

  // 19. depth-4: L4-WithBadge — 4-level nesting
  const f_d4 = id();
  figFile.addFrame(
    frameNode(f_d4, canvas3)
      .name("depth-4")
      .size(280, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_d4, level4ID).name("L4-WithBadge").size(260, 140).position(10, 10).build());

  // Row 2
  frameX = 50;
  frameY += 190;

  // 20. depth-5: L5-Complete — full 5-level nesting chain
  const f_d5 = id();
  figFile.addFrame(
    frameNode(f_d5, canvas3)
      .name("depth-5")
      .size(320, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_d5, level5ID).name("L5-Complete").size(300, 180).position(10, 10).build());

  frameX += 350;

  // 21. depth-5-resized: L5-Complete at smaller size
  const f_d5_sm = id();
  figFile.addFrame(
    frameNode(f_d5_sm, canvas3)
      .name("depth-5-resized")
      .size(260, 160)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f_d5_sm, level5ID).name("L5-small").size(240, 140).position(10, 10).build());

  // Row 3
  frameX = 50;
  frameY += 230;

  // 22. cross-canvas-ref: CrossCanvas — symbol instances from different canvases
  const f_cross = id();
  figFile.addFrame(
    frameNode(f_cross, canvas3)
      .name("cross-canvas-ref")
      .size(180, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_cross, crossCanvasID).name("CrossCanvas").size(160, 100).position(10, 10).build(),
  );

  frameX += 210;

  // 23. depth-override: L4 with different override at depth
  const f_d_override = id();
  figFile.addFrame(
    frameNode(f_d_override, canvas3)
      .name("depth-override")
      .size(280, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_d_override, level4ID)
      .name("L4-overridden")
      .size(260, 140)
      .position(10, 10)
      .overrideBackground(IOS_PURPLE)
      .build(),
  );

  frameX += 310;

  // 24. multi-depth-mixed: Mix of different nesting depths in one frame
  const f_multi_depth = id();
  figFile.addFrame(
    frameNode(f_multi_depth, canvas3)
      .name("multi-depth-mixed")
      .size(380, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  // L1 directly
  figFile.addInstance(instanceNode(id(), f_multi_depth, level1ID).name("L1").size(80, 48).position(10, 76).build());
  // L2
  figFile.addInstance(instanceNode(id(), f_multi_depth, level2ID).name("L2").size(140, 52).position(100, 74).build());
  // L3
  figFile.addInstance(instanceNode(id(), f_multi_depth, level3ID).name("L3").size(120, 58).position(250, 71).build());
  // L4 (spanning bottom)
  figFile.addInstance(instanceNode(id(), f_multi_depth, level4ID).name("L4").size(360, 60).position(10, 136).build());

  // Row 4
  frameX = 50;
  frameY += 230;

  // 25. effect-inherit: EffectBox symbol with shadow effect
  const effectBoxID = id();
  figFile.addSymbol(
    symbolNode(effectBoxID, canvas3)
      .name("EffectBox")
      .size(120, 80)
      .position(1800, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const effectChild = id();
  figFile.addRoundedRectangle(
    roundedRectNode(effectChild, effectBoxID)
      .name("inner")
      .size(100, 60)
      .position(10, 10)
      .fill(IOS_BLUE)
      .cornerRadius(8)
      .effects([dropShadow().offset(0, 4).blur(8).color(CARD_SHADOW).build()])
      .build(),
  );

  const f_effect = id();
  figFile.addFrame(
    frameNode(f_effect, canvas3)
      .name("effect-inherit")
      .size(140, 100)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_effect, effectBoxID).name("EffectBox").size(120, 80).position(10, 10).build(),
  );

  frameX += 170;

  // 26. opacity-chain: Nested instances with different opacities
  const f_opacity = id();
  figFile.addFrame(
    frameNode(f_opacity, canvas3)
      .name("opacity-chain")
      .size(280, 100)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  // Full opacity L2
  figFile.addInstance(instanceNode(id(), f_opacity, level2ID).name("full").size(120, 56).position(10, 22).build());
  // Half opacity L2
  figFile.addInstance(
    instanceNode(id(), f_opacity, level2ID).name("half").size(120, 56).position(150, 22).opacity(0.5).build(),
  );

  // =========================================================================
  // Canvas 4: "Constraints" — Constraint resolution
  // =========================================================================
  const canvas4 = figFile.addCanvas(docID, "Constraints");

  // --- Symbol: ConstraintBox (200x120, white bg, contains a child rect) ---
  const constraintBoxID = id();
  figFile.addSymbol(
    symbolNode(constraintBoxID, canvas4)
      .name("ConstraintBox")
      .size(200, 120)
      .position(0, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  // Inner rect at pos=(20,20) size=(160,80) — different margins to test constraint behavior
  const cbInner = id();
  figFile.addRoundedRectangle(
    roundedRectNode(cbInner, constraintBoxID)
      .name("inner")
      .size(160, 80)
      .position(20, 20)
      .fill(IOS_BLUE)
      .cornerRadius(8)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: ConstraintMixed (200x120, multiple children with different constraints) ---
  const constraintMixedID = id();
  figFile.addSymbol(
    symbolNode(constraintMixedID, canvas4)
      .name("ConstraintMixed")
      .size(200, 120)
      .position(300, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  // Top-left anchored child (MIN/MIN)
  const cmTL = id();
  figFile.addRoundedRectangle(
    roundedRectNode(cmTL, constraintMixedID)
      .name("top-left")
      .size(40, 40)
      .position(10, 10)
      .fill(IOS_RED)
      .cornerRadius(6)
      .horizontalConstraint("MIN")
      .verticalConstraint("MIN")
      .build(),
  );
  // Top-right anchored child (MAX/MIN)
  const cmTR = id();
  figFile.addRoundedRectangle(
    roundedRectNode(cmTR, constraintMixedID)
      .name("top-right")
      .size(40, 40)
      .position(150, 10)
      .fill(IOS_GREEN)
      .cornerRadius(6)
      .horizontalConstraint("MAX")
      .verticalConstraint("MIN")
      .build(),
  );
  // Center child (CENTER/CENTER)
  const cmCenter = id();
  figFile.addEllipse(
    ellipseNode(cmCenter, constraintMixedID)
      .name("center")
      .size(30, 30)
      .position(85, 45)
      .fill(IOS_PURPLE)
      .horizontalConstraint("CENTER")
      .verticalConstraint("CENTER")
      .build(),
  );
  // Bottom stretch bar (STRETCH/MAX)
  const cmBottom = id();
  figFile.addRoundedRectangle(
    roundedRectNode(cmBottom, constraintMixedID)
      .name("bottom-bar")
      .size(180, 20)
      .position(10, 90)
      .fill(IOS_ORANGE)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("MAX")
      .build(),
  );

  // --- Symbol: ConstraintScale (200x120, child with SCALE constraints) ---
  const constraintScaleID = id();
  figFile.addSymbol(
    symbolNode(constraintScaleID, canvas4)
      .name("ConstraintScale")
      .size(200, 120)
      .position(600, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const csChild = id();
  figFile.addRoundedRectangle(
    roundedRectNode(csChild, constraintScaleID)
      .name("scaled")
      .size(100, 60)
      .position(50, 30)
      .fill(IOS_BLUE)
      .cornerRadius(8)
      .horizontalConstraint("SCALE")
      .verticalConstraint("SCALE")
      .build(),
  );

  // --- Canvas 4: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 27. constraint-stretch-full: STRETCH on both axes (inset:0 behavior)
  const f_stretch_full = id();
  figFile.addFrame(
    frameNode(f_stretch_full, canvas4)
      .name("constraint-stretch-full")
      .size(320, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_stretch_full, constraintBoxID)
      .name("ConstraintBox-stretched")
      .size(300, 180) // larger than symbol (200x120)
      .position(10, 10)
      .build(),
  );

  frameX += 350;

  // 28. constraint-no-resize: Same size as symbol (baseline — no constraint adjustment)
  const f_no_resize = id();
  figFile.addFrame(
    frameNode(f_no_resize, canvas4)
      .name("constraint-no-resize")
      .size(220, 140)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_no_resize, constraintBoxID)
      .name("ConstraintBox-same")
      .size(200, 120) // same as symbol
      .position(10, 10)
      .build(),
  );

  // Row 2
  frameX = 50;
  frameY += 230;

  // 29. constraint-mixed: Mixed constraints (MIN, MAX, CENTER, STRETCH) at larger size
  const f_mixed_constraint = id();
  figFile.addFrame(
    frameNode(f_mixed_constraint, canvas4)
      .name("constraint-mixed")
      .size(340, 200)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_mixed_constraint, constraintMixedID)
      .name("ConstraintMixed-large")
      .size(320, 180) // larger: delta H=+120, V=+60
      .position(10, 10)
      .build(),
  );

  frameX += 370;

  // 30. constraint-mixed-shrink: Same mixed constraints at smaller size
  const f_mixed_shrink = id();
  figFile.addFrame(
    frameNode(f_mixed_shrink, canvas4)
      .name("constraint-mixed-shrink")
      .size(180, 100)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_mixed_shrink, constraintMixedID)
      .name("ConstraintMixed-small")
      .size(160, 80) // smaller: delta H=-40, V=-40
      .position(10, 10)
      .build(),
  );

  // Row 3
  frameX = 50;
  frameY += 230;

  // 31. constraint-scale: SCALE constraint on both axes
  const f_scale = id();
  figFile.addFrame(
    frameNode(f_scale, canvas4)
      .name("constraint-scale")
      .size(320, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_scale, constraintScaleID)
      .name("ConstraintScale-large")
      .size(300, 180) // 1.5x width, 1.5x height
      .position(10, 10)
      .build(),
  );

  // =========================================================================
  // Canvas 5: "Variants" — Variant/overriddenSymbolID support
  // =========================================================================
  const canvas5 = figFile.addCanvas(docID, "Variants");

  // --- Symbol: ButtonDefault (variant A — blue background) ---
  const buttonDefaultID = id();
  figFile.addSymbol(
    symbolNode(buttonDefaultID, canvas5)
      .name("ButtonDefault")
      .size(120, 44)
      .position(0, -600)
      .background(IOS_BLUE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const bdLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(bdLabel, buttonDefaultID)
      .name("label")
      .size(80, 24)
      .position(20, 10)
      .fill(WHITE)
      .opacity(0.2)
      .cornerRadius(4)
      .build(),
  );

  // --- Symbol: ButtonActive (variant B — green background) ---
  const buttonActiveID = id();
  figFile.addSymbol(
    symbolNode(buttonActiveID, canvas5)
      .name("ButtonActive")
      .size(120, 44)
      .position(200, -600)
      .background(IOS_GREEN)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const baLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(baLabel, buttonActiveID)
      .name("label")
      .size(80, 24)
      .position(20, 10)
      .fill(WHITE)
      .opacity(0.3)
      .cornerRadius(4)
      .build(),
  );

  // --- Symbol: ButtonDisabled (variant C — gray background) ---
  const buttonDisabledID = id();
  figFile.addSymbol(
    symbolNode(buttonDisabledID, canvas5)
      .name("ButtonDisabled")
      .size(120, 44)
      .position(400, -600)
      .background(IOS_GRAY_3)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const bdsLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(bdsLabel, buttonDisabledID)
      .name("label")
      .size(80, 24)
      .position(20, 10)
      .fill(WHITE)
      .opacity(0.1)
      .cornerRadius(4)
      .build(),
  );

  // --- Canvas 5: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 32. variant-default: Instance referencing ButtonDefault directly (no override)
  const f_var_default = id();
  figFile.addFrame(
    frameNode(f_var_default, canvas5)
      .name("variant-default")
      .size(140, 64)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_var_default, buttonDefaultID).name("ButtonDefault").size(120, 44).position(10, 10).build(),
  );

  frameX += 170;

  // 33. variant-override: Instance with overriddenSymbolID pointing to ButtonActive
  const f_var_override = id();
  figFile.addFrame(
    frameNode(f_var_override, canvas5)
      .name("variant-override")
      .size(140, 64)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_var_override, buttonDefaultID)
      .name("ButtonActive-via-override")
      .size(120, 44)
      .position(10, 10)
      .overrideSymbol(buttonActiveID)
      .build(),
  );

  frameX += 170;

  // 34. variant-all-states: All 3 variants side by side
  const f_var_all = id();
  figFile.addFrame(
    frameNode(f_var_all, canvas5)
      .name("variant-all-states")
      .size(420, 64)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  // Default (blue)
  figFile.addInstance(
    instanceNode(id(), f_var_all, buttonDefaultID).name("default").size(120, 44).position(10, 10).build(),
  );
  // Active (green via override)
  figFile.addInstance(
    instanceNode(id(), f_var_all, buttonDefaultID)
      .name("active")
      .size(120, 44)
      .position(150, 10)
      .overrideSymbol(buttonActiveID)
      .build(),
  );
  // Disabled (gray via override)
  figFile.addInstance(
    instanceNode(id(), f_var_all, buttonDefaultID)
      .name("disabled")
      .size(120, 44)
      .position(290, 10)
      .overrideSymbol(buttonDisabledID)
      .build(),
  );

  // =========================================================================
  // Build and Write
  // =========================================================================

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const subdir of ["actual", "snapshots"]) {
    const dir = path.join(OUTPUT_DIR, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const figData = await figFile.buildAsync({ fileName: "symbol-resolution" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`\n=== Structure ===`);
  console.log(`5 canvases, ${nextID - 100} nodes total\n`);

  console.log(`Canvas 1: "Components" — UI component patterns`);
  console.log(`  Test frames (8): button-inherit, button-override, card-with-header,`);
  console.log(`    card-resized, icon-badge-nesting, navbar-full, navbar-resized, multi-button-sizes`);

  console.log(`\nCanvas 2: "Clipping" — Frame-level rounding & clip behavior`);
  console.log(`  Test frames (8): avatar-clip, avatar-small, rounded-container-clip,`);
  console.log(`    mixed-clip-corners, nested-rounded-clip, clip-chain-3level, clip-chain-resized, avatar-row`);

  console.log(`\nCanvas 3: "Deep Nesting" — 5-level nesting & inheritance`);
  console.log(`  Test frames (10): depth-2, depth-3, depth-4, depth-5, depth-5-resized,`);
  console.log(`    cross-canvas-ref, depth-override, multi-depth-mixed, effect-inherit, opacity-chain`);

  console.log(`\nCanvas 4: "Constraints" — Constraint resolution`);
  console.log(`  Symbols: ConstraintBox (STRETCH), ConstraintMixed (MIN/MAX/CENTER/STRETCH), ConstraintScale (SCALE)`);
  console.log(`  Test frames (5):`);
  console.log(`    27. constraint-stretch-full — STRETCH both axes (inset:0)`);
  console.log(`    28. constraint-no-resize — same size baseline`);
  console.log(`    29. constraint-mixed — MIN/MAX/CENTER/STRETCH at larger size`);
  console.log(`    30. constraint-mixed-shrink — mixed constraints at smaller size`);
  console.log(`    31. constraint-scale — SCALE on both axes`);

  console.log(`\nCanvas 5: "Variants" — Variant/overriddenSymbolID`);
  console.log(`  Symbols: ButtonDefault (blue), ButtonActive (green), ButtonDisabled (gray)`);
  console.log(`  Test frames (3):`);
  console.log(`    32. variant-default — direct symbolID reference`);
  console.log(`    33. variant-override — overriddenSymbolID to ButtonActive`);
  console.log(`    34. variant-all-states — all 3 variants side by side`);
}

generate().catch(console.error);
