/**
 * @file DiagramConnectionEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/diagram-editor` (no PPTX adapters needed).
 */

import {
  DiagramConnectionEditor as CoreDiagramConnectionEditor,
  createDefaultDiagramConnection as createDefaultDiagramConnectionCore,
} from "@oxen-ui/diagram-editor";
import type { DiagramConnectionEditorProps as CoreDiagramConnectionEditorProps } from "@oxen-ui/diagram-editor";

export type DiagramConnectionEditorProps = CoreDiagramConnectionEditorProps;
export const DiagramConnectionEditor = CoreDiagramConnectionEditor;
export const createDefaultDiagramConnection = createDefaultDiagramConnectionCore;

