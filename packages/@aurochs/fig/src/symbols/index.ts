/** @file Symbol resolution utilities */
export {
  extractSymbolIDPair,
  getEffectiveSymbolID,
  type SymbolIDPair,
} from "./effective-symbol-id";

export { resolveConstraintAxis } from "./constraint-axis";

export {
  getConstraintValue,
  resolveChildConstraints,
  type ChildConstraintResolution,
} from "./resolve-child-constraints";

// Instance resolution — SoT for "INSTANCE → renderable node + children"
export {
  resolveInstanceNode,
  resolveInstanceReferences,
  resolveSymbolGuidStr,
  mergeSymbolProperties,
  applySelfOverridesToMergedNode,
  cloneSymbolChildren,
  collectComponentPropAssignments,
  getInstanceSymbolOverrides,
  type ResolvedInstanceNode,
  type InstanceResolveContext,
  type InstanceResolution,
  type CloneSymbolChildrenOptions,
  type FigDerivedSymbolData,
} from "./symbol-resolver";

export {
  buildSymbolDependencyGraph,
  preResolveSymbols,
  type SymbolDependencyGraph,
  type ResolvedSymbolCache,
} from "./symbol-pre-resolver";

export {
  buildGuidTranslationMap,
  translateOverrides,
  type GuidTranslationMap,
} from "./guid-translation";

export {
  resolveInstanceLayout,
} from "./constraints";

export {
  buildFigStyleRegistry,
  resolveNodeStyleIds,
  resolveStyleIdOnMutableNode,
  styleRefKey,
  styleRefKeys,
} from "./style-registry";
