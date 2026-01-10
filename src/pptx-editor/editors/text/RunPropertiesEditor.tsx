/**
 * @file RunPropertiesEditor - Editor for text run properties
 *
 * MixedRunPropertiesEditor を単一値でも使うラッパー。
 * Mixed であることを前提にし、入力欄の実装を 1 箇所に統合する。
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { RunProperties } from "../../../pptx/domain/text";
import type { EditorProps } from "../../types";
import { MixedRunPropertiesEditor } from "./MixedRunPropertiesEditor";
import { extractMixedRunProperties, mergeRunProperties } from "./mixed-properties";

// =============================================================================
// Types
// =============================================================================

export type RunPropertiesEditorProps = EditorProps<RunProperties> & {
  readonly style?: CSSProperties;
  /** Show spacing section (baseline, spacing, kerning) */
  readonly showSpacing?: boolean;
};

// =============================================================================
// Component
// =============================================================================






export function RunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
}: RunPropertiesEditorProps) {
  const mixedValue = useMemo(() => extractMixedRunProperties([value]), [value]);

  const handleChange = useCallback(
    (update: Partial<RunProperties>) => {
      onChange(mergeRunProperties(value, update));
    },
    [value, onChange]
  );

  return (
    <MixedRunPropertiesEditor
      value={mixedValue}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      style={style}
      showSpacing={showSpacing}
    />
  );
}

/**
 * Create default RunProperties value
 */
export function createDefaultRunProperties(): RunProperties {
  return {};
}
