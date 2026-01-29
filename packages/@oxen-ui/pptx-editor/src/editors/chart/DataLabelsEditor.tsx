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






export function DataLabelsEditor(props: DataLabelsEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreDataLabelsEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}






export function createDefaultDataLabels() {
  return createDefaultDataLabelsCore();
}
