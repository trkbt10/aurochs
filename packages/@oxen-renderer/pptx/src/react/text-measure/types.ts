/**
 * @file Types for React text measurement
 */

import type {
  Paragraph,
  RunProperties,
  TextRun,
  BulletStyle,
  TabStop,
} from "@oxen-office/pptx/domain/text";
import type { Pixels } from "@oxen-office/ooxml/domain/units";

export type TextMeasureRun = {
  readonly run: TextRun;
  readonly properties: RunProperties;
  readonly text: string;
  readonly isBreak: boolean;
};

export type TextMeasureRunResult = TextMeasureRun & {
  readonly width: Pixels;
};

export type TextMeasureParagraph = {
  readonly paragraph: Paragraph;
  readonly runs: readonly TextMeasureRun[];
  readonly bulletStyle?: BulletStyle;
  readonly defaultTabSize?: Pixels;
  readonly tabStops?: readonly TabStop[];
};

export type TextMeasureParagraphResult = {
  readonly runs: readonly TextMeasureRunResult[];
  readonly bulletWidth?: Pixels;
};

export type ParagraphMeasurer = (paragraph: TextMeasureParagraph) => TextMeasureParagraphResult;
