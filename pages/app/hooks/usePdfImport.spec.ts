import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { px } from "@oxen/ooxml/domain/units";
import { createEmptyResourceResolver } from "@oxen/pptx/domain/resource-resolver";
import type { PresentationDocument } from "@oxen/pptx/app";
import type { PdfImportOptions, PdfImportResult } from "@oxen/pdf/importer/pdf-importer";

const importPdfFromFileMock = mock(async () => {
  throw new Error("importPdfFromFileMock not configured");
});

const importPdfFromUrlMock = mock(async () => {
  throw new Error("importPdfFromUrlMock not configured");
});

mock.module("@oxen/pdf/importer/pdf-importer", () => {
  class PdfImportError extends Error {
    constructor(
      message: string,
      public readonly code:
        | "INVALID_PDF"
        | "ENCRYPTED_PDF"
        | "PARSE_ERROR"
        | "CONVERSION_ERROR"
        | "FETCH_ERROR",
      public readonly cause?: Error,
    ) {
      super(message);
      this.name = "PdfImportError";
    }
  }

  return {
    PdfImportError,
    importPdfFromFile: importPdfFromFileMock,
    importPdfFromUrl: importPdfFromUrlMock,
  };
});

import { PdfImportError } from "@oxen/pdf/importer/pdf-importer";
import { usePdfImport } from "./usePdfImport";

let cleanup: (() => void) | undefined;
let renderHook: typeof import("@testing-library/react").renderHook;
let act: typeof import("@testing-library/react").act;
let waitFor: typeof import("@testing-library/react").waitFor;

let dom: JSDOM | undefined;

beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });

  const defineGlobal = <K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };

  defineGlobal("window", dom.window as unknown as typeof globalThis.window);
  defineGlobal("document", dom.window.document);
  defineGlobal("navigator", dom.window.navigator);
  defineGlobal("HTMLElement", dom.window.HTMLElement);
  defineGlobal("SVGElement", dom.window.SVGElement);
  defineGlobal("Node", dom.window.Node);
  defineGlobal("File", dom.window.File);
  defineGlobal("Blob", dom.window.Blob);
  defineGlobal("Event", dom.window.Event);
  defineGlobal("MouseEvent", dom.window.MouseEvent);
  defineGlobal("KeyboardEvent", dom.window.KeyboardEvent);
  defineGlobal("getComputedStyle", dom.window.getComputedStyle);

  const rtl = await import("@testing-library/react/pure");
  cleanup = rtl.cleanup;
  renderHook = rtl.renderHook;
  act = rtl.act;
  waitFor = rtl.waitFor;
});

afterEach(() => {
  cleanup?.();
});

afterAll(() => {
  dom?.window.close();
});

beforeEach(() => {
  importPdfFromFileMock.mockReset();
  importPdfFromUrlMock.mockReset();

  importPdfFromFileMock.mockRejectedValue(new Error("importPdfFromFileMock not configured"));
  importPdfFromUrlMock.mockRejectedValue(new Error("importPdfFromUrlMock not configured"));
});

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
  it("initializes with idle state", () => {
    const { result } = renderHook(() => usePdfImport());

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
    importPdfFromFileMock.mockResolvedValueOnce(importerResult);

    const { result } = renderHook(() => usePdfImport());
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
    expect(importPdfFromFileMock).toHaveBeenCalledWith(file, undefined);
    await expect(promise).resolves.toBe(document);
  });

  it("imports from url successfully", async () => {
    const document = createDocumentFixture();
    const importerResult = createImportResultFixture(document);
    importPdfFromUrlMock.mockResolvedValueOnce(importerResult);

    const { result } = renderHook(() => usePdfImport());

    let promise: Promise<PresentationDocument | null> | undefined;
    act(() => {
      promise = result.current.importFromUrl("https://example.com/test.pdf");
    });

    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state.result).toBe(importerResult);
    expect(importPdfFromUrlMock).toHaveBeenCalledWith("https://example.com/test.pdf", undefined);
    await expect(promise).resolves.toBe(document);
  });

  it("sets error state for file import failures", async () => {
    importPdfFromFileMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => usePdfImport());
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
    importPdfFromUrlMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => usePdfImport());

    act(() => {
      void result.current.importFromUrl("https://example.com/test.pdf");
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeInstanceOf(PdfImportError);
    expect(result.current.state.error?.code).toBe("FETCH_ERROR");
  });

  it("resets state", async () => {
    importPdfFromFileMock.mockRejectedValueOnce(new PdfImportError("invalid", "INVALID_PDF"));

    const { result } = renderHook(() => usePdfImport());
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });

    act(() => {
      void result.current.importFromFile(file);
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      status: "idle",
      result: null,
      error: null,
      progress: null,
    });
  });

  it("passes options through to importer", async () => {
    const document = createDocumentFixture();
    const importerResult = createImportResultFixture(document);
    importPdfFromFileMock.mockResolvedValue(importerResult);
    importPdfFromUrlMock.mockResolvedValue(importerResult);

    const options: PdfImportOptions = {
      pages: [1, 2, 3],
      fit: "stretch",
      setWhiteBackground: false,
      addPageNumbers: true,
    };

    const { result } = renderHook(() => usePdfImport());
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });

    act(() => {
      void result.current.importFromFile(file, options);
    });
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(importPdfFromFileMock).toHaveBeenCalledWith(file, options);

    act(() => {
      void result.current.importFromUrl("https://example.com/test.pdf", options);
    });
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(importPdfFromUrlMock).toHaveBeenCalledWith("https://example.com/test.pdf", options);
  });
});
