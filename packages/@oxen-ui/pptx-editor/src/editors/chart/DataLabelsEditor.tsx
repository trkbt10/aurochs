/**
 * @file DataLabelsEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import {
  DataLabelsEditor as CoreDataLabelsEditor,
  ChartEditorAdaptersBoundary,
  createDefaultDataLabels as createDefaultDataLabelsCore,
} from "@oxen-ui/chart-editor";
import type { DataLabelsEditorProps as CoreDataLabelsEditorProps } from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type DataLabelsEditorProps = CoreDataLabelsEditorProps;


























/** PPTX chart data labels editor component */
export function DataLabelsEditor(props: DataLabelsEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreDataLabelsEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}


























/** Create default data labels configuration */
export function createDefaultDataLabels() {
  return createDefaultDataLabelsCore();
}
