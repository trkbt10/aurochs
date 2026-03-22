/**
 * @file NonVisualPropertiesEditor - Editor for NonVisualProperties type
 *
 * Edits name, description, title, hidden, hyperlink, and hyperlinkHover properties.
 * Pure content - no container styling. Consumer wraps in Section/Accordion.
 * @see ECMA-376 Part 1, Section 19.3.1.12 (cNvPr)
 */

import { useCallback } from "react";
import { Input, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { HyperlinkEditor } from "./HyperlinkEditor";
import type { NonVisualProperties } from "@aurochs-office/pptx/domain/shape";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type NonVisualPropertiesEditorProps = EditorProps<NonVisualProperties> & {
  /** Show ID field (read-only) */
  readonly showId?: boolean;
  /** Show title field */
  readonly showTitle?: boolean;
  /** Show description field */
  readonly showDescription?: boolean;
  /** Show hyperlink fields */
  readonly showHyperlinks?: boolean;
};

/**
 * NonVisualProperties editor. Pure content - no containers.
 * @see ECMA-376 Part 1, Section 19.3.1.12 (cNvPr)
 */
export function NonVisualPropertiesEditor({
  value,
  onChange,
  disabled,
  showId = true,
  showTitle = true,
  showDescription = true,
  showHyperlinks = true,
}: NonVisualPropertiesEditorProps) {
  const updateField = useCallback(
    <K extends keyof NonVisualProperties>(field: K, newValue: NonVisualProperties[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange],
  );

  return (
    <>
      {/* ID (read-only) */}
      {showId && (
        <FieldGroup label="ID">
          <Input value={value.id} onChange={() => {}} disabled style={{ opacity: 0.6 }} />
        </FieldGroup>
      )}

      {/* Name */}
      <FieldGroup label="Name">
        <Input
          value={value.name}
          onChange={(v) => updateField("name", String(v))}
          disabled={disabled}
          placeholder="Shape name"
        />
      </FieldGroup>

      {/* Title */}
      {showTitle && (
        <FieldGroup label="Title" hint="Accessibility title">
          <Input
            value={value.title ?? ""}
            onChange={(v) => updateField("title", String(v) || undefined)}
            disabled={disabled}
            placeholder="Optional title"
          />
        </FieldGroup>
      )}

      {/* Description */}
      {showDescription && (
        <FieldGroup label="Description" hint="Accessibility description">
          <Input
            value={value.description ?? ""}
            onChange={(v) => updateField("description", String(v) || undefined)}
            disabled={disabled}
            placeholder="Optional description"
          />
        </FieldGroup>
      )}

      {/* Hidden */}
      <Toggle
        checked={value.hidden ?? false}
        onChange={(v) => updateField("hidden", v || undefined)}
        label="Hidden"
        disabled={disabled}
      />

      {/* Hyperlink (click) */}
      {showHyperlinks && (
        <HyperlinkEditor
          value={value.hyperlink}
          onChange={(hyperlink) => updateField("hyperlink", hyperlink)}
          disabled={disabled}
          toggleLabel="Click Hyperlink"
        />
      )}

      {/* Hyperlink (hover) */}
      {showHyperlinks && (
        <HyperlinkEditor
          value={value.hyperlinkHover}
          onChange={(hyperlinkHover) => updateField("hyperlinkHover", hyperlinkHover)}
          disabled={disabled}
          toggleLabel="Hover Hyperlink"
        />
      )}
    </>
  );
}

/**
 * Create default non-visual properties
 */
export function createDefaultNonVisualProperties(id: string = "1", name: string = "Shape"): NonVisualProperties {
  return {
    id,
    name,
  };
}
