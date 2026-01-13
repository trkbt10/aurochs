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

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOlePreview } from "./useOlePreview";
import type { OleReference } from "../../../../../domain";
import { EMU_PER_PIXEL } from "../../../../../domain/defaults";

// Mock the render context modules
vi.mock("../../../context", () => ({
  useRenderResources: vi.fn(),
  useRenderContext: vi.fn(),
  useRenderResourceStore: vi.fn(),
}));

import { useRenderResources, useRenderContext, useRenderResourceStore } from "../../../context";

describe("useOlePreview", () => {
  const mockResolve = vi.fn();
  const mockWarningsAdd = vi.fn();
  const mockResourceStoreGet = vi.fn();
  const mockResourceStoreToDataUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRenderResources as Mock).mockReturnValue({
      resolve: mockResolve,
    });
    (useRenderContext as Mock).mockReturnValue({
      warnings: { add: mockWarningsAdd },
    });
    (useRenderResourceStore as Mock).mockReturnValue({
      get: mockResourceStoreGet,
      toDataUrl: mockResourceStoreToDataUrl,
    });
  });

  it("returns undefined values when oleData is undefined", () => {
    const { result } = renderHook(() => useOlePreview(undefined));

    expect(result.current).toEqual({
      previewUrl: undefined,
      hasPreview: false,
      showAsIcon: false,
      objectName: undefined,
      progId: undefined,
      imageWidth: undefined,
      imageHeight: undefined,
    });
  });

  it("returns preview image URL from ResourceStore", () => {
    mockResourceStoreGet.mockReturnValue({
      previewUrl: "data:image/png;base64,abc123",
    });

    const oleData: OleReference = {
      resourceId: "rId1",
      progId: "Excel.Sheet.12",
      name: "Sheet1",
    };

    const { result } = renderHook(() => useOlePreview(oleData));

    expect(mockResourceStoreGet).toHaveBeenCalledWith("rId1");
    expect(result.current).toEqual({
      previewUrl: "data:image/png;base64,abc123",
      hasPreview: true,
      showAsIcon: false,
      objectName: "Sheet1",
      progId: "Excel.Sheet.12",
      imageWidth: undefined,
      imageHeight: undefined,
    });
  });

  it("resolves preview from p:pic child element via ResourceStore", () => {
    mockResourceStoreGet.mockReturnValue(undefined);
    mockResourceStoreToDataUrl.mockReturnValue("data:image/png;base64,picdata");

    const oleData: OleReference = {
      progId: "PowerPoint.Slide.8",
      pic: { resourceId: "rId5" },
    };

    const { result } = renderHook(() => useOlePreview(oleData));

    expect(mockResourceStoreToDataUrl).toHaveBeenCalledWith("rId5");
    expect(result.current.previewUrl).toBe("data:image/png;base64,picdata");
    expect(result.current.hasPreview).toBe(true);
  });

  it("falls back to resource resolver for p:pic when ResourceStore fails", () => {
    mockResourceStoreGet.mockReturnValue(undefined);
    mockResourceStoreToDataUrl.mockReturnValue(undefined);
    mockResolve.mockReturnValue("data:image/png;base64,resolved");

    const oleData: OleReference = {
      progId: "PowerPoint.Slide.8",
      pic: { resourceId: "rId5" },
    };

    const { result } = renderHook(() => useOlePreview(oleData));

    expect(mockResolve).toHaveBeenCalledWith("rId5");
    expect(result.current.previewUrl).toBe("data:image/png;base64,resolved");
    expect(result.current.hasPreview).toBe(true);
  });

  it("adds warning when no preview is available", () => {
    mockResourceStoreGet.mockReturnValue(undefined);

    const oleData: OleReference = {
      progId: "Unknown.Object.1",
    };

    const { result } = renderHook(() => useOlePreview(oleData));

    expect(result.current.hasPreview).toBe(false);
    expect(result.current.previewUrl).toBeUndefined();
    expect(mockWarningsAdd).toHaveBeenCalledWith({
      type: "fallback",
      message: "OLE object preview not available: Unknown.Object.1",
    });
  });

  it("returns showAsIcon flag", () => {
    mockResourceStoreGet.mockReturnValue({
      previewUrl: "data:image/png;base64,abc",
    });

    const oleData: OleReference = {
      resourceId: "rId1",
      showAsIcon: true,
      progId: "Equation.3",
    };

    const { result } = renderHook(() => useOlePreview(oleData));

    expect(result.current.showAsIcon).toBe(true);
    expect(result.current.progId).toBe("Equation.3");
  });

  describe("imgW/imgH to pixel conversion", () => {
    beforeEach(() => {
      mockResourceStoreGet.mockReturnValue({
        previewUrl: "data:image/png;base64,abc",
      });
    });

    it("converts imgW from EMU to pixels", () => {
      const imgWEmu = 914400; // 1 inch = 96 pixels at 96 DPI
      const oleData: OleReference = {
        resourceId: "rId1",
        imgW: imgWEmu,
      };

      const { result } = renderHook(() => useOlePreview(oleData));

      expect(result.current.imageWidth).toBe(imgWEmu / EMU_PER_PIXEL);
      // 914400 / 9525 = 96 pixels
      expect(result.current.imageWidth).toBeCloseTo(96, 0);
    });

    it("converts imgH from EMU to pixels", () => {
      const imgHEmu = 457200; // 0.5 inch = 48 pixels at 96 DPI
      const oleData: OleReference = {
        resourceId: "rId1",
        imgH: imgHEmu,
      };

      const { result } = renderHook(() => useOlePreview(oleData));

      expect(result.current.imageHeight).toBe(imgHEmu / EMU_PER_PIXEL);
      // 457200 / 9525 = 48 pixels
      expect(result.current.imageHeight).toBeCloseTo(48, 0);
    });

    it("handles both imgW and imgH", () => {
      const oleData: OleReference = {
        resourceId: "rId1",
        imgW: 1828800, // 2 inches = 192 pixels
        imgH: 914400, // 1 inch = 96 pixels
      };

      const { result } = renderHook(() => useOlePreview(oleData));

      expect(result.current.imageWidth).toBeCloseTo(192, 0);
      expect(result.current.imageHeight).toBeCloseTo(96, 0);
    });

    it("returns undefined for imageWidth/imageHeight when not specified", () => {
      const oleData: OleReference = {
        resourceId: "rId1",
      };

      const { result } = renderHook(() => useOlePreview(oleData));

      expect(result.current.imageWidth).toBeUndefined();
      expect(result.current.imageHeight).toBeUndefined();
    });

    it("converts typical OLE preview dimensions", () => {
      // Typical Excel chart preview: 4 inches x 3 inches
      const oleData: OleReference = {
        resourceId: "rId1",
        imgW: 3657600, // 4 inches
        imgH: 2743200, // 3 inches
      };

      const { result } = renderHook(() => useOlePreview(oleData));

      // 4 * 96 = 384 pixels, 3 * 96 = 288 pixels
      expect(result.current.imageWidth).toBeCloseTo(384, 0);
      expect(result.current.imageHeight).toBeCloseTo(288, 0);
    });
  });
});
