// @vitest-environment jsdom

/**
 * @file Tests for EditorResourceContext
 *
 * Verifies that EditorResourceProvider correctly accepts an external
 * ResourceStore via the initialStore prop, making it available through
 * the useEditorResourceStore hook without creating a new store.
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import {
  EditorResourceProvider,
  useEditorResourceStore,
} from "./EditorResourceContext";

// =============================================================================
// initialStore prop
// =============================================================================

describe("EditorResourceProvider initialStore", () => {
  it("should expose the provided initialStore through useEditorResourceStore", () => {
    const store = createResourceStore();

    // Pre-populate with a known entry so we can verify identity
    store.set("test-image-1", {
      kind: "image",
      source: "parsed",
      data: new ArrayBuffer(8),
      mimeType: "image/png",
    });

    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <EditorResourceProvider initialStore={store}>{children}</EditorResourceProvider>
    );

    const { result } = renderHook(() => useEditorResourceStore(), { wrapper });

    // The hook must return the exact same store instance, not a copy
    expect(result.current).toBeDefined();
    expect(result.current!.has("test-image-1")).toBe(true);

    const entry = result.current!.get("test-image-1");
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("image");
    expect(entry!.source).toBe("parsed");
    expect(entry!.mimeType).toBe("image/png");
  });

  it("should return the same store object reference as the one passed in", () => {
    const store = createResourceStore();

    store.set("ref-check", {
      kind: "ole",
      source: "created",
      data: new ArrayBuffer(0),
    });

    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <EditorResourceProvider initialStore={store}>{children}</EditorResourceProvider>
    );

    const { result } = renderHook(() => useEditorResourceStore(), { wrapper });

    // Mutate the original store and verify the hook's store sees it
    store.set("added-after-render", {
      kind: "media",
      source: "uploaded",
      data: new ArrayBuffer(4),
    });

    expect(result.current!.has("added-after-render")).toBe(true);
  });

  it("should create a fresh store when initialStore is not provided", () => {
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <EditorResourceProvider>{children}</EditorResourceProvider>
    );

    const { result } = renderHook(() => useEditorResourceStore(), { wrapper });

    expect(result.current).toBeDefined();
    // Fresh store has no entries
    expect(result.current!.has("anything")).toBe(false);
  });

  it("should return undefined when used outside of EditorResourceProvider", () => {
    const { result } = renderHook(() => useEditorResourceStore());

    expect(result.current).toBeUndefined();
  });
});
