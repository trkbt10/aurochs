/** @file React component for rendering a single PDF page. */
import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { PdfPage } from "@aurochs/pdf/domain";
import { renderPdfPageToSvg } from "../svg";
import type { PdfSvgRenderOptions } from "../types";

export type PdfPageRendererProps = Readonly<{
  readonly page: PdfPage;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly renderOptions?: PdfSvgRenderOptions;
}>;

/** React wrapper that renders a single PDF page as inline SVG. */
export function PdfPageRenderer(props: PdfPageRendererProps) {
  const { page, className, style, renderOptions } = props;

  const svgMarkup = useMemo(() => {
    return renderPdfPageToSvg(page, renderOptions);
  }, [page, renderOptions]);

  return (
    <div
      className={className}
      style={style}
      data-aurochs-pdf-page={page.pageNumber}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
