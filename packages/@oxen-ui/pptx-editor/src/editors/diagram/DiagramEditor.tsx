/**
 * @file DiagramEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/diagram-editor` with PPTX adapters injected.
 */

import type { CSSProperties } from "react";
import type { DiagramDataModel } from "@oxen-office/diagram/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import {
  DiagramEditor as CoreDiagramEditor,
} from "@oxen-ui/diagram-editor";
import { pptxDiagramEditorAdapters } from "./adapters";

export type DiagramEditorProps = EditorProps<DiagramDataModel> & {
  readonly style?: CSSProperties;
};






export function DiagramEditor(props: DiagramEditorProps) {
  return <CoreDiagramEditor {...props} adapters={pptxDiagramEditorAdapters} />;
}
