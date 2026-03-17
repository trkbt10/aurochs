/**
 * @file MixedRunPropertiesEditor - Editor for text run properties with Mixed support
 *
 * Delegates to the shared TextFormattingEditor with PPTX-specific feature flags,
 * style options, and color editor slots. The pptx-text-adapter bridges between
 * PPTX MixedRunProperties/RunProperties and the generic TextFormatting type.
 */

import { useCallback, type CSSProperties } from "react";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import { ColorEditor, createDefaultColor } from "../color";
import type { RunProperties } from "@aurochs-office/pptx/domain/text";
import type { MixedRunProperties } from "./mixed-properties";
import { getExtractionValue } from "./mixed-properties";
import {
  pptxMixedRunToGeneric,
  pptxMixedRunToContext,
  textFormattingToRunUpdate,
  PPTX_UNDERLINE_OPTIONS,
  PPTX_STRIKE_OPTIONS,
} from "../../adapters/editor-controls/pptx-text-adapter";

// =============================================================================
// Types
// =============================================================================

export type MixedRunPropertiesEditorProps = {
  /** Mixed run properties from selection */
  readonly value: MixedRunProperties;
  /** Called when user changes a property (applies to all selected runs) */
  readonly onChange: (update: Partial<RunProperties>) => void;
  /** Whether the editor is disabled */
  readonly disabled?: boolean;
  /** Additional class name */
  readonly className?: string;
  /** Additional styles */
  readonly style?: CSSProperties;
  /** Show spacing section (baseline, spacing, kerning) */
  readonly showSpacing?: boolean;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties with Mixed value support.
 * Uses the shared TextFormattingEditor with PPTX-level features enabled.
 */
export function MixedRunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
}: MixedRunPropertiesEditorProps) {
  const handleChange = useCallback(
    (update: Parameters<typeof textFormattingToRunUpdate>[0]) => {
      onChange(textFormattingToRunUpdate(update));
    },
    [onChange],
  );

  return (
    <TextFormattingEditor
      value={pptxMixedRunToGeneric(value)}
      onChange={handleChange}
      mixed={pptxMixedRunToContext(value)}
      disabled={disabled}
      className={className}
      style={style}
      features={{
        showUnderlineStyle: true,
        showStrikeStyle: true,
        showCaps: true,
        showSpacing: showSpacing,
        showHighlight: true,
        showSuperSubscript: true,
      }}
      underlineStyleOptions={PPTX_UNDERLINE_OPTIONS}
      strikeStyleOptions={PPTX_STRIKE_OPTIONS}
      renderColorPicker={({ value: colorHex, onChange: onColorChange, disabled: d }) => (
        <ColorEditor
          value={getExtractionValue(value.color) ?? createDefaultColor("000000")}
          onChange={(c) => onChange({ color: c })}
          disabled={d}
          showTransform={false}
        />
      )}
      renderHighlightPicker={({ value: highlightHex, onChange: onHighlightChange, disabled: d }) => (
        <ColorEditor
          value={getExtractionValue(value.highlightColor) ?? createDefaultColor("FFFF00")}
          onChange={(c) => onChange({ highlightColor: c })}
          disabled={d}
          showTransform={false}
        />
      )}
    />
  );
}
