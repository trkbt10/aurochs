/**
 * @file Diagram renderer shared types
 */

export type RenderWarning = {
  readonly type: "unsupported" | "fallback" | "error";
  readonly message: string;
  readonly element?: string;
  readonly details?: string;
};

export type WarningCollector = {
  readonly add: (warning: RenderWarning) => void;
  readonly getAll: () => readonly RenderWarning[];
  readonly hasErrors: () => boolean;
};

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
