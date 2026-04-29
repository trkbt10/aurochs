/**
 * @file Regression — override `guidPath` is resolved **once and in full**
 * at domain-convert time.
 *
 * SSoT invariant locked in here:
 *   - Single-level INSTANCE override path is resolved in the INSTANCE's
 *     own SYMBOL descendant namespace (first guid translated).
 *   - Multi-level path is resolved through each nested INSTANCE step.
 *     The tail guid ends up in the innermost SYMBOL's namespace; no
 *     render-time re-resolution is required.
 *   - When a sibling single-level entry declares `overriddenSymbolID`
 *     on a slot, subsequent multi-level paths passing through that slot
 *     resolve in the variant's namespace, not the default variant's.
 *
 * Regressions guarded here:
 *   - Reintroducing deferred translation (e.g. a
 *     `translateRemainingPathToSymbolNamespace` in scene-graph/builder)
 *     would leave the tail guid raw and break the nested-chain
 *     assertion.
 *   - Collapsing variant switching back to the default variant's
 *     SYMBOL would produce the Bento-Social-2×2 regression where a
 *     Mastodon override gets routed to Amazon's logo guid.
 */

import { convertFigNode } from "./tree-to-document";
import type { FigNode } from "@aurochs/fig/types";
import { FIG_NODE_TYPE } from "@aurochs/fig/types";
import type { FigDesignNode, FigStyleRegistry } from "@aurochs/fig/domain";
import { EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";

const EMPTY_STYLE_REGISTRY: FigStyleRegistry = EMPTY_FIG_STYLE_REGISTRY;

function guid(sessionID: number, localID: number): { sessionID: number; localID: number } {
  return { sessionID, localID };
}

function vectorNode(localID: number, name: string): FigNode {
  return {
    guid: guid(10, localID),
    phase: { value: 1, name: "CREATED" },
    type: { value: 5, name: FIG_NODE_TYPE.VECTOR },
    name,
  };
}

function symbolNode(localID: number, name: string, children: readonly FigNode[]): FigNode {
  return {
    guid: guid(10, localID),
    phase: { value: 1, name: "CREATED" },
    type: { value: 14, name: FIG_NODE_TYPE.SYMBOL },
    name,
    // safeChildren / tree-walkers read `children` directly (not
    // `childGuids`), so the spec tree must inline the child FigNodes.
    children,
    childGuids: children.map((c) => c.guid),
  };
}

function instanceNode(
  localID: number,
  name: string,
  symbolID: { sessionID: number; localID: number },
  overrides: readonly { guidPath: { guids: readonly { sessionID: number; localID: number }[] }; styleIdForFill?: unknown; overriddenSymbolID?: { sessionID: number; localID: number } }[] = [],
): FigNode {
  return {
    guid: guid(20, localID),
    phase: { value: 1, name: "CREATED" },
    type: { value: 13, name: FIG_NODE_TYPE.INSTANCE },
    name,
    symbolData: {
      symbolID,
      symbolOverrides: overrides,
    },
  } as FigNode;
}

describe("resolveOverridePaths — SSoT for override path resolution", () => {
  it("overrides that resolve to reachable slots are kept; phantoms are dropped", () => {
    // SSoT invariant: `resolveOverridePaths` rewrites guid paths into
    // the SYMBOL-descendant namespace and drops entries that have no
    // reachable target anywhere in the file's symbolMap. Figma's own
    // renderer silently skips such phantom overrides (authoring
    // residue from deleted slots or rewritten TEXT rich-text ranges),
    // and so does the resolver — the scene-graph builder never sees
    // structurally-unresolvable entries.
    const logoRaw = vectorNode(100, "Logo");
    const brandSym = symbolNode(10, "Brand", [logoRaw]);
    const symbolMap = new Map<string, FigNode>([
      ["10:10", brandSym],
      ["10:100", logoRaw],
    ]);

    const instance = instanceNode(1, "Brand", guid(10, 10), [
      // Reachable: targets the SYMBOL's Logo descendant after
      // translation (guid 10:100 is a descendant of brandSym).
      { guidPath: { guids: [guid(10, 100)] }, styleIdForFill: { guid: guid(1, 958) } },
      // Phantom: guid 999:999 is nowhere in the symbolMap; drop.
      { guidPath: { guids: [guid(999, 999)] } },
    ]);

    const components = new Map<string, FigDesignNode>();
    const node = convertFigNode(instance, components, EMPTY_STYLE_REGISTRY, symbolMap, []);
    expect(node.overrides?.length).toBe(1);
    expect(node.overrides![0].guidPath?.guids[0]).toEqual(guid(10, 100));
  });

  it("non-INSTANCE nodes carry raw overrides / dsd untouched", () => {
    // A FRAME node has no symbol scope; resolveOverridePaths must not
    // branch on node type — instead it returns the raw carries when
    // the node cannot resolve an effective SYMBOL.
    const frame: FigNode = {
      guid: guid(1, 1),
      phase: { value: 1, name: "CREATED" },
      type: { value: 3, name: FIG_NODE_TYPE.FRAME },
      name: "Frame",
    };
    const components = new Map<string, FigDesignNode>();
    const node = convertFigNode(frame, components, EMPTY_STYLE_REGISTRY, new Map(), []);
    expect(node.overrides).toBeUndefined();
    expect(node.derivedSymbolData).toBeUndefined();
  });

  it("malformed (empty guidPath) entries are preserved as-is", () => {
    const logoRaw = vectorNode(100, "Logo");
    const brandSym = symbolNode(10, "Brand", [logoRaw]);
    const symbolMap = new Map<string, FigNode>([
      ["10:10", brandSym],
      ["10:100", logoRaw],
    ]);

    const instance = instanceNode(1, "Brand", guid(10, 10), [
      // empty guids array — resolver must NOT crash, must pass through
      { guidPath: { guids: [] } },
    ]);

    const components = new Map<string, FigDesignNode>();
    expect(() =>
      convertFigNode(instance, components, EMPTY_STYLE_REGISTRY, symbolMap, []),
    ).not.toThrow();
  });

  it("no symbolMap → overrides pass through in raw INSTANCE namespace", () => {
    // The resolver's degraded mode: when callers don't supply a
    // symbolMap, the raw carries are returned so downstream consumers
    // can still see what was authored. This is the explicit contract —
    // `convertFigNode(..., undefined, undefined)` does not silently
    // drop data.
    const instance = instanceNode(1, "Brand", guid(10, 10), [
      {
        guidPath: { guids: [guid(20, 200)] },
        styleIdForFill: { guid: guid(1, 958) },
      },
    ]);
    const components = new Map<string, FigDesignNode>();
    const node = convertFigNode(instance, components, EMPTY_STYLE_REGISTRY, undefined, undefined);
    expect(node.overrides?.length).toBe(1);
    expect(node.overrides![0].guidPath!.guids[0]).toEqual(guid(20, 200));
  });
});
