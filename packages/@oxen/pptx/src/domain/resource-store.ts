/**
 * @file Resource store for centralized resource management
 *
 * Aggregates resolved resource data that was previously scattered across domain types
 * (e.g., BlipFillProperties.resolvedResource, OleReference.embedData).
 */

import type { ResourceId } from "./resource";
import { toDataUrl } from "@oxen/buffer";

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
  /** Slide ID for slide-scoped resource management */
  readonly slideId?: string;
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
 * Resources are registered during parse time and accessed during render/export.
 */
export type ResourceStore = {
  /** Get resource by ID */
  get<T = unknown>(resourceId: ResourceId): ResolvedResourceEntry<T> | undefined;

  /** Register a resource */
  set<T = unknown>(resourceId: ResourceId, entry: ResolvedResourceEntry<T>): void;

  /** Check if resource exists */
  has(resourceId: ResourceId): boolean;

  /** Get all resource IDs */
  keys(): Iterable<ResourceId>;

  /** Get resource as data URL (for images) */
  toDataUrl(resourceId: ResourceId): string | undefined;

  /** Get resource IDs associated with a slide */
  getBySlide(slideId: string): Iterable<ResourceId>;

  /** Release all resources for a slide (memory optimization) */
  releaseSlide(slideId: string): void;
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new resource store
 */
export function createResourceStore(): ResourceStore {
  const store = new Map<ResourceId, ResolvedResourceEntry>();

  return {
    get<T = unknown>(id: ResourceId): ResolvedResourceEntry<T> | undefined {
      return store.get(id) as ResolvedResourceEntry<T> | undefined;
    },

    set<T = unknown>(id: ResourceId, entry: ResolvedResourceEntry<T>): void {
      store.set(id, entry);
    },

    has(id: ResourceId): boolean {
      return store.has(id);
    },

    keys(): Iterable<ResourceId> {
      return store.keys();
    },

    toDataUrl(id: ResourceId): string | undefined {
      const entry = store.get(id);
      if (!entry?.data || !entry.mimeType) return undefined;
      return toDataUrl(entry.data, entry.mimeType);
    },

    *getBySlide(slideId: string): Iterable<ResourceId> {
      for (const [id, entry] of store) {
        if (entry.slideId === slideId) yield id;
      }
    },

    releaseSlide(slideId: string): void {
      for (const [id, entry] of store) {
        if (entry.slideId === slideId) {
          store.delete(id);
        }
      }
    },
  };
}

/**
 * Create an empty resource store (for testing)
 */
export function createEmptyResourceStore(): ResourceStore {
  return createResourceStore();
}
