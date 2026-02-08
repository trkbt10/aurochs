/**
 * @file Diagram editor adapter types
 *
 * Keeps this package format-agnostic by injecting format-specific editors for
 * point `textBody` / `shapeProperties`.
 */

import type { ReactNode } from "react";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type DiagramTextBodyAdapter<TTextBody> = {
  readonly isTextBody: (value: unknown) => value is TTextBody;
  readonly renderEditor: (props: EditorProps<TTextBody>) => ReactNode;
};

export type DiagramShapePropertiesAdapter<TShapeProperties> = {
  readonly isShapeProperties: (value: unknown) => value is TShapeProperties;
  readonly createDefault: () => TShapeProperties;
  readonly renderEditor: (props: EditorProps<TShapeProperties>) => ReactNode;
};

export type DiagramEditorAdapters<TTextBody, TShapeProperties> = {
  readonly textBody?: DiagramTextBodyAdapter<TTextBody>;
  readonly shapeProperties?: DiagramShapePropertiesAdapter<TShapeProperties>;
};
