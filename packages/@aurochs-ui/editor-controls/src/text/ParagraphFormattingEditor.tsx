/**
 * @file ParagraphFormattingEditor - Shared paragraph formatting editor
 *
 * High-level composite editor for paragraph-level formatting.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Input, ToggleButton } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens, fieldLabelTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { LucideIcon } from "@aurochs-ui/ui-components/icons";
import type { ParagraphFormatting, HorizontalAlignment, ParagraphFormattingFeatures } from "./types";
import type { MixedContext } from "../mixed-state";
import { isMixedField } from "../mixed-state";

// =============================================================================
// Types
// =============================================================================

export type ParagraphFormattingEditorProps = {
  readonly value: ParagraphFormatting;
  readonly onChange: (update: Partial<ParagraphFormatting>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: ParagraphFormattingFeatures;
  readonly mixed?: MixedContext;
  /** Slot: format-specific extra controls (PPTX bullets, direction, etc.). */
  readonly renderExtras?: () => ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Helpers
// =============================================================================

const MIXED_PLACEHOLDER = "Mixed";

const ALIGNMENTS: readonly { value: HorizontalAlignment; label: string; icon: LucideIcon }[] = [
  { value: "left", label: "Align left", icon: AlignLeftIcon },
  { value: "center", label: "Align center", icon: AlignCenterIcon },
  { value: "right", label: "Align right", icon: AlignRightIcon },
  { value: "justify", label: "Justify", icon: AlignJustifyIcon },
];

function feat(
  features: ParagraphFormattingFeatures | undefined,
  key: keyof ParagraphFormattingFeatures,
  defaultValue: boolean,
): boolean {
  return features?.[key] ?? defaultValue;
}

// =============================================================================
// Component
// =============================================================================

/** Shared paragraph formatting editor with alignment, spacing, and indentation controls. */
export function ParagraphFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  mixed,
  renderExtras,
}: ParagraphFormattingEditorProps) {
  const handleAlignmentChange = useCallback((alignment: HorizontalAlignment) => onChange({ alignment }), [onChange]);

  const handleLineSpacingChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num > 0) {
        onChange({ lineSpacing: num });
      }
    },
    [onChange],
  );

  const handleSpaceBeforeChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        onChange({ spaceBefore: num });
      }
    },
    [onChange],
  );

  const handleSpaceAfterChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        onChange({ spaceAfter: num });
      }
    },
    [onChange],
  );

  const handleIndentLeftChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        onChange({ indentLeft: num });
      }
    },
    [onChange],
  );

  const handleIndentRightChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        onChange({ indentRight: num });
      }
    },
    [onChange],
  );

  const handleFirstLineIndentChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num)) {
        onChange({ firstLineIndent: num });
      }
    },
    [onChange],
  );

  const showAlignment = feat(features, "showAlignment", true);
  const showLineSpacing = feat(features, "showLineSpacing", false);
  const showSpacing = feat(features, "showSpacing", false);
  const showIndentation = feat(features, "showIndentation", false);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Alignment buttons */}
      {showAlignment && (
        <FieldGroup label="Alignment">
          <div style={rowStyle}>
            {ALIGNMENTS.map(({ value: align, label, icon: Icon }) => (
              <ToggleButton
                key={align}
                pressed={!isMixedField(mixed, "alignment") && value.alignment === align}
                onChange={() => handleAlignmentChange(align)}
                label={label}
                ariaLabel={`Align ${align}`}
                disabled={disabled}
                mixed={isMixedField(mixed, "alignment")}
              >
                <Icon size={iconTokens.size.sm} />
              </ToggleButton>
            ))}
          </div>
        </FieldGroup>
      )}

      {/* Line Spacing */}
      {showLineSpacing && (
        <>
          {showAlignment && <div style={separatorStyle} />}
          <FieldGroup
            label={isMixedField(mixed, "lineSpacing") ? "Line Spacing (Mixed)" : "Line Spacing"}
            inline
            labelWidth={fieldLabelTokens.paragraph.lineSpacing}
          >
            <Input
              type="number"
              value={isMixedField(mixed, "lineSpacing") ? "" : (value.lineSpacing ?? "")}
              onChange={handleLineSpacingChange}
              disabled={disabled}
              placeholder={isMixedField(mixed, "lineSpacing") ? MIXED_PLACEHOLDER : "1.0"}
              min={0.5}
              max={10}
              step={0.1}
              suffix="x"
            />
          </FieldGroup>
        </>
      )}

      {/* Space Before / After */}
      {showSpacing && (
        <>
          <div style={separatorStyle} />
          <FieldRow>
            <FieldGroup
              label={isMixedField(mixed, "spaceBefore") ? "Before (M)" : "Before"}
              inline
              labelWidth={fieldLabelTokens.paragraph.spaceBefore}
              style={{ flex: 1 }}
            >
              <Input
                type="number"
                value={isMixedField(mixed, "spaceBefore") ? "" : (value.spaceBefore ?? "")}
                onChange={handleSpaceBeforeChange}
                disabled={disabled}
                placeholder={isMixedField(mixed, "spaceBefore") ? MIXED_PLACEHOLDER : "0"}
                min={0}
                suffix="pt"
              />
            </FieldGroup>
            <FieldGroup
              label={isMixedField(mixed, "spaceAfter") ? "After (M)" : "After"}
              inline
              labelWidth={fieldLabelTokens.paragraph.spaceAfter}
              style={{ flex: 1 }}
            >
              <Input
                type="number"
                value={isMixedField(mixed, "spaceAfter") ? "" : (value.spaceAfter ?? "")}
                onChange={handleSpaceAfterChange}
                disabled={disabled}
                placeholder={isMixedField(mixed, "spaceAfter") ? MIXED_PLACEHOLDER : "0"}
                min={0}
                suffix="pt"
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Indentation */}
      {showIndentation && (
        <>
          <div style={separatorStyle} />
          <FieldRow>
            <FieldGroup label="Left" inline labelWidth={fieldLabelTokens.paragraph.indentLeft} style={{ flex: 1 }}>
              <Input
                type="number"
                value={isMixedField(mixed, "indentLeft") ? "" : (value.indentLeft ?? "")}
                onChange={handleIndentLeftChange}
                disabled={disabled}
                placeholder={isMixedField(mixed, "indentLeft") ? MIXED_PLACEHOLDER : "0"}
                min={0}
                suffix="pt"
              />
            </FieldGroup>
            <FieldGroup label="Right" inline labelWidth={fieldLabelTokens.paragraph.indentRight} style={{ flex: 1 }}>
              <Input
                type="number"
                value={isMixedField(mixed, "indentRight") ? "" : (value.indentRight ?? "")}
                onChange={handleIndentRightChange}
                disabled={disabled}
                placeholder={isMixedField(mixed, "indentRight") ? MIXED_PLACEHOLDER : "0"}
                min={0}
                suffix="pt"
              />
            </FieldGroup>
          </FieldRow>
          <FieldGroup label="First Line" inline labelWidth={fieldLabelTokens.paragraph.firstLine}>
            <Input
              type="number"
              value={isMixedField(mixed, "firstLineIndent") ? "" : (value.firstLineIndent ?? "")}
              onChange={handleFirstLineIndentChange}
              disabled={disabled}
              placeholder={isMixedField(mixed, "firstLineIndent") ? MIXED_PLACEHOLDER : "0"}
              suffix="pt"
            />
          </FieldGroup>
        </>
      )}

      {/* Extras slot */}
      {renderExtras?.()}
    </div>
  );
}
