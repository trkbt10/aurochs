/**
 * @file AxisEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { Axis } from "@oxen-office/chart/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  AxisEditor as CoreAxisEditor,
  createDefaultAxis as createDefaultAxisCore,
  createDefaultCategoryAxis as createDefaultCategoryAxisCore,
  createDefaultValueAxis as createDefaultValueAxisCore,
} from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type AxisEditorProps = EditorProps<Axis> & {
  readonly style?: CSSProperties;
};


























/** PPTX chart axis editor component */
export function AxisEditor(props: AxisEditorProps) {
  return <CoreAxisEditor {...props} adapters={pptxChartEditorAdapters} />;
}


























/** Create default axis configuration */
export function createDefaultAxis() {
  return createDefaultAxisCore();
}


























/** Create default category axis configuration */
export function createDefaultCategoryAxis() {
  return createDefaultCategoryAxisCore();
}


























/** Create default value axis configuration */
export function createDefaultValueAxis() {
  return createDefaultValueAxisCore();
}
