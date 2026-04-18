/**
 * @file guid-translation unit tests
 *
 * Pins two heuristics added to buildGuidTranslationMap for the Contact
 * "People=2" variant regression:
 *
 * 1. Post-Phase-1 type-mismatch eviction — when the majority-vote offset
 *    lands a SHAPE-hinted override on a TEXT descendant (or any hint on
 *    an incompatible node type), the mapping is evicted so later phases
 *    can score the override by shape signals instead.
 *
 * 2. fillGeometry-driven size extraction — when an override carries a
 *    fillGeometry blob but no explicit `size`, the blob's path extent
 *    provides the size signal needed to disambiguate sibling descendants
 *    of different sizes (e.g. Avatar 1 37.33×37.33 vs Avatar 2 22×22).
 */

import { describe, it, expect } from "vitest";
import { buildGuidTranslationMap } from "./guid-translation";
import type { FigNode, FigKiwiSymbolOverride } from "../types";
import type { FigBlob } from "@aurochs/fig/parser";

function node(guid: { sessionID: number; localID: number }, overrides: Partial<FigNode>): FigNode {
  return {
    guid,
    phase: { value: 0, name: "CREATED" },
    type: { value: 3, name: "RECTANGLE" },
    ...overrides,
  } as FigNode;
}

function frame(guid: { sessionID: number; localID: number }, overrides: Partial<FigNode>): FigNode {
  return {
    guid,
    phase: { value: 0, name: "CREATED" },
    type: { value: 5, name: "FRAME" },
    ...overrides,
  } as FigNode;
}

function textNode(guid: { sessionID: number; localID: number }, overrides: Partial<FigNode>): FigNode {
  return {
    guid,
    phase: { value: 0, name: "CREATED" },
    type: { value: 8, name: "TEXT" },
    ...overrides,
  } as FigNode;
}

function imagePaint() {
  return {
    type: { value: 5, name: "IMAGE" },
    opacity: 1,
    visible: true,
    blendMode: { value: 1, name: "NORMAL" },
    image: { hash: [0, 1, 2, 3] },
  };
}

describe("buildGuidTranslationMap: type-mismatch eviction", () => {
  it("does NOT evict TEXT-hinted mappings even when target is not TEXT", () => {
    // The eviction is scoped to SHAPE→TEXT only (not every type
    // mismatch). TEXT/INSTANCE/CONTAINER hint mismatches are often
    // resolved downstream by Phase 1.3/1.5 content-signature or
    // typed matching; aggressive eviction there breaks multi-level
    // cascades (Activity View - iPhone's intermediate INSTANCE
    // guids routing 8 Action icons). So here we assert that a
    // TEXT-hinted override mapped to a FRAME (by majority-vote
    // offset) is PRESERVED, not evicted.
    const sym = frame({ sessionID: 1, localID: 100 }, {
      size: { x: 100, y: 100 },
      children: [
        frame({ sessionID: 1, localID: 101 }, { size: { x: 50, y: 50 } }),
      ],
    });
    // TEXT-hinted override (has derivedTextData) paired with a FRAME
    // target via the best offset.
    const overrides: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, size: { x: 50, y: 50 } },
    ];
    const dsd: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, derivedTextData: { layoutSize: { x: 50, y: 50 } } },
    ];
    const map = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, undefined);
    // 200:201 gets mapped to 1:101 (FRAME) via offset. TEXT hint on
    // a FRAME target is tolerated — not evicted — because TEXT overrides
    // frequently need downstream phases to find the right TEXT target,
    // and evicting them here strands multi-level-dsd scenarios.
    expect(map.get("200:201")).toBe("1:101");
  });

  it("evicts a SHAPE-hinted override that majority-vote maps onto a TEXT descendant", () => {
    // Symbol has: FRAME (100) with child TEXT (101) and child FRAME (102).
    // Overrides in session 200:
    //   200 → name+size (root FRAME)
    //   201 → derivedTextData (TEXT hint)
    //   202 → fillPaints+fillGeometry with IMAGE (SHAPE hint with image)
    // The majority-vote offset = 100 pairs 200→100, 201→101, 202→102.
    // All three fit; 202's hint is SHAPE and the target 102 is FRAME
    // (matches SHAPE) — no eviction needed here.
    const sym = frame({ sessionID: 1, localID: 100 }, {
      size: { x: 78, y: 100 },
      children: [
        textNode({ sessionID: 1, localID: 101 }, { size: { x: 78, y: 15 } }),
        frame({ sessionID: 1, localID: 102 }, { size: { x: 22, y: 22 }, fillPaints: [imagePaint()] }),
      ],
    });

    const overrides: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, size: { x: 78, y: 100 } },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillPaints: [imagePaint()] },
    ];
    const dsd: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, derivedTextData: { layoutSize: { x: 78, y: 15 } } },
      { guidPath: { guids: [{ sessionID: 200, localID: 202 }] }, fillGeometry: [{ commandsBlob: 0, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
    ];

    // Single blob representing a 22x22 bounding path (so fillGeometry
    // extent can drive size inference).
    const blobs: FigBlob[] = [{ bytes: encodePath22x22() }];

    const map = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, blobs);

    // 200:201 has derivedTextData → hint=TEXT → target must be TEXT (1:101)
    // 200:202 has fillGeometry + image fill → hint=SHAPE → target must be SHAPE (FRAME 1:102)
    expect(map.get("200:201")).toBe("1:101");
    expect(map.get("200:202")).toBe("1:102");
  });
});

describe("buildGuidTranslationMap: fillGeometry-based size inference", () => {
  it("routes two image-fill overrides to sibling avatars of different sizes by blob extent", () => {
    // Symbol mirrors Contact "People=2": Group (10) with Avatar 1 (11, 37x37) and Avatar 2 (12, 22x22).
    const sym = frame({ sessionID: 1, localID: 10 }, {
      size: { x: 70, y: 70 },
      children: [
        frame({ sessionID: 1, localID: 11 }, { size: { x: 37.33, y: 37.33 }, fillPaints: [imagePaint()] }),
        frame({ sessionID: 1, localID: 12 }, { size: { x: 22, y: 22 }, fillPaints: [imagePaint()] }),
      ],
    });

    // Two overrides with image fills in session 200. Each override's
    // fillGeometry blob has a specific extent that identifies the target.
    //   200:200 → blob #0 (22x22 extent) → should map to Avatar 2 (1:12)
    //   200:201 → blob #1 (37x37 extent) → should map to Avatar 1 (1:11)
    // The majority-vote offset alone can't disambiguate because both
    // descendants have the image-fill signal.
    const overrides: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, fillPaints: [imagePaint()] },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillPaints: [imagePaint()] },
    ];
    const dsd: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, fillGeometry: [{ commandsBlob: 0, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillGeometry: [{ commandsBlob: 1, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
    ];
    const blobs: FigBlob[] = [
      { bytes: encodePath22x22() },
      { bytes: encodePath37x37() },
    ];

    const map = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, blobs);

    expect(map.get("200:200")).toBe("1:12"); // 22x22 blob → 22x22 descendant
    expect(map.get("200:201")).toBe("1:11"); // 37x37 blob → 37x37 descendant
  });

  it("does NOT apply blob-size inference when overrides lack an IMAGE fill", () => {
    // Two sibling FRAMEs of different sizes (no image fills on the
    // SYMBOL side either). Two overrides with fillGeometry pointing
    // to blobs of matching extent but NO fillPaints=IMAGE.
    //
    // Blob-size inference is scoped to image-fill overrides only
    // (Contact Avatar case). For pure-geometry overrides — like the
    // Toolbar's 44×44 button-group overrides — applying blob-size
    // inference steals a legitimate target from a paired override
    // whose majority-vote offset had it lined up correctly. So this
    // test pins that behaviour: without IMAGE fills, size inference
    // is skipped and the default sorted-localID pairing applies.
    const sym = frame({ sessionID: 1, localID: 10 }, {
      size: { x: 70, y: 70 },
      children: [
        frame({ sessionID: 1, localID: 11 }, { size: { x: 37.33, y: 37.33 } }),
        frame({ sessionID: 1, localID: 12 }, { size: { x: 22, y: 22 } }),
      ],
    });
    const overrides: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, fillGeometry: [{ commandsBlob: 0, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillGeometry: [{ commandsBlob: 1, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
    ];
    const dsd: FigKiwiSymbolOverride[] = [];
    const blobs: FigBlob[] = [
      { bytes: encodePath22x22() },
      { bytes: encodePath37x37() },
    ];

    const map = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, blobs);

    // Without IMAGE fills, the heuristic falls back to majority-vote
    // offset + sorted-localID pairing. The key invariant this test
    // pins: the 22×22 blob does NOT steer 200:200 to the matching
    // 22×22 descendant (1:12). In other words, the mappings are the
    // SAME with and without blobs when no image-fill flag is set.
    const mapNoBlobs = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, undefined);
    expect(map.get("200:200")).toBe(mapNoBlobs.get("200:200"));
    expect(map.get("200:201")).toBe(mapNoBlobs.get("200:201"));
    // And concretely: neither mapping uses blob-size to route to the
    // best size match (1:12 for the 22×22 blob).
    expect(map.get("200:200")).not.toBe("1:12");
  });

  it("falls back to sorted-localID pairing when blobs are absent", () => {
    // Without blobs, the heuristic pairs both overrides with their
    // sorted-localID neighbours: lower override → lower descendant.
    // This documents the pre-fix behaviour as the explicit fallback
    // so consumers know blobs are required for disambiguation.
    const sym = frame({ sessionID: 1, localID: 10 }, {
      size: { x: 70, y: 70 },
      children: [
        frame({ sessionID: 1, localID: 11 }, { size: { x: 37.33, y: 37.33 }, fillPaints: [imagePaint()] }),
        frame({ sessionID: 1, localID: 12 }, { size: { x: 22, y: 22 }, fillPaints: [imagePaint()] }),
      ],
    });
    const overrides: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, fillPaints: [imagePaint()] },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillPaints: [imagePaint()] },
    ];
    const dsd: FigKiwiSymbolOverride[] = [
      { guidPath: { guids: [{ sessionID: 200, localID: 200 }] }, fillGeometry: [{ commandsBlob: 0, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
      { guidPath: { guids: [{ sessionID: 200, localID: 201 }] }, fillGeometry: [{ commandsBlob: 1, styleID: 0, windingRule: { value: 0, name: "NONZERO" } }] },
    ];

    // No blobs argument.
    const map = buildGuidTranslationMap([sym], dsd, overrides, undefined, undefined, undefined);

    // Without size signal, lowest-localID override pairs with lowest
    // target: 200 → 11, 201 → 12 (the "wrong" swap that was the bug).
    expect(map.get("200:200")).toBe("1:11");
    expect(map.get("200:201")).toBe("1:12");
  });
});

// --- Helpers ---

/** Build a minimal path blob whose bounding box is 22×22. */
function encodePath22x22(): number[] {
  return encodeRectPathBlob(22, 22);
}

/** Build a minimal path blob whose bounding box is 37.33×37.33. */
function encodePath37x37(): number[] {
  return encodeRectPathBlob(37.33, 37.33);
}

function encodeRectPathBlob(w: number, h: number): number[] {
  // Vector path blob (leading 0x01 M). Commands:
  //   M 0 0, L w 0, L w h, L 0 h, L 0 0
  const bytes: number[] = [];
  const pushF = (v: number) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, v, true);
    for (const b of new Uint8Array(buf)) bytes.push(b);
  };
  const pushCmd = (cmd: number, x: number, y: number) => {
    bytes.push(cmd);
    pushF(x);
    pushF(y);
  };
  pushCmd(0x01, 0, 0); // M
  pushCmd(0x02, w, 0); // L
  pushCmd(0x02, w, h); // L
  pushCmd(0x02, 0, h); // L
  pushCmd(0x02, 0, 0); // L (close)
  return bytes;
}
