// @vitest-environment jsdom

import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { px } from "@lib/ooxml/domain/units";
import { createEmptyResourceResolver } from "@lib/pptx/domain/resource-resolver";
import type { PresentationDocument } from "@lib/pptx/app";
import type { PdfImportOptions, PdfImportResult } from "@lib/pdf/importer/pdf-importer";
import { FileUploadPage } from "./FileUploadPage";

vi.mock("@lib/pdf/importer/pdf-importer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/pdf/importer/pdf-importer")>();
  return {
    ...actual,
    importPdfFromFile: vi.fn(),
  };
});

import { PdfImportError, importPdfFromFile } from "@lib/pdf/importer/pdf-importer";

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

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>("input[type='file']");
  if (!input) {
    throw new Error("file input not found");
  }
  return input;
}

function getUploadZone(container: HTMLElement): HTMLElement {
  const zone = container.querySelector<HTMLElement>(".upload-zone");
  if (!zone) {
    throw new Error("upload zone not found");
  }
  return zone;
}

describe("FileUploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts PPTX via file input", () => {
    const onFileSelect = vi.fn();
    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenCalledWith({ type: "pptx", file });
  });

  it("accepts PDF via file input and imports it", async () => {
    const importPdfFromFileMock = vi.mocked(importPdfFromFile);

    const onFileSelect = vi.fn();
    const document = createDocumentFixture();
    importPdfFromFileMock.mockResolvedValueOnce(createImportResultFixture(document));

    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(onFileSelect).toHaveBeenCalledTimes(1));
    expect(onFileSelect).toHaveBeenCalledWith({ type: "pdf", document, fileName: "test.pdf" });
    expect(importPdfFromFileMock).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        setWhiteBackground: true,
      } satisfies Partial<PdfImportOptions>),
    );
  });

  it("accepts PDF via drag & drop and imports it", async () => {
    const importPdfFromFileMock = vi.mocked(importPdfFromFile);

    const onFileSelect = vi.fn();
    const document = createDocumentFixture();
    importPdfFromFileMock.mockResolvedValueOnce(createImportResultFixture(document));

    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.drop(getUploadZone(container), { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onFileSelect).toHaveBeenCalledTimes(1));
    expect(onFileSelect).toHaveBeenCalledWith({ type: "pdf", document, fileName: "test.pdf" });
  });

  it("rejects invalid files", () => {
    const importPdfFromFileMock = vi.mocked(importPdfFromFile);

    const onFileSelect = vi.fn();
    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.txt", { type: "text/plain" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.drop(getUploadZone(container), { dataTransfer: { files: [file] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(importPdfFromFileMock).not.toHaveBeenCalled();
  });

  it("renders user-friendly errors for PDF import failures", async () => {
    const importPdfFromFileMock = vi.mocked(importPdfFromFile);
    importPdfFromFileMock.mockRejectedValueOnce(new PdfImportError("no pdf header", "INVALID_PDF"));

    const onFileSelect = vi.fn();
    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(await screen.findByText("The file is not a valid PDF.")).toBeTruthy();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it("shows PDF import progress while importing", async () => {
    const importPdfFromFileMock = vi.mocked(importPdfFromFile);

    const onFileSelect = vi.fn();
    const document = createDocumentFixture();

    let resolvePromise: ((value: PdfImportResult) => void) | undefined;
    const promise = new Promise<PdfImportResult>((resolve) => {
      resolvePromise = resolve;
    });

    importPdfFromFileMock.mockImplementationOnce(async (_file: File, options?: PdfImportOptions) => {
      options?.onProgress?.({ currentPage: 1, totalPages: 3 });
      options?.onProgress?.({ currentPage: 2, totalPages: 3 });
      return promise;
    });

    const { container } = render(<FileUploadPage onFileSelect={onFileSelect} onDemoLoad={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(await screen.findByText("Page 2 of 3")).toBeTruthy();

    resolvePromise?.(createImportResultFixture(document));

    await waitFor(() => expect(onFileSelect).toHaveBeenCalledTimes(1));
    expect(onFileSelect).toHaveBeenCalledWith({ type: "pdf", document, fileName: "test.pdf" });
  });
});
