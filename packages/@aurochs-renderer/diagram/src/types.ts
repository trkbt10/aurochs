/**
 * @file Diagram renderer shared types
 */

import type { RenderWarning, WarningCollector } from "@aurochs-office/ooxml";

export type { RenderWarning, WarningCollector };

export type DiagramContent<TShape> = {
  readonly shapes: readonly TShape[];
};

export type ShapeRenderer<TShape, TOut> = (shape: TShape) => TOut;

export type ResourceEntry<TParsed> = {
  readonly parsed?: TParsed;
};

export type DiagramRenderContext<TShape, TOut> = {
  readonly renderShape: ShapeRenderer<TShape, TOut>;
  readonly getResource: <TParsed>(resourceId: string) => ResourceEntry<TParsed> | undefined;
  readonly warnings: WarningCollector;
};
