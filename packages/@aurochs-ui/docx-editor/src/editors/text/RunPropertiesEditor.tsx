/**
 * @file RunPropertiesEditor - Editor for DOCX run properties
 *
 * Wraps the shared TextFormattingEditor with DOCX-specific adapters and slots.
 * DOCX-specific controls (highlight, vertical align) go in renderExtras.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxRunProperties, DocxHighlightColor } from "@aurochs-office/docx/domain/run";
import type { HalfPoints } from "@aurochs-office/docx/domain/types";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import { docxTextAdapter } from "../../adapters/editor-controls";
import styles from "./RunPropertiesEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type RunPropertiesEditorProps = EditorProps<DocxRunProperties> & {
  readonly style?: CSSProperties;
  /** Show spacing section */
  readonly showSpacing?: boolean;
  /** Show highlight color selector */
  readonly showHighlight?: boolean;
  /**
   * Mixed state flags for multi-selection.
   * When true, the corresponding control renders in an indeterminate/mixed state.
   */
  readonly mixed?: RunPropertiesMixedState;
};

export type RunPropertiesMixedState = {
  readonly b?: boolean;
  readonly i?: boolean;
  readonly u?: boolean;
  readonly strike?: boolean;
  readonly sz?: boolean;
  readonly rFonts?: boolean;
};

// =============================================================================
// Constants (DOCX-specific)
// =============================================================================

const HIGHLIGHT_OPTIONS: SelectOption<DocxHighlightColor | "none">[] = [
  { value: "none", label: "No Highlight" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "cyan", label: "Cyan" },
  { value: "magenta", label: "Magenta" },
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "darkBlue", label: "Dark Blue" },
  { value: "darkCyan", label: "Dark Cyan" },
  { value: "darkGreen", label: "Dark Green" },
  { value: "darkMagenta", label: "Dark Magenta" },
  { value: "darkRed", label: "Dark Red" },
  { value: "darkYellow", label: "Dark Yellow" },
  { value: "darkGray", label: "Dark Gray" },
  { value: "lightGray", label: "Light Gray" },
  { value: "black", label: "Black" },
];

const VERTICAL_ALIGN_OPTIONS: SelectOption<"baseline" | "superscript" | "subscript">[] = [
  { value: "baseline", label: "Normal" },
  { value: "superscript", label: "Superscript" },
  { value: "subscript", label: "Subscript" },
];

// =============================================================================
// Helpers
// =============================================================================

/** Convert DOCX RunPropertiesMixedState to generic MixedContext. */
function toMixedContext(mixed: RunPropertiesMixedState | undefined): MixedContext | undefined {
  if (!mixed) {return undefined;}
  const fields = new Set<string>();
  if (mixed.b) {fields.add("bold");}
  if (mixed.i) {fields.add("italic");}
  if (mixed.u) {fields.add("underline");}
  if (mixed.strike) {fields.add("strikethrough");}
  if (mixed.sz) {fields.add("fontSize");}
  if (mixed.rFonts) {fields.add("fontFamily");}
  return fields.size > 0 ? { mixedFields: fields } : undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX run properties.
 * Uses shared TextFormattingEditor for common controls.
 */
export function RunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
  showHighlight = true,
  mixed,
}: RunPropertiesEditorProps) {
  const generic = docxTextAdapter.toGeneric(value);
  const mixedCtx = toMixedContext(mixed);

  // Handle shared editor onChange
  const handleSharedChange = useCallback(
    (update: Partial<TextFormatting>) => {
      const parts: Partial<DocxRunProperties>[] = [];

      if ("bold" in update) {
        parts.push({ b: update.bold ?? undefined });
      }
      if ("italic" in update) {
        parts.push({ i: update.italic ?? undefined });
      }
      if ("underline" in update) {
        parts.push({ u: update.underline ? { val: "single" as const } : undefined });
      }
      if ("strikethrough" in update) {
        parts.push({ strike: update.strikethrough ?? undefined });
      }
      if ("fontSize" in update && update.fontSize !== undefined) {
        const hp = (update.fontSize * 2) as HalfPoints;
        parts.push({ sz: hp, szCs: hp });
      }
      if ("fontFamily" in update && update.fontFamily) {
        parts.push({
          rFonts: {
            ...value.rFonts,
            ascii: update.fontFamily,
            hAnsi: update.fontFamily,
            eastAsia: update.fontFamily,
            cs: update.fontFamily,
          },
        });
      }
      if ("superscript" in update) {
        parts.push({ vertAlign: update.superscript ? "superscript" : "baseline" });
      }
      if ("subscript" in update) {
        parts.push({ vertAlign: update.subscript ? "subscript" : "baseline" });
      }

      onChange({ ...value, ...Object.assign({}, ...parts) });
    },
    [value, onChange],
  );

  // DOCX-specific: highlight dropdown
  const handleHighlightChange = useCallback(
    (highlight: DocxHighlightColor | "none") => {
      if (highlight === "none") {
        const { highlight: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, highlight });
      }
    },
    [value, onChange],
  );

  // DOCX-specific: vertical alignment select
  const handleVertAlignChange = useCallback(
    (vertAlign: "baseline" | "superscript" | "subscript") => {
      onChange({ ...value, vertAlign });
    },
    [value, onChange],
  );

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <TextFormattingEditor
      value={generic}
      onChange={handleSharedChange}
      disabled={disabled}
      className={containerClassName}
      style={style}
      features={{ showSuperSubscript: true }}
      mixed={mixedCtx}
      renderColorPicker={({ disabled: d }) => (
        <input
          type="color"
          value={`#${value.color?.val ?? "000000"}`}
          onChange={(e) => {
            const color = e.target.value.slice(1);
            onChange({ ...value, color: { val: color } });
          }}
          disabled={d}
          title="Text Color"
        />
      )}
      renderExtras={() => (
        <>
          {/* DOCX-specific: Highlight */}
          {showHighlight && (
            <FieldGroup label="Highlight">
              <div className={styles.highlightSection}>
                <Select
                  value={(value.highlight ?? "none") as DocxHighlightColor | "none"}
                  onChange={handleHighlightChange}
                  options={HIGHLIGHT_OPTIONS}
                  disabled={disabled}
                />
              </div>
            </FieldGroup>
          )}

          {/* DOCX-specific: Vertical Alignment (detailed select, not just toggle) */}
          {showSpacing && (
            <FieldGroup label="Position">
              <div className={styles.spacingSection}>
                <Select
                  value={value.vertAlign ?? "baseline"}
                  onChange={handleVertAlignChange}
                  options={VERTICAL_ALIGN_OPTIONS}
                  disabled={disabled}
                />
              </div>
            </FieldGroup>
          )}
        </>
      )}
    />
  );
}

/**
 * Create default RunProperties value.
 */
export function createDefaultRunProperties(): DocxRunProperties {
  return {};
}
