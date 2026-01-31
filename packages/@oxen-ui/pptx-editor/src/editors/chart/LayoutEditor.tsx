/**
 * @file LayoutEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import {
  LayoutEditor as CoreLayoutEditor,
  ChartEditorAdaptersBoundary,
  createDefaultLayout as createDefaultLayoutCore,
} from "@oxen-ui/chart-editor";
import type { LayoutEditorProps as CoreLayoutEditorProps } from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type LayoutEditorProps = CoreLayoutEditorProps;


























/** PPTX chart layout editor component */
export function LayoutEditor(props: LayoutEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreLayoutEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}


























/** Create default layout configuration */
export function createDefaultLayout() {
  return createDefaultLayoutCore();
}
