/**
 * @file SVG inner HTML wrapper component
 *
 * Wraps SVG string content for injection via dangerouslySetInnerHTML.
 * Used for rendering chart, table, and diagram content that is generated
 * as SVG strings by the core renderers.
 */

import { memo } from "react";

/**
 * Props for SvgInnerHtml component
 */
export type SvgInnerHtmlProps = {
  readonly html: string;
};

/**
 * Renders SVG string content within a group element.
 *
 * This component is used to inject pre-rendered SVG content (from
 * renderChart, renderTableSvg, renderDiagramShapesSvg) into the React tree.
 */
export const SvgInnerHtml = memo(function SvgInnerHtml({ html }: SvgInnerHtmlProps) {
  return <g dangerouslySetInnerHTML={{ __html: html }} />;
});
