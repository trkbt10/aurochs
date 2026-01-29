/**
 * @file LegendEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import {
  LegendEditor as CoreLegendEditor,
  ChartEditorAdaptersBoundary,
  createDefaultLegend as createDefaultLegendCore,
} from "@oxen-ui/chart-editor";
import type { LegendEditorProps as CoreLegendEditorProps } from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type LegendEditorProps = CoreLegendEditorProps;

export function LegendEditor(props: LegendEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreLegendEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}

export function createDefaultLegend() {
  return createDefaultLegendCore();
}
