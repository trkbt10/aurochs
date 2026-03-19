/**
 * @file BlipFill extension for BaseFillEditor.
 *
 * Adds PPTX-specific image fill (blipFill) support to the generic fill editor.
 */

import type { CSSProperties } from "react";
import type { FillTypeExtension } from "@aurochs-ui/editor-controls/editors";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BlipFill } from "@aurochs-office/pptx/domain/color/types";
import type { ResourceId } from "@aurochs-office/pptx/domain/types";
import { colorTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { BlipFillSection } from "./BlipFillSection";

export const blipFillExtension: FillTypeExtension = {
  typeOption: { value: "blipFill", label: "Image" },

  createDefault(): BaseFill {
    return {
      type: "blipFill",
      resourceId: "" as ResourceId,
      relationshipType: "embed",
      rotWithShape: true,
    } as BlipFill;
  },

  renderEditor({ value, onChange, onTypeChange, fillTypeOptions, disabled, className, style }) {
    return (
      <BlipFillSection
        value={value as BlipFill}
        onChange={onChange}
        onTypeChange={onTypeChange}
        fillTypeOptions={fillTypeOptions}
        disabled={disabled}
        className={className}
        style={style}
      />
    );
  },

  renderCompactPreview({ value: _value, disabled }) {
    const previewStyle: CSSProperties = {
      width: "24px",
      height: "24px",
      borderRadius: radiusTokens.sm,
      border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
      backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
      opacity: disabled ? 0.5 : 1,
    };
    return <div style={previewStyle} title="Image fill (not editable)" />;
  },
};
