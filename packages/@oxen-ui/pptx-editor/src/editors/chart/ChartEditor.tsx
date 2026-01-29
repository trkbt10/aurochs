/**
 * @file ChartEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { Chart } from "@oxen-office/chart/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  ChartEditor as CoreChartEditor,
  createDefaultChart as createDefaultChartCore,
  createDefaultView3D as createDefaultView3DCore,
  createDefaultChartSurface as createDefaultChartSurfaceCore,
  createDefaultDataTable as createDefaultDataTableCore,
  createDefaultChartProtection as createDefaultChartProtectionCore,
  createDefaultPrintSettings as createDefaultPrintSettingsCore,
} from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type ChartEditorProps = EditorProps<Chart> & {
  readonly style?: CSSProperties;
};

export function ChartEditor(props: ChartEditorProps) {
  return <CoreChartEditor {...props} adapters={pptxChartEditorAdapters} />;
}

export function createDefaultChart() {
  return createDefaultChartCore();
}

export function createDefaultView3D() {
  return createDefaultView3DCore();
}

export function createDefaultChartSurface() {
  return createDefaultChartSurfaceCore();
}

export function createDefaultDataTable() {
  return createDefaultDataTableCore();
}

export function createDefaultChartProtection() {
  return createDefaultChartProtectionCore();
}

export function createDefaultPrintSettings() {
  return createDefaultPrintSettingsCore();
}
