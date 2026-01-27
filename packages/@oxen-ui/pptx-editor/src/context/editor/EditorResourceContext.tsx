/**
 * @file Editor resource context
 *
 * Provides centralized resource management for the editor layer.
 * Handles uploaded files and programmatically created resources.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  createResourceStore,
  type ResourceStore,
  type ResourceKind,
} from "@oxen/pptx/domain/resource-store";
import type { ResourceId } from "@oxen/pptx/domain/resource";

// =============================================================================
// Types
// =============================================================================

/**
 * Editor resource context value
 */
export type EditorResourceContextValue = {
  /** Centralized resource store */
  readonly store: ResourceStore;
  /** Register an uploaded file and return its resource ID */
  readonly registerUpload: (file: File) => Promise<ResourceId>;
  /** Register programmatically created data and return its resource ID */
  readonly registerCreated: (
    data: ArrayBuffer,
    kind: ResourceKind,
    mimeType?: string,
    filename?: string
  ) => ResourceId;
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Detect resource kind from MIME type
 */
function detectKindFromMimeType(mimeType: string): ResourceKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "media";
  }
  if (mimeType.startsWith("audio/")) {
    return "media";
  }
  // OLE objects, spreadsheets, documents, etc.
  if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("octet-stream")
  ) {
    return "ole";
  }
  // Default to OLE for unknown types
  return "ole";
}

// =============================================================================
// Context
// =============================================================================

const EditorResourceContext = createContext<EditorResourceContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

/**
 * Provider for editor resource context.
 *
 * Provides centralized resource management for uploaded and created resources.
 */
export function EditorResourceProvider({ children }: { readonly children: ReactNode }) {
  const value = useMemo<EditorResourceContextValue>(() => {
    const store = createResourceStore();
    let nextId = 1;

    const generateId = (): ResourceId => `uploaded-${nextId++}`;

    return {
      store,

      registerUpload: async (file: File): Promise<ResourceId> => {
        const data = await file.arrayBuffer();
        const id = generateId();
        store.set(id, {
          kind: detectKindFromMimeType(file.type),
          source: "uploaded",
          data,
          mimeType: file.type,
          originalFilename: file.name,
        });
        return id;
      },

      registerCreated: (
        data: ArrayBuffer,
        kind: ResourceKind,
        mimeType?: string,
        filename?: string
      ): ResourceId => {
        const id = generateId();
        store.set(id, {
          kind,
          source: "created",
          data,
          mimeType,
          originalFilename: filename,
        });
        return id;
      },
    };
  }, []);

  return (
    <EditorResourceContext.Provider value={value}>
      {children}
    </EditorResourceContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access editor resource context.
 * Must be used within EditorResourceProvider.
 */
export function useEditorResourceContext(): EditorResourceContextValue {
  const ctx = useContext(EditorResourceContext);
  if (ctx === undefined) {
    throw new Error("useEditorResourceContext must be used within EditorResourceProvider");
  }
  return ctx;
}

/**
 * Access editor resource store only.
 * Returns undefined if not within EditorResourceProvider.
 */
export function useEditorResourceStore(): ResourceStore | undefined {
  const ctx = useContext(EditorResourceContext);
  return ctx?.store;
}
