/**
 * @file MasterBackgroundEditor - Background editor for master/layout slides
 *
 * Uses BaseFillEditor for format-agnostic fill editing.
 * Accepts Background domain type (ECMA-376 §19.3.1.1) directly.
 */

import { useCallback, type CSSProperties } from "react";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { BaseFillEditor } from "@aurochs-ui/editor-controls/editors";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Background } from "@aurochs-office/pptx/domain";
import { spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type MasterBackgroundEditorProps = {
  readonly background: Background | undefined;
  readonly onChange: (background: Background | undefined) => void;
  readonly disabled?: boolean;
  readonly title?: string;
};

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Background editor for master slides and slide layouts.
 * Provides fill selection and shadeToTitle toggle.
 */
export function MasterBackgroundEditor({
  background,
  onChange,
  disabled,
  title = "Background",
}: MasterBackgroundEditorProps) {
  const handleFillChange = useCallback(
    (fill: BaseFill) => {
      if (fill.type === "noFill") {
        onChange(undefined);
      } else {
        onChange({ fill, shadeToTitle: background?.shadeToTitle });
      }
    },
    [background, onChange],
  );

  const handleShadeToTitleChange = useCallback(
    (shadeToTitle: boolean) => {
      const fill = background?.fill ?? { type: "noFill" as const };
      if (fill.type === "noFill") { return; }
      onChange({ fill, shadeToTitle });
    },
    [background, onChange],
  );

  const fill: BaseFill = background?.fill ?? { type: "noFill" as const };

  return (
    <OptionalPropertySection title={title} defaultExpanded={false}>
      <div style={contentStyle}>
        <FieldGroup label="Fill">
          <BaseFillEditor value={fill} onChange={handleFillChange} disabled={disabled} />
        </FieldGroup>
        <Toggle
          checked={background?.shadeToTitle ?? false}
          onChange={handleShadeToTitleChange}
          label="Shade to title"
          disabled={disabled}
        />
      </div>
    </OptionalPropertySection>
  );
}
