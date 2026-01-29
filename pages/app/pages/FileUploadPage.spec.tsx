// @vitest-environment jsdom

import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { px } from "@oxen-office/ooxml/domain/units";
import { createEmptyResourceResolver } from "@oxen-office/pptx/domain/resource-resolver";
import type { PresentationDocument } from "@oxen-office/pptx/app";
import { PdfImportError, type PdfImportOptions, type PdfImportResult } from "@oxen-office/pdf-to-pptx/importer/pdf-importer";
import { FileUploadPage } from "./FileUploadPage";

type FileUploadPageProps = ComponentProps<typeof FileUploadPage>;
type OnFileSelectArg = Parameters<FileUploadPageProps["onFileSelect"]>[0];

type CallTracker<TArgs extends readonly unknown[]> = {
  readonly calls: readonly TArgs[];
  readonly fn: (...args: TArgs) => void;
};

function createCallTracker<TArgs extends readonly unknown[]>(): CallTracker<TArgs> {
  const calls: TArgs[] = [];
  return {
    calls,
    fn: (...args) => {
      calls.push(args);
    },
  };
}

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
  it("accepts PPTX via file input", () => {
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const { container } = render(<FileUploadPage onFileSelect={onFileSelect.fn} onDemoLoad={() => {}} />);

    const file = new File([new Uint8Array([1, 2, 3])], "test.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(onFileSelect.calls.length).toBe(1);
    expect(onFileSelect.calls[0]?.[0]).toEqual({ type: "pptx", file });
  });

  it("accepts PDF via file input and imports it", async () => {
    const importPdfCalls = createCallTracker<[File, PdfImportOptions | undefined]>();
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const document = createDocumentFixture();
    const importPdfFromFileFn = async (...args: [File, PdfImportOptions | undefined]) => {
      importPdfCalls.fn(...args);
      return createImportResultFixture(document);
    };

    const { container } = render(
      <FileUploadPage
        onFileSelect={onFileSelect.fn}
        onDemoLoad={() => {}}
        importPdfFromFileFn={importPdfFromFileFn}
      />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(onFileSelect.calls.length).toBe(1));
    expect(onFileSelect.calls[0]?.[0]).toEqual({ type: "pdf", document, fileName: "test.pdf" });
    expect(importPdfCalls.calls.length).toBe(1);
    expect(importPdfCalls.calls[0]?.[0]).toBe(file);
    expect(importPdfCalls.calls[0]?.[1]?.setWhiteBackground).toBe(true);
  });

  it("accepts PDF via drag & drop and imports it", async () => {
    const importPdfCalls = createCallTracker<[File, PdfImportOptions | undefined]>();
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const document = createDocumentFixture();
    const importPdfFromFileFn = async (...args: [File, PdfImportOptions | undefined]) => {
      importPdfCalls.fn(...args);
      return createImportResultFixture(document);
    };

    const { container } = render(
      <FileUploadPage
        onFileSelect={onFileSelect.fn}
        onDemoLoad={() => {}}
        importPdfFromFileFn={importPdfFromFileFn}
      />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.drop(getUploadZone(container), { dataTransfer: { files: [file] } });

    await waitFor(() => expect(onFileSelect.calls.length).toBe(1));
    expect(onFileSelect.calls[0]?.[0]).toEqual({ type: "pdf", document, fileName: "test.pdf" });
    expect(importPdfCalls.calls.length).toBe(1);
  });

  it("rejects invalid files", () => {
    const importPdfCalls = createCallTracker<[File, PdfImportOptions | undefined]>();
    const importPdfFromFileFn = async (...args: [File, PdfImportOptions | undefined]) => {
      importPdfCalls.fn(...args);
      throw new Error("unexpected");
    };
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const { container } = render(
      <FileUploadPage
        onFileSelect={onFileSelect.fn}
        onDemoLoad={() => {}}
        importPdfFromFileFn={importPdfFromFileFn}
      />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "test.txt", { type: "text/plain" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.drop(getUploadZone(container), { dataTransfer: { files: [file] } });

    expect(onFileSelect.calls.length).toBe(0);
    expect(importPdfCalls.calls.length).toBe(0);
  });

  it("renders user-friendly errors for PDF import failures", async () => {
    const importPdfFromFileFn = async (): Promise<PdfImportResult> => {
      throw new PdfImportError("no pdf header", "INVALID_PDF");
    };
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const { container } = render(
      <FileUploadPage
        onFileSelect={onFileSelect.fn}
        onDemoLoad={() => {}}
        importPdfFromFileFn={importPdfFromFileFn}
      />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(await screen.findByText("The file is not a valid PDF.")).toBeTruthy();
    expect(onFileSelect.calls.length).toBe(0);
  });

  it("shows PDF import progress while importing", async () => {
    const importPdfCalls = createCallTracker<[File, PdfImportOptions | undefined]>();
    const onFileSelect = createCallTracker<[OnFileSelectArg]>();
    const document = createDocumentFixture();

    let resolvePromise: ((value: PdfImportResult) => void) | undefined;
    const promise = new Promise<PdfImportResult>((resolve) => {
      resolvePromise = resolve;
    });

    const importPdfFromFileFn = async (...args: [File, PdfImportOptions | undefined]) => {
      importPdfCalls.fn(...args);
      const [_file, options] = args;
      options?.onProgress?.({ currentPage: 1, totalPages: 3 });
      options?.onProgress?.({ currentPage: 2, totalPages: 3 });
      return promise;
    };

    const { container } = render(
      <FileUploadPage
        onFileSelect={onFileSelect.fn}
        onDemoLoad={() => {}}
        importPdfFromFileFn={importPdfFromFileFn}
      />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(await screen.findByText("Page 2 of 3")).toBeTruthy();

    resolvePromise?.(createImportResultFixture(document));

    await waitFor(() => expect(onFileSelect.calls.length).toBe(1));
    expect(onFileSelect.calls[0]?.[0]).toEqual({ type: "pdf", document, fileName: "test.pdf" });
    expect(importPdfCalls.calls.length).toBe(1);
  });
});
