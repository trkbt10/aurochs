/**
 * @file Centralized resource store for OOXML resource management
 *
 * Shared across all OOXML formats (PPTX, DOCX, XLSX).
 * Resources are registered during parse time and accessed during render/export.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import { toDataUrl } from "@aurochs/buffer";

// =============================================================================
// Types
// =============================================================================

/**
 * Resource kind classification
 */
export type ResourceKind = "image" | "ole" | "chart" | "diagram" | "media";

/**
 * Resource acquisition source
 */
export type ResourceSource = "parsed" | "uploaded" | "created";

/**
 * Resolved resource entry with optional parsed data
 *
 * @typeParam T - Type of parsed data (e.g., Chart, DiagramContent)
 */
export type ResolvedResourceEntry<T = unknown> = {
  readonly kind: ResourceKind;
  readonly source: ResourceSource;
  readonly data: ArrayBuffer;
  readonly mimeType?: string;
  /** Original file path (for debugging) */
  readonly path?: string;
  /** Scope identifier (e.g., slideId for PPTX) */
  readonly scopeId?: string;
  /** Parsed domain object (for chart, diagram, etc.) */
  readonly parsed?: T;
  /** Original filename (for OLE objects) */
  readonly originalFilename?: string;
  /** Preview URL (for OLE objects) */
  readonly previewUrl?: string;
};

/**
 * Mutable resource store for centralized resource management.
 *
 * This is the single source of truth for all resolved resources
 * across OOXML formats. Resources are registered during parse time
 * and accessed during render/export via toDataUrl().
 */
export type ResourceStore = {
  /** Get resource by ID */
  get<T = unknown>(resourceId: string): ResolvedResourceEntry<T> | undefined;

  /** Register a resource */
  set<T = unknown>(resourceId: string, entry: ResolvedResourceEntry<T>): void;

  /** Check if resource exists */
  has(resourceId: string): boolean;

  /** Get all resource IDs */
  keys(): Iterable<string>;

  /** Get resource as data URL (for images) */
  toDataUrl(resourceId: string): string | undefined;

  /** Get resource IDs associated with a scope (e.g., slide) */
  getByScope(scopeId: string): Iterable<string>;

  /** Release all resources for a scope (memory optimization) */
  releaseScope(scopeId: string): void;
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new resource store
 */
export function createResourceStore(): ResourceStore {
  const store = new Map<string, ResolvedResourceEntry>();

  return {
    get<T = unknown>(id: string): ResolvedResourceEntry<T> | undefined {
      return store.get(id) as ResolvedResourceEntry<T> | undefined;
    },

    set<T = unknown>(id: string, entry: ResolvedResourceEntry<T>): void {
      store.set(id, entry);
    },

    has(id: string): boolean {
      return store.has(id);
    },

    keys(): Iterable<string> {
      return store.keys();
    },

    toDataUrl(id: string): string | undefined {
      const entry = store.get(id);
      if (!entry?.data || !entry.mimeType) {
        return undefined;
      }
      return toDataUrl(entry.data, entry.mimeType);
    },

    *getByScope(scopeId: string): Iterable<string> {
      for (const [id, entry] of store) {
        if (entry.scopeId === scopeId) {
          yield id;
        }
      }
    },

    releaseScope(scopeId: string): void {
      for (const [id, entry] of store) {
        if (entry.scopeId === scopeId) {
          store.delete(id);
        }
      }
    },
  };
}
