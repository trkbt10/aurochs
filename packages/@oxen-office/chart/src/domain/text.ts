/**
 * @file Minimal DrawingML text types for ChartML
 *
 * ChartML uses DrawingML rich text (c:tx / c:txPr / a:rich) for titles,
 * labels, legends, and other chart text elements.
 *
 * This package intentionally models only the subset required for chart parsing
 * and editing. Extra properties used by PPTX shapes (3D text, hyperlinks, etc.)
 * can still flow through via structural typing when provided by other layers.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 - Text
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { Color } from "@oxen-office/ooxml/domain/color";
import type { Points } from "@oxen-office/ooxml/domain/units";

export type TextAlign =
  | "left"
  | "center"
  | "right"
  | "justify"
  | "justifyLow"
  | "distributed"
  | "thaiDistributed";

export type RunProperties = {
  readonly fontSize?: Points;
  readonly fontFamily?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly color?: Color;
};

export type RegularRun = {
  readonly type: "text";
  readonly text: string;
  readonly properties?: RunProperties;
};

export type LineBreakRun = {
  readonly type: "break";
  readonly properties?: RunProperties;
};

export type FieldRun = {
  readonly type: "field";
  readonly fieldType: string;
  readonly id: string;
  readonly text: string;
  readonly properties?: RunProperties;
};

export type TextRun = RegularRun | LineBreakRun | FieldRun;

export type ParagraphProperties = {
  readonly alignment?: TextAlign;
  readonly defaultRunProperties?: RunProperties;
};

export type Paragraph = {
  readonly properties: ParagraphProperties;
  readonly runs: readonly TextRun[];
  readonly endProperties?: RunProperties;
};

export type TextBody = {
  readonly bodyProperties: object;
  readonly paragraphs: readonly Paragraph[];
};

