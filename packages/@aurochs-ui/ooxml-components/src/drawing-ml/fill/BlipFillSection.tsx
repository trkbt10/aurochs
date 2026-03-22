/**
 * @file BlipFillSection - Image fill editor for PPTX.
 *
 * Separated from FillEditor to isolate PPTX-specific resource context dependency.
 */

import { useCallback, type CSSProperties, type ChangeEvent } from "react";
import { Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import type { BlipFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { useEditorResourceContext } from "../EditorResourceContext";

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const typeSelectStyle: CSSProperties = {
  width: "90px",
  flexShrink: 0,
};

const imageSelectLabelStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.md,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const imagePreviewContainerStyle: CSSProperties = {
  width: "100%",
  height: "60px",
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
};

const imagePreviewStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

// =============================================================================
// Component
// =============================================================================

export type BlipFillSectionProps = {
  readonly value: BlipFill;
  readonly onChange: (fill: BaseFill) => void;
  readonly onTypeChange: (type: string) => void;
  readonly fillTypeOptions: SelectOption<string>[];
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/**
 * Image fill editor using EditorResourceContext to manage uploaded images.
 */
export function BlipFillSection({
  value: blipFill,
  onChange,
  onTypeChange,
  fillTypeOptions,
  disabled,
  className,
  style,
}: BlipFillSectionProps) {
  const { store, registerUpload } = useEditorResourceContext();
  const hasImage = blipFill.resourceId !== "";

  const previewUrl = hasImage ? store.toDataUrl(blipFill.resourceId) : undefined;

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      const resourceId = await registerUpload(file);
      onChange({
        ...blipFill,
        resourceId,
      });
    },
    [blipFill, onChange, registerUpload],
  );

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <div style={rowStyle}>
        <Select
          value={blipFill.type}
          onChange={onTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
          style={typeSelectStyle}
        />
        <label style={imageSelectLabelStyle}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled}
            style={{ display: "none" }}
          />
          {hasImage ? "Change Image" : "Select Image"}
        </label>
        <Toggle
          checked={blipFill.rotWithShape ?? true}
          onChange={(checked) => onChange({ ...blipFill, rotWithShape: checked })}
          disabled={disabled}
        />
        <span style={{ fontSize: fontTokens.size.sm, color: `var(--text-tertiary, ${colorTokens.text.tertiary})` }}>
          Rotate
        </span>
      </div>
      {previewUrl && (
        <div style={imagePreviewContainerStyle}>
          <img src={previewUrl} alt="Fill preview" style={imagePreviewStyle} />
        </div>
      )}
    </div>
  );
}
