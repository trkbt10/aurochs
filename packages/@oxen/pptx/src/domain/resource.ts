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

// =============================================================================
// Resolved Resources
// =============================================================================

/**
 * Resolved blipFill resource.
 * Contains the raw image data resolved at parse time.
 * Conversion to Data URL or Blob URL is done by the render layer.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type ResolvedBlipResource = {
  /** Raw image data */
  readonly data: ArrayBuffer;
  /** MIME type (e.g., "image/png", "image/jpeg") */
  readonly mimeType: string;
  /** Original file path for debugging */
  readonly path: string;
};
