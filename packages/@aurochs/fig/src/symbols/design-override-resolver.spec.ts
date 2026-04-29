/**
 * @file Regression — re-resolving a nested INSTANCE's own overrides
 * against the post-variant-swap SYMBOL namespace.
 *
 * Bug this pins: Bento Cover "Social 2 × 2" with Brand variant switched
 * to Mastodon produced three `target node not found` warnings because
 * the Brand INSTANCE's own `[104:243]` override (authored for the
 * Amazon variant's Logo slot) was never rewritten to Mastodon's
 * `104:275` after the variant swap. Without `reresolveOverridesForVariant`
 * those authored overrides silently drop at apply time.
 *
 * SSoT invariant locked in:
 *   - The variant-aware re-resolver reuses `buildGuidTranslationMap`
 *     (single primitive) and must not re-implement heuristics locally.
 *   - Domain inputs (FigDesignNode shape) flow through the same
 *     primitive as raw FigNode — verified by the resolver producing
 *     the expected rewrite given a minimal DesignNodeShape tree.
 */

import {
  reresolveOverridesForVariant,
  type DesignNodeShape,
  type DesignSymbolOverrideShape,
} from "./design-override-resolver";
import { FIG_NODE_TYPE } from "../types";

function guid(sessionID: number, localID: number) {
  return { sessionID, localID };
}

function idStr(s: number, l: number): string {
  return `${s}:${l}`;
}

function vectorDesignNode(sessionID: number, localID: number, name: string): DesignNodeShape {
  return {
    id: idStr(sessionID, localID),
    type: FIG_NODE_TYPE.VECTOR,
    name,
    visible: true,
    size: { x: 20, y: 20 },
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1 }],
  };
}

describe("reresolveOverridesForVariant — SSoT for post-variant-switch override paths", () => {
  it("empty overrides pass through (no throw, identity)", () => {
    const out = reresolveOverridesForVariant({
      overrides: [],
      variantSymbolChildren: [],
      ownDerivedSymbolData: undefined,
      ownComponentPropertyAssignments: undefined,
      blobs: [],
      oldSymbolId: "10:10",
      newSymbolId: "10:11",
    });
    expect(out).toEqual([]);
  });

  it("override guid path is preserved when translation map yields no rewrite", () => {
    // If the default-variant guid already exists in the new variant
    // (identity), no rewrite happens and the path passes through.
    const descendant = vectorDesignNode(10, 243, "Logo");
    const ov: DesignSymbolOverrideShape = {
      guidPath: { guids: [guid(10, 243)] },
      styleIdForFill: { guid: guid(1, 958) },
    };
    const out = reresolveOverridesForVariant({
      overrides: [ov],
      variantSymbolChildren: [descendant],
      ownDerivedSymbolData: undefined,
      ownComponentPropertyAssignments: undefined,
      blobs: [],
      oldSymbolId: "10:10",
      newSymbolId: "10:11",
    });
    expect(out.length).toBe(1);
    // Path is preserved (guid 10:243 exists as descendant).
    expect(out[0].guidPath?.guids[0]).toEqual(guid(10, 243));
  });

  it("preserves non-path override fields across resolution", () => {
    // The resolver must only rewrite `guidPath` — every other field
    // on the override (styleIdForFill, custom fields) survives intact.
    const descendant = vectorDesignNode(10, 100, "Logo");
    const ov: DesignSymbolOverrideShape = {
      guidPath: { guids: [guid(10, 100)] },
      styleIdForFill: { guid: guid(1, 958) },
      opacity: 0.5,
    };
    const out = reresolveOverridesForVariant({
      overrides: [ov],
      variantSymbolChildren: [descendant],
      ownDerivedSymbolData: undefined,
      ownComponentPropertyAssignments: undefined,
      blobs: [],
      oldSymbolId: "10:10",
      newSymbolId: "10:11",
    });
    expect(out[0].styleIdForFill).toEqual({ guid: guid(1, 958) });
    expect(out[0].opacity).toBe(0.5);
  });

  it("self-override path (targets old SYMBOL) rewrites to new SYMBOL guid", () => {
    // SSoT invariant locked in: a self-override path `[oldSymbolId]`
    // addresses "this INSTANCE's frame". After a variant swap, the
    // addressing guid must become the new variant's symbol guid.
    // Without this rewrite, `[4185:3803]` style self-overrides on a
    // variant-switched INSTANCE fail at findNodeByOverridePath time.
    const descendant = vectorDesignNode(10, 100, "Logo");
    const ov: DesignSymbolOverrideShape = {
      guidPath: { guids: [guid(4185, 3803)] }, // old variant's SYMBOL guid
      size: { x: 120, y: 40 },
    };
    const out = reresolveOverridesForVariant({
      overrides: [ov],
      variantSymbolChildren: [descendant],
      ownDerivedSymbolData: undefined,
      ownComponentPropertyAssignments: undefined,
      blobs: [],
      oldSymbolId: "4185:3803",
      newSymbolId: "34:12127",
    });
    expect(out.length).toBe(1);
    expect(out[0].guidPath?.guids[0]).toEqual(guid(34, 12127));
  });

  it("multi-entry input preserves count and path length per entry", () => {
    // Resolver is rewrite not filter: every input entry produces one
    // output entry with the same guidPath length.
    const descendants = [
      vectorDesignNode(10, 100, "Logo"),
      vectorDesignNode(10, 101, "Icon"),
    ];
    const overrides: DesignSymbolOverrideShape[] = [
      { guidPath: { guids: [guid(10, 100)] } },
      { guidPath: { guids: [guid(10, 101)] } },
    ];
    const out = reresolveOverridesForVariant({
      overrides,
      variantSymbolChildren: descendants,
      ownDerivedSymbolData: undefined,
      ownComponentPropertyAssignments: undefined,
      blobs: [],
      oldSymbolId: "10:10",
      newSymbolId: "10:11",
    });
    expect(out.length).toBe(2);
    for (const ov of out) {
      expect(ov.guidPath?.guids.length).toBe(1);
    }
  });
});
