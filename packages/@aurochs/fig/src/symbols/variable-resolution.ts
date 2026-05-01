/**
 * @file Figma variable evaluation — projection from Kiwi `VariableData`
 * to a switchable union, plus the RESOLVE_VARIANT expression evaluator.
 *
 * Why this lives in @aurochs/fig/symbols: Figma variables are part of
 * the symbol/instance resolution domain (variable consumption maps
 * carried by INSTANCE nodes drive variant selection), so the
 * evaluator belongs alongside the rest of the symbol resolver.
 *
 * Scope:
 *   - `projectVariableAnyValue` — Kiwi presence-based union →
 *     discriminated union (`FigVariableAnyValue`).
 *   - `findVariableConsumptionExpression` — locate an INSTANCE's VCM
 *     entry that wraps an expression we can evaluate.
 *   - `resolveVariantOverride` — given an INSTANCE and the SYMBOL it
 *     references, choose the variant whose authored property values
 *     best match the VCM's RESOLVE_VARIANT mapValue. Returns the
 *     overridden symbol GUID, or `undefined` when:
 *       (a) the INSTANCE has no RESOLVE_VARIANT VCM,
 *       (b) the referenced SYMBOL is standalone (not in a variant set),
 *       (c) the variant properties cannot be resolved (e.g. the alias
 *           target is a library variable that this fig file doesn't
 *           include — Figma's exporter pre-bakes those references but
 *           when we render from the .fig directly we have no value).
 *
 * The `(c)` case is the dominant outcome on edge-cases.fig: every
 * RESOLVE_VARIANT we observe references library `assetRef` aliases
 * whose values aren't carried in the .fig. Returning `undefined` keeps
 * the existing `symbolID` (the variant Figma's exporter saw at export
 * time), which is also what every Activity-View part baseline already
 * locked in at 0.00–0.25%.
 */

import type {
  FigGuid,
  FigKiwiVariableAnyValue,
  FigKiwiVariableData,
  FigVariableAnyValue,
  FigVariableExpression,
  FigVariableID,
  FigVariableMap,
  FigVariableMapEntry,
  FigKiwiVariableDataMap,
  FigNode,
} from "../types";
import { FIG_NODE_TYPE } from "../types";
import { getNodeType, guidToString } from "../parser/tree-builder";

// =============================================================================
// Kiwi → discriminated union projection
// =============================================================================

/**
 * Project the Kiwi `VariableAnyValue` (oneof-by-field-presence) to the
 * discriminated `FigVariableAnyValue` union. Returns `undefined` when
 * no recognised field is set.
 *
 * Field precedence matches the Kiwi schema declaration order; in
 * practice exactly one is ever set so the order doesn't matter for
 * well-formed inputs. The order is fixed for determinism if a future
 * exporter ever sets multiple.
 */
export function projectVariableAnyValue(raw: FigKiwiVariableAnyValue | undefined): FigVariableAnyValue | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw.boolValue !== undefined) {
    return { kind: "bool", value: raw.boolValue };
  }
  if (raw.textValue !== undefined) {
    return { kind: "text", value: raw.textValue };
  }
  if (raw.floatValue !== undefined) {
    return { kind: "float", value: raw.floatValue };
  }
  if (raw.alias !== undefined) {
    return { kind: "alias", value: raw.alias };
  }
  if (raw.colorValue !== undefined) {
    return { kind: "color", value: raw.colorValue };
  }
  if (raw.expressionValue !== undefined) {
    return { kind: "expression", value: raw.expressionValue };
  }
  if (raw.mapValue !== undefined) {
    return { kind: "map", value: raw.mapValue };
  }
  return undefined;
}

// =============================================================================
// Expression locating
// =============================================================================

/**
 * Find the first VCM entry whose `variableData.value` is an
 * expression. Returns the projected expression and the entry's
 * nodeField (which maps to the schema's NodeFieldDef ID — currently
 * unused beyond passthrough but exposed for future evaluators).
 */
export function findVariableConsumptionExpression(
  vcm: FigKiwiVariableDataMap | undefined,
): { readonly expression: FigVariableExpression; readonly nodeField?: number } | undefined {
  if (!vcm?.entries) {
    return undefined;
  }
  for (const entry of vcm.entries) {
    const projected = projectVariableAnyValue(entry.variableData?.value);
    if (projected?.kind === "expression") {
      return { expression: projected.value, nodeField: entry.nodeField };
    }
  }
  return undefined;
}

// =============================================================================
// RESOLVE_VARIANT
// =============================================================================

/** Numeric value of `ExpressionFunction.RESOLVE_VARIANT` per figma-schema.json. */
const EXPRESSION_FUNCTION_RESOLVE_VARIANT = 2;

/**
 * Test whether `expr` is the RESOLVE_VARIANT function. The schema
 * uses both numeric `value` (binary serialisation) and a string `name`
 * (developer-friendly), so we check either route.
 */
function isResolveVariant(expr: FigVariableExpression): boolean {
  const fn = expr.expressionFunction;
  return fn?.value === EXPRESSION_FUNCTION_RESOLVE_VARIANT || fn?.name === "RESOLVE_VARIANT";
}

/**
 * Find the SYMBOL/COMPONENT_SET parent that contains `symbolNode` as
 * one of its variants, walking up `parentIndex.guid`.
 *
 * Returns `undefined` for standalone SYMBOLs whose parent is just a
 * canvas/section/ordinary FRAME (i.e. the SYMBOL is not part of a
 * variant set). These never benefit from RESOLVE_VARIANT.
 */
function findVariantContainer(
  symbolNode: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
): FigNode | undefined {
  const parentGuid = symbolNode.parentIndex?.guid;
  if (!parentGuid) {
    return undefined;
  }
  const parent = symbolMap.get(guidToString(parentGuid));
  if (!parent) {
    return undefined;
  }
  // COMPONENT_SET is the canonical variant container; older fixtures
  // sometimes use a plain FRAME holding sibling SYMBOLs whose names
  // encode "Prop=Value" pairs. Both forms are recognised.
  const parentType = getNodeType(parent);
  if (parentType === FIG_NODE_TYPE.COMPONENT_SET) {
    return parent;
  }
  if (parentType === FIG_NODE_TYPE.FRAME && hasVariantSiblings(parent)) {
    return parent;
  }
  return undefined;
}

/**
 * A FRAME is treated as a variant container when ≥2 of its direct
 * SYMBOL children carry a `Prop=Value` style name, indicating the
 * sibling-FRAME variant pattern (e.g. iOS components with
 * `BG Context=Bright, Type=Back` etc.).
 */
function hasVariantSiblings(parent: FigNode): boolean {
  const symbolChildren = (parent.children ?? []).filter((c): c is FigNode => c != null && getNodeType(c) === FIG_NODE_TYPE.SYMBOL);
  if (symbolChildren.length < 2) {
    return false;
  }
  const namedAsVariant = symbolChildren.filter((c) => /^[^=]+=[^=]+/.test(c.name ?? ""));
  return namedAsVariant.length >= 2;
}

/**
 * Parse a SYMBOL/COMPONENT name like `"BG Context=Bright, Type=Back"`
 * into a property → value map. Returns an empty map if the name
 * doesn't follow the variant convention.
 */
function parseVariantPropertiesFromName(name: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!name) {
    return out;
  }
  for (const part of name.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      continue;
    }
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) {
      out.set(key, value);
    }
  }
  return out;
}

/**
 * From the RESOLVE_VARIANT expression's first argument, extract the
 * map of property name → resolved value. The first argument must be
 * a `mapValue`; each entry's `value.value` is the variable data we
 * want to resolve to a literal string (the name of the variant value
 * to select).
 *
 * We can resolve a `text`-kind literal directly. `alias`-kind values
 * point at variables — resolving them needs a local variable table
 * the .fig file doesn't carry for library aliases, so we surface
 * those as `undefined` and let the caller bail.
 */
function extractMapEntries(expr: FigVariableExpression): readonly FigVariableMapEntry[] | undefined {
  const firstArg = expr.expressionArguments?.[0];
  const projected = projectVariableAnyValue(firstArg?.value);
  if (projected?.kind !== "map") {
    return undefined;
  }
  return projected.value.values;
}

/**
 * Try to resolve a `VariableData` to its concrete property-value
 * string. Returns `undefined` when the value is an alias to a
 * library-only variable whose value is not carried by this .fig.
 *
 * (Local-variable aliasing — `alias` pointing at a `FigGuid` whose
 * variable definition lives in the same .fig — would also need a
 * variable resolver wired in here. Until that arrives we stay
 * conservative: only literal `text` and `bool` values resolve.)
 */
function resolveVariableLiteral(data: FigKiwiVariableData | undefined): string | undefined {
  const projected = projectVariableAnyValue(data?.value);
  if (!projected) {
    return undefined;
  }
  if (projected.kind === "text") {
    return projected.value;
  }
  if (projected.kind === "bool") {
    return projected.value ? "true" : "false";
  }
  if (projected.kind === "float") {
    return String(projected.value);
  }
  // alias / color / expression / map — not directly a property literal.
  return undefined;
}

/**
 * Score a candidate variant against the requested property-value
 * map. Higher is better; -1 means "incompatible" (a property the
 * map demands has a different value on this variant). When all
 * properties tie (or the map is empty), the function returns 0 so
 * the caller's tie-breaker (authored order) decides.
 */
function scoreVariant(
  variant: FigNode,
  requestedProps: ReadonlyMap<string, string>,
): number {
  const variantProps = parseVariantPropertiesFromName(variant.name);
  let score = 0;
  for (const [k, v] of requestedProps) {
    const variantValue = variantProps.get(k);
    if (variantValue === undefined) {
      // Property not present on this variant — neutral.
      continue;
    }
    if (variantValue === v) {
      score += 1;
    } else {
      return -1;
    }
  }
  return score;
}

/**
 * Result of evaluating RESOLVE_VARIANT for an INSTANCE.
 */
export type ResolveVariantResult = {
  /**
   * The variant whose properties best match. `undefined` when no
   * reliable match could be made (see file header for cases).
   */
  readonly resolvedSymbolID: FigGuid | undefined;
  /**
   * Reason for `undefined` when applicable — exposed so the renderer
   * can log/inspect why a variant couldn't be resolved without
   * having to re-derive the diagnostic.
   */
  readonly bailReason?:
    | "no-vcm-expression"
    | "not-resolve-variant"
    | "no-map-arg"
    | "no-variant-container"
    | "unresolved-aliases";
};

/**
 * Evaluate RESOLVE_VARIANT for an INSTANCE. Returns the variant's
 * symbol GUID if a clear match was found, otherwise an explanatory
 * `bailReason`. Callers should treat `undefined` as "keep the
 * INSTANCE's existing symbolID".
 */
export function resolveVariantOverride(
  instance: FigNode,
  symbolNode: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
): ResolveVariantResult {
  const located = findVariableConsumptionExpression(instance.variableConsumptionMap);
  if (!located) {
    return { resolvedSymbolID: undefined, bailReason: "no-vcm-expression" };
  }
  if (!isResolveVariant(located.expression)) {
    return { resolvedSymbolID: undefined, bailReason: "not-resolve-variant" };
  }
  const mapEntries = extractMapEntries(located.expression);
  if (!mapEntries || mapEntries.length === 0) {
    return { resolvedSymbolID: undefined, bailReason: "no-map-arg" };
  }
  const container = findVariantContainer(symbolNode, symbolMap);
  if (!container) {
    return { resolvedSymbolID: undefined, bailReason: "no-variant-container" };
  }

  // Resolve each map entry to a literal property-value string. When
  // any entry resolves to undefined (library alias), bail out — a
  // partial resolution would silently pick a different variant.
  const requestedProps = new Map<string, string>();
  for (const entry of mapEntries) {
    const literal = resolveVariableLiteral(entry.value);
    if (literal === undefined) {
      return { resolvedSymbolID: undefined, bailReason: "unresolved-aliases" };
    }
    requestedProps.set(entry.key, literal);
  }

  // Score each variant; pick the highest. Authored order breaks ties.
  const variants = (container.children ?? []).filter((c): c is FigNode => c != null && getNodeType(c) === FIG_NODE_TYPE.SYMBOL);
  let best: FigNode | undefined;
  let bestScore = -1;
  for (const v of variants) {
    const s = scoreVariant(v, requestedProps);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  if (!best || bestScore < 0) {
    return { resolvedSymbolID: undefined, bailReason: "no-variant-container" };
  }
  return { resolvedSymbolID: best.guid };
}

/**
 * Re-export the `FigVariableID` type for callers that need to
 * inspect alias targets (e.g. a future library-aware resolver
 * wanting to log unresolved variables).
 */
export type { FigVariableID };
