/** @file Type definitions for chart rendering */
import type { BaseFill } from "@oxen-office/drawing-ml/domain/fill";
import type { Color } from "@oxen-office/drawing-ml/domain/color";
import type { Points } from "@oxen-office/drawing-ml/domain/units";
import type { RenderWarning, WarningCollector } from "@oxen-office/ooxml";

export type { RenderWarning, WarningCollector };

export type GenericRunProperties = {
  readonly fontSize?: Points;
  readonly fontFamily?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly color?: Color;
};

export type GenericTextRun =
  | { readonly type: "text"; readonly text: string; readonly properties?: GenericRunProperties }
  | { readonly type: "break"; readonly properties?: GenericRunProperties }
  | {
      readonly type: "field";
      readonly fieldType: string;
      readonly id: string;
      readonly text: string;
      readonly properties?: GenericRunProperties;
    };

export type GenericParagraphProperties = {
  readonly alignment?: string;
  readonly defaultRunProperties?: GenericRunProperties;
};

export type GenericParagraph = {
  readonly properties: GenericParagraphProperties;
  readonly runs: readonly GenericTextRun[];
  readonly endProperties?: GenericRunProperties;
};

export type GenericTextBody = {
  readonly bodyProperties: object;
  readonly paragraphs: readonly GenericParagraph[];
};

export type ResolvedColor = {
  readonly hex: string;
  readonly alpha: number;
};

export type ResolvedGradientStop = {
  readonly color: ResolvedColor;
  readonly position: number;
};

export type ResolvedFill =
  | { readonly type: "none" }
  | { readonly type: "solid"; readonly color: ResolvedColor }
  | {
      readonly type: "gradient";
      readonly stops: readonly ResolvedGradientStop[];
      readonly angle: number;
      readonly isRadial: boolean;
      readonly radialCenter?: { cx: number; cy: number };
    }
  | { readonly type: "pattern"; readonly preset: string }
  | { readonly type: "unresolved"; readonly originalType?: string };

export type FillResolver = {
  resolve(fill: BaseFill): ResolvedFill;
};

export type ResolvedTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
};

export type ChartRenderContext = {
  getSeriesColor(index: number, explicit?: BaseFill): string;
  getAxisColor(): string;
  getGridlineColor(): string;
  getTextStyle(textBody?: GenericTextBody): ResolvedTextStyle;
  warnings: WarningCollector;
};
