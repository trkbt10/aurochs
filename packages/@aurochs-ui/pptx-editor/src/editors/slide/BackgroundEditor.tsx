/**
 * @file BackgroundEditor - Editor for slide background
 *
 * Edits Background: fill and shadeToTitle.
 */

import type { CSSProperties } from "react";
import type { Background } from "@aurochs-office/pptx/domain/slide/types";
import type { Fill } from "@aurochs-office/pptx/domain/color/types";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { FillEditor, createDefaultSolidFill } from "../color";

export type BackgroundEditorProps = EditorProps<Background> & {
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for slide Background type.
 *
 * Features:
 * - Edit fill via FillEditor (solid, gradient, pattern, image)
 * - Toggle shadeToTitle
 */
export function BackgroundEditor({ value, onChange, disabled, className, style }: BackgroundEditorProps) {
  const handleFillChange = (fill: Fill) => {
    onChange({ ...value, fill });
  };

  const handleShadeToTitleChange = (shadeToTitle: boolean) => {
    onChange({ ...value, shadeToTitle: shadeToTitle || undefined });
  };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Fill">
        <FillEditor value={value.fill} onChange={handleFillChange} disabled={disabled} />
      </FieldGroup>

      <Toggle
        checked={value.shadeToTitle ?? false}
        onChange={handleShadeToTitleChange}
        disabled={disabled}
        label="Shade to Title"
      />
    </div>
  );
}

/**
 * Create a default Background
 */
export function createDefaultBackground(): Background {
  return {
    fill: createDefaultSolidFill(),
  };
}
