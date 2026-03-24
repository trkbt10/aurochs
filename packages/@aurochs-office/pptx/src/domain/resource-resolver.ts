/**
 * @file Resource resolution types
 *
 * Provides types for OPC relationship resolution (parser layer).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * Base resource resolver for relationship ID lookup.
 * Used by parsers to resolve r:id references to target paths.
 *
 * @see ECMA-376 Part 2, Section 9 (Relationships)
 */
export type ResourceRelationshipResolver = {
  /** Get target path for a relationship ID (r:id) */
  readonly getTarget: (rId: string) => string | undefined;
  /** Get relationship type by ID */
  readonly getType: (rId: string) => string | undefined;
};

/**
 * Simple resource resolver function signature.
 * Converts resource ID directly to a data URL or path.
 * Used as parameter type for fill/text resolution functions.
 * Callers pass `resourceStore.toDataUrl` as the argument.
 */
export type ResourceResolverFn = (resourceId: string) => string | undefined;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty relationship resolver (for testing).
 */
export function createEmptyRelationshipResolver(): ResourceRelationshipResolver {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
  };
}
