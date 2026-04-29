/**
 * @file FigDesignNode-level override path resolver.
 *
 * SSoT for re-resolving override guid paths after a COMPONENT_SET
 * variant switch on a nested INSTANCE. The authored overrides on the
 * nested INSTANCE target the **default variant's** slot guids; once
 * the variant has been swapped (e.g. Brand=Amazon → Brand=Mastodon),
 * those guids need to land in the new variant's namespace.
 *
 * This is the domain-tree-aware companion to `resolveOverridePaths`
 * in `@aurochs-builder/fig/context`. Both share the same primitive:
 * `buildGuidTranslationMap` in this package — the single SoT for
 * "map override guid strings to SYMBOL descendant guid strings".
 *
 * Scope: this function is invoked ONLY by the scene-graph builder
 * during variant-swap pass 1. The lint rule
 * `no-guid-translation-outside-resolver` keeps the low-level primitive
 * (`buildGuidTranslationMap` etc.) out of the scene-graph — the
 * builder consumes only the high-level `reresolveOverridesForVariant`
 * export from here.
 */

import type { FigKiwiSymbolOverride, FigComponentPropAssignment, FigPaint, FigVector, FigNodeType } from "../types";
import type { FigBlob } from "../parser";
import { buildGuidTranslationMap, type GuidTranslationMap } from "./guid-translation";

/**
 * Structural subset of `FigDesignNode` (defined in `@aurochs/fig/domain`)
 * used by the variant re-resolver. `@aurochs/fig/symbols` does not
 * import from `@aurochs/fig/domain` to keep the dependency direction
 * domain → symbols acyclic; the fields listed here are the minimum
 * `buildGuidTranslationMap` consults, and a `FigDesignNode` is
 * structurally assignable to this shape.
 */
export type DesignNodeShape = {
  readonly id: string;
  readonly type: FigNodeType;
  readonly name: string;
  readonly visible: boolean;
  readonly size: FigVector;
  readonly fills?: readonly FigPaint[];
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];
  readonly textData?: { readonly characters: string };
  readonly componentPropertyRefs?: readonly {
    readonly nodeField: string;
    readonly defId: string;
  }[];
  readonly children?: readonly DesignNodeShape[];
};

export type DesignSymbolOverrideShape = {
  readonly guidPath?: { readonly guids: readonly { readonly sessionID: number; readonly localID: number }[] };
  readonly overriddenSymbolID?: { readonly sessionID: number; readonly localID: number };
} & { readonly [k: string]: unknown };

export type DesignComponentPropertyAssignmentShape = {
  readonly defId: string;
  readonly value: {
    readonly textValue?: { readonly characters: string };
    readonly boolValue?: boolean;
    readonly referenceValue?: string;
  };
};

/**
 * Re-resolve override guid paths of a nested INSTANCE after a variant
 * switch. The authored paths target the default variant's slots; this
 * rewrites each guid into the new variant's namespace by running the
 * shared translation primitive against the variant SYMBOL's descendants.
 *
 * Single-level and multi-level paths are handled uniformly: each guid
 * is looked up in the translation map of its containing SYMBOL and
 * replaced when a mapping exists. Guids that resolve without a mapping
 * (already in-namespace) are passed through.
 */
export function reresolveOverridesForVariant(args: {
  overrides: readonly DesignSymbolOverrideShape[];
  variantSymbolChildren: readonly DesignNodeShape[];
  ownDerivedSymbolData: readonly DesignSymbolOverrideShape[] | undefined;
  ownComponentPropertyAssignments: readonly DesignComponentPropertyAssignmentShape[] | undefined;
  blobs: readonly FigBlob[];
  /**
   * Old/new symbolId of the variant-switched INSTANCE. Self-overrides
   * (guidPath targets the SYMBOL itself) carry the **old** variant's
   * symbolId in their path guid; after the switch that guid no longer
   * exists among the new variant's descendants, so the translation map
   * alone cannot resolve them. Supplying oldSymbolId + newSymbolId
   * lets the resolver rewrite those paths directly into a self-override
   * against the new variant.
   */
  oldSymbolId: string;
  newSymbolId: string;
}): readonly DesignSymbolOverrideShape[] {
  const { overrides, variantSymbolChildren, ownDerivedSymbolData, ownComponentPropertyAssignments, blobs, oldSymbolId, newSymbolId } = args;
  if (overrides.length === 0) { return overrides; }

  // The translation primitive takes raw FigNode descendants. The adapter
  // below builds the minimum structural shape it reads — the primitive
  // inspects guid / type.name / size / fillPaints[*].type / cornerRadius /
  // rectangleCornerRadii / textData.characters / componentPropRefs /
  // childGuids. Every field we produce maps directly from FigDesignNode.
  const descendantsAsRaw = variantSymbolChildren.map((n) => designNodeToRawShape(n));
  const rawOverrides = overrides.map((o) => toRawOverride(o));
  const rawDsd = ownDerivedSymbolData?.map((o) => toRawOverride(o));
  const cpa = ownComponentPropertyAssignments
    ? ownComponentPropertyAssignments.map((a) => designCPAToRawShape(a))
    : undefined;

  const map: GuidTranslationMap = buildGuidTranslationMap(
    descendantsAsRaw,
    rawDsd,
    rawOverrides,
    cpa,
    undefined,
    blobs,
  );

  return overrides.map((ov) => applyMapToPath(ov, map, oldSymbolId, newSymbolId));
}

function applyMapToPath(
  override: DesignSymbolOverrideShape,
  map: GuidTranslationMap,
  oldSymbolId: string,
  newSymbolId: string,
): DesignSymbolOverrideShape {
  const guids = override.guidPath?.guids;
  if (!guids || guids.length === 0) { return override; }
  const [newSession, newLocal] = newSymbolId.split(":");
  const newSymbolGuid = { sessionID: Number(newSession), localID: Number(newLocal) };
  const rewritten = guids.map((g) => {
    const key = `${g.sessionID}:${g.localID}`;
    // Self-override on the old variant's SYMBOL guid → rewrite to the
    // new variant's SYMBOL guid. Self-override semantics point at the
    // symbol frame itself, so the meaning survives variant switching —
    // only the addressing guid changes. Without this rewrite, the
    // authored self-override silently fails when a variant swap moves
    // the INSTANCE to a different SYMBOL.
    if (key === oldSymbolId) { return newSymbolGuid; }
    const mapped = map.get(key);
    if (!mapped) { return g; }
    const [sessionStr, localStr] = mapped.split(":");
    return { sessionID: Number(sessionStr), localID: Number(localStr) };
  });
  return { ...override, guidPath: { guids: rewritten } };
}

function toRawOverride(o: DesignSymbolOverrideShape): FigKiwiSymbolOverride {
  // Structural re-shape: Kiwi's FigKiwiSymbolOverride is also
  // `{ guidPath, ...payload }` with optional fields, so a domain
  // `DesignSymbolOverrideShape` is already compatible. The pass-through
  // is typed via `FigKiwiSymbolOverride` locally so the primitive sees
  // the expected shape without a runtime copy.
  return o as unknown as FigKiwiSymbolOverride;
}

/**
 * Build the minimal raw-FigNode shape that `buildGuidTranslationMap`
 * reads from a descendant. Fields it ignores are left undefined so we
 * never fabricate synthetic data.
 */
function designNodeToRawShape(node: DesignNodeShape): import("../types").FigNode {
  // Domain FigPaint carries `type` as a string literal (union). The
  // raw-side `buildGuidTranslationMap` reads `p.type` and tolerates
  // both string and `{ name }` — we feed strings, which is supported.
  const hasImageFill = node.fills?.some((p) => p.type === "IMAGE") ?? false;
  const raw = {
    guid: parseGuid(node.id),
    type: { value: 0, name: node.type },
    name: node.name,
    visible: node.visible,
    size: node.size,
    fillPaints: hasImageFill ? node.fills : undefined,
    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    characters: node.textData?.characters,
    textData: node.textData
      ? { characters: node.textData.characters }
      : undefined,
    componentPropRefs: node.componentPropertyRefs?.map((r) => ({
      nodeField: { value: 0, name: r.nodeField },
      defID: parseGuid(r.defId),
    })),
    childGuids: node.children?.map((c) => parseGuid(c.id)),
  };
  return raw as unknown as import("../types").FigNode;
}

function designCPAToRawShape(
  a: DesignComponentPropertyAssignmentShape,
): FigComponentPropAssignment {
  const raw = {
    defID: parseGuid(a.defId),
    value: {
      textValue: a.value.textValue,
      boolValue: a.value.boolValue,
      referenceValue: a.value.referenceValue
        ? parseGuid(a.value.referenceValue)
        : undefined,
    },
  };
  return raw as unknown as FigComponentPropAssignment;
}

function parseGuid(id: string): { sessionID: number; localID: number } {
  const [sessionStr, localStr] = id.split(":");
  return { sessionID: Number(sessionStr), localID: Number(localStr) };
}
