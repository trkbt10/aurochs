/**
 * @file Unit tests for useOlePreview hook
 *
 * Tests OLE object preview resolution including:
 * - Preview URL resolution from ResourceStore
 * - imgW/imgH EMU to pixel conversion
 * - showAsIcon flag handling
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */

// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { useOlePreview } from "./useOlePreview";
import { RenderProvider, useRenderContext } from "../../../context";
import { px, type Pixels } from "@oxen-office/ooxml/domain/units";
import type { OleReference } from "@oxen-office/pptx/domain";
import type { ResourceResolver } from "@oxen-office/pptx/domain/resource-resolver";
import { createEmptyResourceResolver } from "@oxen-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@oxen-office/pptx/domain/resource-store";
import { createEmptyResourceStore } from "@oxen-office/pptx/domain/resource-store";
import { EMU_PER_PIXEL } from "@oxen-office/pptx/domain/defaults";

type RenderDeps = {
  readonly resources?: ResourceResolver;
  readonly resourceStore?: ResourceStore;
};

function createWrapper({ resources, resourceStore }: RenderDeps) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return createElement(RenderProvider, {
      slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
      resources,
      resourceStore,
      children,
    });
  };
}

function renderUseOlePreview(oleData: OleReference | undefined, deps: RenderDeps) {
  const wrapper = createWrapper(deps);
  return renderHook(
    () => {
      const preview = useOlePreview(oleData);
      const { warnings } = useRenderContext();
      return { preview, warnings };
    },
    { wrapper },
  );
}

describe("useOlePreview", () => {
  it("returns undefined values when oleData is undefined", () => {
    const { result } = renderUseOlePreview(undefined, {
      resources: createEmptyResourceResolver(),
      resourceStore: createEmptyResourceStore(),
    });

    expect(result.current.preview).toEqual({
      previewUrl: undefined,
      hasPreview: false,
      showAsIcon: false,
      objectName: undefined,
      progId: undefined,
      imageWidth: undefined,
      imageHeight: undefined,
    });
  });

  it("returns preview image URL from ResourceStore (previewUrl)", () => {
    const store = createEmptyResourceStore();
    store.set("rId1", {
      kind: "ole",
      source: "parsed",
      data: new Uint8Array([0]).buffer,
      previewUrl: "data:image/png;base64,abc123",
    });

    const oleData: OleReference = {
      resourceId: "rId1",
      progId: "Excel.Sheet.12",
      name: "Sheet1",
    };

    const { result } = renderUseOlePreview(oleData, {
      resources: createEmptyResourceResolver(),
      resourceStore: store,
    });

    expect(result.current.preview).toEqual({
      previewUrl: "data:image/png;base64,abc123",
      hasPreview: true,
      showAsIcon: false,
      objectName: "Sheet1",
      progId: "Excel.Sheet.12",
      imageWidth: undefined,
      imageHeight: undefined,
    });
  });

  it("resolves preview from p:pic child element via ResourceStore.toDataUrl", () => {
    const store = createEmptyResourceStore();
    store.set("rId5", {
      kind: "image",
      source: "parsed",
      data: new TextEncoder().encode("picdata").buffer,
      mimeType: "image/png",
    });

    const oleData: OleReference = {
      progId: "PowerPoint.Slide.8",
      pic: { resourceId: "rId5" },
    };

    const { result } = renderUseOlePreview(oleData, {
      resources: createEmptyResourceResolver(),
      resourceStore: store,
    });

    expect(result.current.preview.previewUrl).toBe("data:image/png;base64,cGljZGF0YQ==");
    expect(result.current.preview.hasPreview).toBe(true);
  });

  it("falls back to resource resolver for p:pic when ResourceStore.toDataUrl returns undefined", () => {
    const store = createEmptyResourceStore();
    store.set("rId5", {
      kind: "image",
      source: "parsed",
      data: new Uint8Array([0]).buffer,
      // mimeType intentionally omitted so toDataUrl() returns undefined
    });

    const resources: ResourceResolver = {
      ...createEmptyResourceResolver(),
      resolve: (resourceId) => (resourceId === "rId5" ? "data:image/png;base64,resolved" : undefined),
    };

    const oleData: OleReference = {
      progId: "PowerPoint.Slide.8",
      pic: { resourceId: "rId5" },
    };

    const { result } = renderUseOlePreview(oleData, {
      resources,
      resourceStore: store,
    });

    expect(result.current.preview.previewUrl).toBe("data:image/png;base64,resolved");
    expect(result.current.preview.hasPreview).toBe(true);
  });

  it("adds warning when no preview is available", () => {
    const oleData: OleReference = {
      progId: "Unknown.Object.1",
    };

    const { result } = renderUseOlePreview(oleData, {
      resources: createEmptyResourceResolver(),
      resourceStore: createEmptyResourceStore(),
    });

    expect(result.current.preview.hasPreview).toBe(false);
    expect(result.current.preview.previewUrl).toBeUndefined();
    expect(result.current.warnings.getAll()).toContainEqual({
      type: "fallback",
      message: "OLE object preview not available: Unknown.Object.1",
    });
  });

  it("returns showAsIcon flag", () => {
    const store = createEmptyResourceStore();
    store.set("rId1", {
      kind: "ole",
      source: "parsed",
      data: new Uint8Array([0]).buffer,
      previewUrl: "data:image/png;base64,abc",
    });

    const oleData: OleReference = {
      resourceId: "rId1",
      showAsIcon: true,
      progId: "Equation.3",
    };

    const { result } = renderUseOlePreview(oleData, {
      resources: createEmptyResourceResolver(),
      resourceStore: store,
    });

    expect(result.current.preview.showAsIcon).toBe(true);
    expect(result.current.preview.progId).toBe("Equation.3");
  });

  describe("imgW/imgH to pixel conversion", () => {
    it("converts imgW from EMU to pixels", () => {
      const store = createEmptyResourceStore();
      store.set("rId1", {
        kind: "ole",
        source: "parsed",
        data: new Uint8Array([0]).buffer,
        previewUrl: "data:image/png;base64,abc",
      });

      const imgWEmu = 914400; // 1 inch = 96 pixels at 96 DPI
      const oleData: OleReference = {
        resourceId: "rId1",
        imgW: imgWEmu,
      };

      const { result } = renderUseOlePreview(oleData, {
        resources: createEmptyResourceResolver(),
        resourceStore: store,
      });

      expect(result.current.preview.imageWidth).toBe(imgWEmu / EMU_PER_PIXEL);
      expect(result.current.preview.imageWidth).toBeCloseTo(96, 0);
    });

    it("converts imgH from EMU to pixels", () => {
      const store = createEmptyResourceStore();
      store.set("rId1", {
        kind: "ole",
        source: "parsed",
        data: new Uint8Array([0]).buffer,
        previewUrl: "data:image/png;base64,abc",
      });

      const imgHEmu = 457200; // 0.5 inch = 48 pixels at 96 DPI
      const oleData: OleReference = {
        resourceId: "rId1",
        imgH: imgHEmu,
      };

      const { result } = renderUseOlePreview(oleData, {
        resources: createEmptyResourceResolver(),
        resourceStore: store,
      });

      expect(result.current.preview.imageHeight).toBe(imgHEmu / EMU_PER_PIXEL);
      expect(result.current.preview.imageHeight).toBeCloseTo(48, 0);
    });
  });
});
