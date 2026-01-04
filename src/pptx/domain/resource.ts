/**
 * @file Resource reference types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 22.8 - Relationships
 */

// =============================================================================
// Resource References
// =============================================================================

/**
 * Resource identifier (relationship ID)
 */
export type ResourceId = string;

/**
 * Resolved resource path
 */
export type ResourcePath = string;

/**
 * Hyperlink sound reference
 * @see ECMA-376 Part 1, Section 20.1.2.2.32 (snd)
 */
export type HyperlinkSound = {
  readonly embed: ResourceId;
  readonly name?: string;
};

/**
 * Hyperlink destination
 */
export type Hyperlink = {
  readonly id: ResourceId;
  readonly tooltip?: string;
  readonly action?: string;
  readonly sound?: HyperlinkSound;
};
