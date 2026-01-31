/**
 * @file TextBodyEditor
 *
 * Adapter-aware TextBody editor for ChartML.
 */

import type { CSSProperties, ReactNode } from "react";
import type { TextBody } from "@oxen-office/chart/domain/text";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { ChartTextBodyEditor } from "./ChartTextBodyEditor";
import { useChartEditorAdapters } from "../adapters";

export type TextBodyEditorProps = EditorProps<TextBody> & {
  readonly style?: CSSProperties;
};


























/**
 * Adapter-aware TextBody editor that delegates to container-specific editors.
 */
export function TextBodyEditor(props: TextBodyEditorProps): ReactNode {
  const adapters = useChartEditorAdapters();
  const textBodyAdapter = adapters?.textBody;
  if (textBodyAdapter) {
    return textBodyAdapter.renderEditor(props);
  }
  return <ChartTextBodyEditor {...props} />;
}

