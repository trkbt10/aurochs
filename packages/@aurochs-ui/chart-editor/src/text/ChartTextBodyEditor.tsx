/**
 * @file ChartTextBodyEditor
 *
 * Minimal text-body editor for ChartML.
 */

import { useCallback, type CSSProperties } from "react";
import type { TextBody } from "@aurochs-office/chart/domain/text";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { colorTokens, radiusTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { getPlainText, replacePlainText } from "./text-body";

export type ChartTextBodyEditorProps = EditorProps<TextBody> & {
  readonly style?: CSSProperties;
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "72px",
  resize: "vertical",
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  background: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  padding: "8px 10px",
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
};

/**
 * Simple textarea-based editor for chart TextBody content.
 */
export function ChartTextBodyEditor({ value, onChange, disabled, className, style }: ChartTextBodyEditorProps) {
  const text = getPlainText(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(replacePlainText(value, e.target.value));
    },
    [onChange, value],
  );

  return (
    <textarea
      value={text}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      style={{ ...textareaStyle, ...style }}
    />
  );
}
