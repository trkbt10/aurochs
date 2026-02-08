/**
 * @file Resource resolution types
 *
 * Provides hierarchy of resolver types for OPC relationship resolution.
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
 * Used when only basic resolution is needed (e.g., text-fill).
 */
export type ResourceResolverFn = (resourceId: string) => string | undefined;

// =============================================================================
// Full Resource Resolver
// =============================================================================

/**
 * Full resource resolver for rendering layer.
 * Extends relationship resolution with file reading capabilities.
 */
export type ResourceResolver = ResourceRelationshipResolver & {
  /**
   * Resolve a resource ID to a data URL or path.
   * Combines getTarget + readFile into a single call.
   */
  readonly resolve: ResourceResolverFn;

  /** Get MIME type for a resource */
  readonly getMimeType: (id: string) => string | undefined;

  /** Get raw file path for a resource ID (without converting to data URL) */
  readonly getFilePath: (id: string) => string | undefined;

  /** Read raw file content from path */
  readonly readFile: (path: string) => Uint8Array | null;

  /**
   * Get the first resource path matching a relationship type.
   * @see ECMA-376 Part 2 (Open Packaging Conventions)
   */
  readonly getResourceByType?: (relType: string) => string | undefined;
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty resource resolver (for testing).
 */
export function createEmptyResourceResolver(): ResourceResolver {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    readFile: () => null,
  };
}

/**
 * Create an empty relationship resolver (for testing).
 */
export function createEmptyRelationshipResolver(): ResourceRelationshipResolver {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
  };
}

/**
 * Extract a simple resolver function from a full ResourceResolver.
 * Useful when only the resolve() function is needed.
 */
export function toResolverFn(resolver: ResourceResolver): ResourceResolverFn {
  return resolver.resolve;
}

/**
 * Extract a relationship resolver from a full ResourceResolver.
 * Useful when only getTarget/getType is needed for parsing.
 */
export function toRelationshipResolver(
  resolver: ResourceResolver,
): ResourceRelationshipResolver {
  return {
    getTarget: resolver.getTarget,
    getType: resolver.getType,
  };
}
