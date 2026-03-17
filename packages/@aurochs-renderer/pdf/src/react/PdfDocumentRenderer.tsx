/** @file React component for rendering a full PDF document. */
import type { CSSProperties } from "react";
import type { PdfDocument, PdfPage } from "@aurochs/pdf/domain";
import type { PdfSvgRenderOptions } from "../types";
import { PdfPageRenderer } from "./PdfPageRenderer";

export type PdfDocumentRendererProps = Readonly<{
  readonly document: PdfDocument;
  readonly pageNumbers?: readonly number[];
  readonly className?: string;
  readonly pageClassName?: string;
  readonly style?: CSSProperties;
  readonly pageStyle?: CSSProperties;
  readonly renderOptions?: PdfSvgRenderOptions;
}>;

function selectPages(document: PdfDocument, pageNumbers: readonly number[] | undefined): readonly PdfPage[] {
  if (pageNumbers === undefined || pageNumbers.length === 0) {
    return document.pages;
  }

  const targetPages = new Set(pageNumbers);
  return document.pages.filter((page) => targetPages.has(page.pageNumber));
}

/** React wrapper that renders multiple PDF pages as stacked inline SVG. */
export function PdfDocumentRenderer(props: PdfDocumentRendererProps) {
  const { document, pageNumbers, className, pageClassName, style, pageStyle, renderOptions } = props;
  const pages = selectPages(document, pageNumbers);

  return (
    <div className={className} style={style}>
      {pages.map((page) => (
        <PdfPageRenderer
          key={page.pageNumber}
          page={page}
          className={pageClassName}
          style={pageStyle}
          renderOptions={renderOptions}
        />
      ))}
    </div>
  );
}
