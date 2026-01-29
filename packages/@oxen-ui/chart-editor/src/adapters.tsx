/**
 * @file Chart editor adapter injection
 *
 * Allows container-specific editors (PPTX/DOCX/XLSX) to override:
 * - TextBody editing UI
 * - ChartShapeProperties editing UI
 *
 * The chart-editor package itself stays container-agnostic.
 */

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { ChartShapeProperties } from "@oxen-office/chart/domain";
import type { TextBody } from "@oxen-office/chart/domain/text";
import type { EditorProps } from "@oxen-ui/ui-components/types";

export type AdapterEditorProps<T> = EditorProps<T> & {
  readonly style?: CSSProperties;
};

export type ChartEditorAdapters = {
  readonly textBody?: {
    readonly renderEditor: (props: AdapterEditorProps<TextBody>) => ReactNode;
  };
  readonly shapeProperties?: {
    readonly renderEditor: (props: AdapterEditorProps<ChartShapeProperties | undefined>) => ReactNode;
  };
};

const ChartEditorAdaptersContext = createContext<ChartEditorAdapters | undefined>(undefined);

export type ChartEditorAdaptersProviderProps = {
  readonly adapters: ChartEditorAdapters | undefined;
  readonly children: ReactNode;
};

export function ChartEditorAdaptersProvider({ adapters, children }: ChartEditorAdaptersProviderProps) {
  return <ChartEditorAdaptersContext.Provider value={adapters}>{children}</ChartEditorAdaptersContext.Provider>;
}

export function useChartEditorAdapters(): ChartEditorAdapters | undefined {
  return useContext(ChartEditorAdaptersContext);
}

export type ChartEditorAdaptersBoundaryProps = {
  readonly adapters?: ChartEditorAdapters;
  readonly children: ReactNode;
};

export function ChartEditorAdaptersBoundary({ adapters, children }: ChartEditorAdaptersBoundaryProps) {
  const inherited = useChartEditorAdapters();
  return <ChartEditorAdaptersProvider adapters={adapters ?? inherited}>{children}</ChartEditorAdaptersProvider>;
}
