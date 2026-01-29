/**
 * @file ChartTextBodyEditor
 *
 * Minimal text-body editor for ChartML.
 */

import { useCallback, type CSSProperties } from "react";
import type { TextBody } from "@oxen-office/chart/domain/text";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { getPlainText, replacePlainText } from "./text-body";

export type ChartTextBodyEditorProps = EditorProps<TextBody> & {
  readonly style?: CSSProperties;
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "72px",
  resize: "vertical",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
  background: "var(--bg-secondary, #1a1a1a)",
  color: "var(--text-primary, #fafafa)",
  padding: "8px 10px",
  fontSize: "12px",
  fontFamily: "inherit",
};






export function ChartTextBodyEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: ChartTextBodyEditorProps) {
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

