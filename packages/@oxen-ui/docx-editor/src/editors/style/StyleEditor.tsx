/**
 * @file StyleEditor - Editor for DOCX style definitions
 *
 * Provides UI controls for editing style properties like
 * name, type, base style, and visibility options.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxStyle, DocxStyleType } from "@oxen/docx/domain/styles";
import type { DocxStyleId } from "@oxen/docx/domain/types";
import type { EditorProps } from "../../types";
import { Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";
import { FieldGroup } from "@oxen-ui/ui-components/layout";
import type { SelectOption } from "@oxen-ui/ui-components/types";
import styles from "./StyleEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type StyleEditorProps = EditorProps<DocxStyle> & {
  readonly style?: CSSProperties;
  /** Available style IDs for basedOn/link selection */
  readonly availableStyles?: readonly { id: DocxStyleId; name: string; type: DocxStyleType }[];
  /** Show advanced options */
  readonly showAdvanced?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const STYLE_TYPE_OPTIONS: SelectOption<DocxStyleType>[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "character", label: "Character" },
  { value: "table", label: "Table" },
  { value: "numbering", label: "Numbering" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX style definitions.
 */
export function StyleEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  availableStyles = [],
  showAdvanced = false,
}: StyleEditorProps) {
  const handleNameChange = useCallback(
    (name: string | number) => {
      onChange({ ...value, name: { val: String(name) } });
    },
    [value, onChange],
  );

  const handleTypeChange = useCallback(
    (type: DocxStyleType) => {
      onChange({ ...value, type });
    },
    [value, onChange],
  );

  const handleBasedOnChange = useCallback(
    (basedOnId: string) => {
      if (basedOnId === "") {
        const { basedOn: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, basedOn: { val: basedOnId as DocxStyleId } });
      }
    },
    [value, onChange],
  );

  const handleNextChange = useCallback(
    (nextId: string) => {
      if (nextId === "") {
        const { next: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, next: { val: nextId as DocxStyleId } });
      }
    },
    [value, onChange],
  );

  const handlePriorityChange = useCallback(
    (priority: string | number) => {
      const numPriority = typeof priority === "string" ? parseFloat(priority) : priority;
      if (priority === "" || isNaN(numPriority)) {
        const { uiPriority: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, uiPriority: { val: numPriority } });
      }
    },
    [value, onChange],
  );

  const handleBooleanToggle = useCallback(
    (key: keyof DocxStyle, checked: boolean) => {
      if (checked) {
        onChange({ ...value, [key]: true });
      } else {
        const newValue = { ...value };
        delete (newValue as Record<string, unknown>)[key];
        onChange(newValue as DocxStyle);
      }
    },
    [value, onChange],
  );

  // Filter available styles by compatible type
  const compatibleStyles = availableStyles.filter((s) => {
    if (value.type === "paragraph") {
      return s.type === "paragraph";
    }
    if (value.type === "character") {
      return s.type === "character";
    }
    if (value.type === "table") {
      return s.type === "table";
    }
    return s.type === value.type;
  });

  const paragraphStyles = availableStyles.filter((s) => s.type === "paragraph");

  const basedOnOptions: SelectOption<string>[] = [
    { value: "", label: "(None)" },
    ...compatibleStyles
      .filter((s) => s.id !== value.styleId)
      .map((s) => ({ value: s.id, label: s.name })),
  ];

  const nextStyleOptions: SelectOption<string>[] = [
    { value: "", label: "(Same as current)" },
    ...paragraphStyles.map((s) => ({ value: s.id, label: s.name })),
  ];

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Style Name */}
      <FieldGroup label="Style Name">
        <Input
          type="text"
          value={value.name?.val ?? ""}
          onChange={handleNameChange}
          disabled={disabled}
          placeholder="Style name"
        />
      </FieldGroup>

      {/* Style Type */}
      <FieldGroup label="Style Type">
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={STYLE_TYPE_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Style ID (read-only display) */}
      <FieldGroup label="Style ID">
        <Input type="text" value={value.styleId} onChange={() => {}} disabled />
      </FieldGroup>

      {/* Based On */}
      <FieldGroup label="Based On">
        <Select
          value={value.basedOn?.val ?? ""}
          onChange={handleBasedOnChange}
          options={basedOnOptions}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Next Style (paragraph styles only) */}
      {value.type === "paragraph" && (
        <FieldGroup label="Next Paragraph Style">
          <Select
            value={value.next?.val ?? ""}
            onChange={handleNextChange}
            options={nextStyleOptions}
            disabled={disabled}
          />
        </FieldGroup>
      )}

      {/* UI Priority */}
      <FieldGroup label="Priority (lower = higher in list)">
        <Input
          type="number"
          value={value.uiPriority?.val ?? ""}
          onChange={handlePriorityChange}
          disabled={disabled}
          min={0}
          placeholder="Auto"
          width={80}
        />
      </FieldGroup>

      {/* Quick Access Options */}
      <FieldGroup label="Display Options">
        <div className={styles.optionsSection}>
          <Toggle
            checked={value.qFormat ?? false}
            onChange={(checked) => handleBooleanToggle("qFormat", checked)}
            label="Show in Quick Styles gallery"
            disabled={disabled}
          />
          <Toggle
            checked={value.default ?? false}
            onChange={(checked) => handleBooleanToggle("default", checked)}
            label="Default style for type"
            disabled={disabled}
          />
        </div>
      </FieldGroup>

      {/* Advanced Options */}
      {showAdvanced && (
        <FieldGroup label="Advanced">
          <div className={styles.advancedSection}>
            <Toggle
              checked={value.semiHidden ?? false}
              onChange={(checked) => handleBooleanToggle("semiHidden", checked)}
              label="Semi-hidden"
              disabled={disabled}
            />
            <Toggle
              checked={value.unhideWhenUsed ?? false}
              onChange={(checked) => handleBooleanToggle("unhideWhenUsed", checked)}
              label="Unhide when used"
              disabled={disabled}
            />
            <Toggle
              checked={value.locked ?? false}
              onChange={(checked) => handleBooleanToggle("locked", checked)}
              label="Locked (cannot modify)"
              disabled={disabled}
            />
            <Toggle
              checked={value.customStyle ?? false}
              onChange={(checked) => handleBooleanToggle("customStyle", checked)}
              label="Custom style"
              disabled={disabled}
            />
          </div>
        </FieldGroup>
      )}
    </div>
  );
}

/**
 * Create default Style value.
 */
export function createDefaultStyle(styleId: DocxStyleId, type: DocxStyleType = "paragraph"): DocxStyle {
  return {
    type,
    styleId,
    name: { val: "New Style" },
    customStyle: true,
  };
}
