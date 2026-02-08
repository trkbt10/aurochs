/**
 * @file LayoutShapeResult abstraction for Diagram layout engines
 *
 * Diagram layout engines should output format-agnostic shape descriptions.
 * Format-specific layers (e.g. PPTX) are responsible for converting these
 * results into concrete shapes (such as PPTX SpShape).
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { Effects } from "@aurochs-office/drawing-ml/domain/effects";

export type PresetShapeType = string;

export type AdjustValue = {
  readonly name: string;
  readonly value: number;
};

export type LayoutTransform = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly flipHorizontal?: boolean;
  readonly flipVertical?: boolean;
};

export type PresetGeometry = {
  readonly type: "preset";
  readonly preset: PresetShapeType;
  readonly adjustValues: readonly AdjustValue[];
};

export type LayoutShapeResult = {
  readonly id: string;
  readonly name: string;
  /** Diagram modelId when available (links to dgm:pt modelId). */
  readonly modelId?: string;
  readonly transform: LayoutTransform;
  readonly geometry?: PresetGeometry;
  readonly fill?: BaseFill;
  readonly line?: BaseLine;
  readonly effects?: Effects;
  /** Optional style to apply to text runs when adapter understands the text payload. */
  readonly textFill?: BaseFill;
  /** Optional outline style for text runs when adapter understands the text payload. */
  readonly textLine?: BaseLine;
  /** Optional rich text payload; format adapters decide how to interpret it. */
  readonly textBody?: unknown;
};
