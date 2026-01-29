/**
 * @file DiagramPointEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/diagram-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { DiagramPoint } from "@oxen-office/diagram/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  DiagramPointEditor as CoreDiagramPointEditor,
  createDefaultDiagramPoint as createDefaultDiagramPointCore,
} from "@oxen-ui/diagram-editor";
import { pptxDiagramEditorAdapters } from "./adapters";

export type DiagramPointEditorProps = EditorProps<DiagramPoint> & {
  readonly style?: CSSProperties;
};

export function DiagramPointEditor(props: DiagramPointEditorProps) {
  return <CoreDiagramPointEditor {...props} adapters={pptxDiagramEditorAdapters} />;
}

export const createDefaultDiagramPoint = createDefaultDiagramPointCore;

