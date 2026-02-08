/**
 * @file Core types for unified builder architecture
 *
 * Provides shared types used across all format-specific builders (PPTX, DOCX, XLSX).
 * These types establish a common interface for build operations.
 */

import type { XmlElement, XmlDocument } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";

// =============================================================================
// Build Result Types
// =============================================================================

/**
 * Resource entry to be added to the package
 */
export type ResourceEntry = {
  /** Path within the package (e.g., "ppt/media/image1.png") */
  readonly path: string;
  /** Binary content of the resource */
  readonly data: ArrayBuffer;
  /** MIME type of the resource */
  readonly mimeType: string;
};

/**
 * Relationship entry to be added
 */
export type RelationshipEntry = {
  /** Relationship ID (e.g., "rId1") */
  readonly rId: string;
  /** Target path (relative or absolute) */
  readonly target: string;
  /** Relationship type URI */
  readonly type: string;
  /** External target mode (default: internal) */
  readonly external?: boolean;
};

/**
 * Result from building an element
 */
export type BuildResult = {
  /** The built XML element */
  readonly xml: XmlElement;
  /** Optional resources to add to the package */
  readonly resources?: readonly ResourceEntry[];
  /** Optional relationships to add */
  readonly relationships?: readonly RelationshipEntry[];
};

// =============================================================================
// Build Context Types
// =============================================================================

/**
 * Base build context shared across all format builders
 */
export type BaseBuildContext = {
  /** The ZIP package being built */
  readonly zipPackage: ZipPackage;
  /** Path to the current part being modified */
  readonly partPath: string;
  /** Directory for resolving relative paths (e.g., spec file directory) */
  readonly baseDir: string;
};

/**
 * Extended build context with ID tracking (for PPTX)
 */
export type BuildContext = BaseBuildContext & {
  /** Existing shape IDs to avoid conflicts */
  readonly existingIds: string[];
};

// =============================================================================
// Builder Function Types
// =============================================================================

/**
 * Synchronous element builder function
 */
export type SyncBuilder<TSpec, TContext extends BaseBuildContext = BuildContext> = (
  spec: TSpec,
  id: string,
  ctx: TContext,
) => BuildResult;

/**
 * Asynchronous element builder function
 */
export type AsyncBuilder<TSpec, TContext extends BaseBuildContext = BuildContext> = (
  spec: TSpec,
  id: string,
  ctx: TContext,
) => Promise<BuildResult>;

// =============================================================================
// Add Elements Options
// =============================================================================

/**
 * Options for adding elements synchronously
 */
export type AddElementsSyncOptions<TSpec, TContext extends BaseBuildContext = BuildContext> = {
  readonly doc: XmlDocument;
  readonly specs: readonly TSpec[];
  readonly ctx: TContext;
  readonly builder: SyncBuilder<TSpec, TContext>;
  readonly generateId: (ctx: TContext) => string;
  readonly addToTree: (doc: XmlDocument, xml: XmlElement) => XmlDocument;
};

/**
 * Options for adding elements asynchronously
 */
export type AddElementsAsyncOptions<TSpec, TContext extends BaseBuildContext = BuildContext> = {
  readonly doc: XmlDocument;
  readonly specs: readonly TSpec[];
  readonly ctx: TContext;
  readonly builder: AsyncBuilder<TSpec, TContext>;
  readonly generateId: (ctx: TContext) => string;
  readonly addToTree: (doc: XmlDocument, xml: XmlElement) => XmlDocument;
};

/**
 * Result from adding elements
 */
export type AddElementsResult = {
  readonly doc: XmlDocument;
  readonly added: number;
};
