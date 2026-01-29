/**
 * @file ChartTitleEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { ChartTitle } from "@oxen-office/chart/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  ChartTitleEditor as CoreChartTitleEditor,
  createDefaultChartTitle as createDefaultChartTitleCore,
} from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type ChartTitleEditorProps = EditorProps<ChartTitle | undefined> & {
  readonly style?: CSSProperties;
};






export function ChartTitleEditor(props: ChartTitleEditorProps) {
  return <CoreChartTitleEditor {...props} adapters={pptxChartEditorAdapters} />;
}






export function createDefaultChartTitle() {
  return createDefaultChartTitleCore();
}
