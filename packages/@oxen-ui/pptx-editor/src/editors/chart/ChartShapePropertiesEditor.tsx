/**
 * @file ChartShapePropertiesEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { ChartShapeProperties } from "@oxen-office/chart/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  ChartShapePropertiesEditor as CoreChartShapePropertiesEditor,
  createDefaultChartShapeProperties as createDefaultChartShapePropertiesCore,
} from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type ChartShapePropertiesEditorProps = EditorProps<ChartShapeProperties | undefined> & {
  readonly style?: CSSProperties;
};

export function ChartShapePropertiesEditor(props: ChartShapePropertiesEditorProps) {
  return <CoreChartShapePropertiesEditor {...props} adapters={pptxChartEditorAdapters} />;
}

export function createDefaultChartShapeProperties() {
  return createDefaultChartShapePropertiesCore();
}
