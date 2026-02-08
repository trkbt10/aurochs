/**
 * @file Tests for usePdfImport
 */

// @vitest-environment jsdom

import { cleanup, renderHook, act, waitFor } from "@testing-library/react";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createEmptyResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import {
  PdfImportError,
  type PdfImportOptions,
  type PdfImportResult,
} from "@aurochs-converters/pdf-to-pptx/importer/pdf-importer";
import { usePdfImport } from "./usePdfImport";

type ImporterDeps = Parameters<typeof usePdfImport>[0];

function createDocumentFixture(): PresentationDocument {
  return {
    presentation: { slideSize: { width: px(1000), height: px(750) } },
    slides: [{ id: "slide-1", slide: { shapes: [] } }],
    slideWidth: px(1000),
    slideHeight: px(750),
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: createEmptyResourceResolver(),
  };
}

function createImportResultFixture(document: PresentationDocument): PdfImportResult {
  return {
    document,
    pageCount: 1,
    pageStats: [{ pageNumber: 1, shapeCount: 0, pathCount: 0, textCount: 0, imageCount: 0 }],
  };
}

describe("usePdfImport", () => {
  const importPdfFromFileCalls: Array<readonly [File, PdfImportOptions | undefined]> = [];
  const importPdfFromUrlCalls: Array<readonly [string, PdfImportOptions | undefined]> = [];

  let importPdfFromFileBehavior: ((file: File, options?: PdfImportOptions) => Promise<PdfImportResult>) | undefined;
  let importPdfFromUrlBehavior: ((url: string, options?: PdfImportOptions) => Promise<PdfImportResult>) | undefined;

  const deps: ImporterDeps = {
    importPdfFromFile: async (file, options) => {
      importPdfFromFileCalls.push([file, options]);
      if (!importPdfFromFileBehavior) {
        throw new Error("importPdfFromFile not configured");
      }
      return importPdfFromFileBehavior(file, options);
    },
    importPdfFromUrl: async (url, options) => {
      importPdfFromUrlCalls.push([url, options]);
      if (!importPdfFromUrlBehavior) {
        throw new Error("importPdfFromUrl not configured");
      }
      return importPdfFromUrlBehavior(url, options);
    },
    PdfImportError,
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    importPdfFromFileCalls.length = 0;
    importPdfFromUrlCalls.length = 0;
    importPdfFromFileBehavior = async () => {
      throw new Error("importPdfFromFile not configured");
    };
    importPdfFromUrlBehavior = async () => {
      throw new Error("importPdfFromUrl not configured");
    };
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => usePdfImport(deps));

    expect(result.current.state).toEqual({
      status: "idle",
      result: null,
      error: null,
      progress: null,
    });
  });

  it("imports from file successfully", async () => {
    const document = createDocumentFixture();
    const importerResult = createImportResultFixture(document);
    importPdfFromFileBehavior = async () => importerResult;

    const { result } = renderHook(() => usePdfImport(deps));
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });

    let promise: Promise<PresentationDocument | null> | undefined;
    act(() => {
      promise = result.current.importFromFile(file);
    });

    expect(result.current.state.status).toBe("loading");
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.result).toBeNull();

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state.result).toBe(importerResult);
    expect(importPdfFromFileCalls).toContainEqual([file, undefined]);
    await expect(promise).resolves.toBe(document);
  });

  it("imports from url successfully", async () => {
    const document = createDocumentFixture();
    const importerResult = createImportResultFixture(document);
    importPdfFromUrlBehavior = async () => importerResult;

    const { result } = renderHook(() => usePdfImport(deps));

    let promise: Promise<PresentationDocument | null> | undefined;
    act(() => {
      promise = result.current.importFromUrl("https://example.com/test.pdf");
    });

    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state.result).toBe(importerResult);
    expect(importPdfFromUrlCalls).toContainEqual(["https://example.com/test.pdf", undefined]);
    await expect(promise).resolves.toBe(document);
  });

  it("sets error state for file import failures", async () => {
    importPdfFromFileBehavior = async () => {
      throw new Error("boom");
    };

    const { result } = renderHook(() => usePdfImport(deps));
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });

    act(() => {
      void result.current.importFromFile(file);
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeInstanceOf(PdfImportError);
    expect(result.current.state.error?.code).toBe("PARSE_ERROR");
  });

  it("sets error state for url import failures", async () => {
    importPdfFromUrlBehavior = async () => {
      throw new Error("boom");
    };

    const { result } = renderHook(() => usePdfImport(deps));

    act(() => {
      void result.current.importFromUrl("https://example.com/test.pdf");
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeInstanceOf(PdfImportError);
    expect(result.current.state.error?.code).toBe("FETCH_ERROR");
  });

  it("resets state", async () => {
    importPdfFromFileBehavior = async () => {
      throw new PdfImportError("invalid", "INVALID_PDF");
    };

    const { result } = renderHook(() => usePdfImport(deps));
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });

    act(() => {
      void result.current.importFromFile(file);
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeNull();
  });
});
