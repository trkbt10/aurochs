/**
 * @file Types for React text measurement
 */

import type {
  Paragraph,
  RunProperties,
  TextRun,
  BulletStyle,
  TabStop,
} from "../../../domain/text";
import type { Pixels } from "../../../domain/types";

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
