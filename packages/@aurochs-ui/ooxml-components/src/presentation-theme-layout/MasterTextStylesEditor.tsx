/**
 * @file MasterTextStylesEditor - Editor for master text styles
 *
 * Edits title/body/other text styles with per-level defRPr and pPr editing.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.12 (txStyles)
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import type { MasterTextStyles, TextStyleLevels, TextLevelStyle } from "@aurochs-office/pptx/domain/text-style";
import { TEXT_STYLE_LEVEL_KEYS } from "@aurochs-office/pptx/domain/text-style";
import type { TextAlign, RunProperties, ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import type { Points } from "@aurochs-office/drawing-ml/domain/units";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type MasterTextStylesEditorProps = {
  readonly masterTextStyles: MasterTextStyles | undefined;
  readonly onChange: (styles: MasterTextStyles) => void;
  readonly disabled?: boolean;
};

type StyleEntry = {
  readonly key: keyof MasterTextStyles;
  readonly label: string;
};

// =============================================================================
// Constants
// =============================================================================

const STYLE_ENTRIES: readonly StyleEntry[] = [
  { key: "titleStyle", label: "Title Style" },
  { key: "bodyStyle", label: "Body Style" },
  { key: "otherStyle", label: "Other Style" },
];

const ALIGNMENT_OPTIONS: readonly { value: TextAlign | ""; label: string }[] = [
  { value: "", label: "—" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
];

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.xs,
};

const sectionContainerStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderRadius: "4px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
};

const levelRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  fontSize: fontTokens.size.sm,
};

const levelLabelStyle: CSSProperties = {
  minWidth: "70px",
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
};

const fieldStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

const inputStyle: CSSProperties = {
  width: "48px",
  fontSize: fontTokens.size.sm,
  padding: "2px 4px",
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: "3px",
  background: "transparent",
  color: "inherit",
};

const selectStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  padding: "2px 4px",
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: "3px",
  background: "transparent",
  color: "inherit",
};

const checkboxLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  display: "flex",
  alignItems: "center",
  gap: "2px",
};

const statusStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Helpers
// =============================================================================

/** Count defined levels in a text style levels object */
function countDefinedLevels(levels: TextStyleLevels | undefined): number {
  if (!levels) {
    return 0;
  }
  return TEXT_STYLE_LEVEL_KEYS.slice(1).filter((k) => levels[k] !== undefined).length;
}

/** Render the status label for a text style section */
function renderLevelStatus(levels: TextStyleLevels | undefined, definedCount: number): ReactNode {
  if (levels) {
    const suffix = definedCount !== 1 ? "s" : "";
    return <span style={statusStyle}>{` — ${definedCount} level${suffix}`}</span>;
  }
  return <span style={statusStyle}> — not defined</span>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for master text styles (title, body, other).
 *
 * Per-level editing of fontSize, bold, italic (defRPr) and alignment (pPr).
 */
export function MasterTextStylesEditor({ masterTextStyles, onChange, disabled }: MasterTextStylesEditorProps) {
  const handleLevelChange = useCallback(
    (styleKey: keyof MasterTextStyles, levelKey: keyof TextStyleLevels, level: TextLevelStyle) => {
      const current = masterTextStyles ?? {};
      const currentLevels = current[styleKey] ?? {};
      const updatedLevels: TextStyleLevels = { ...currentLevels, [levelKey]: level };
      onChange({ ...current, [styleKey]: updatedLevels });
    },
    [masterTextStyles, onChange],
  );

  return (
    <OptionalPropertySection title="Master Text Styles" defaultExpanded={false}>
      <div style={contentStyle}>
        {STYLE_ENTRIES.map(({ key, label }) => {
          const levels = masterTextStyles?.[key];
          const definedCount = countDefinedLevels(levels);

          return (
            <div key={key}>
              <div style={sectionLabelStyle}>
                {label}
                {renderLevelStatus(levels, definedCount)}
              </div>
              {levels !== undefined && (
                <div style={sectionContainerStyle}>
                  {TEXT_STYLE_LEVEL_KEYS.map((levelKey) => {
                    const level = levels[levelKey];
                    if (level === undefined) {
                      return null;
                    }
                    return (
                      <LevelEditor
                        key={levelKey}
                        levelKey={levelKey}
                        level={level}
                        onChange={(updated) => handleLevelChange(key, levelKey, updated)}
                        disabled={disabled}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </OptionalPropertySection>
  );
}

// =============================================================================
// Sub-component: LevelEditor
// =============================================================================

function LevelEditor({
  levelKey,
  level,
  onChange,
  disabled,
}: {
  readonly levelKey: keyof TextStyleLevels;
  readonly level: TextLevelStyle;
  readonly onChange: (level: TextLevelStyle) => void;
  readonly disabled?: boolean;
}) {
  const defRPr = level.defaultRunProperties;
  const pPr = level.paragraphProperties;

  const handleRunPropChange = useCallback(
    (patch: Partial<RunProperties>) => {
      onChange({
        ...level,
        defaultRunProperties: { ...defRPr, ...patch },
      });
    },
    [level, defRPr, onChange],
  );

  const handleAlignmentChange = useCallback(
    (alignment: TextAlign | undefined) => {
      const updated: ParagraphProperties = { ...pPr, alignment };
      onChange({ ...level, paragraphProperties: updated });
    },
    [level, pPr, onChange],
  );

  const displayName = levelKey === "defaultStyle" ? "Default" : levelKey.replace("level", "Lv ");

  return (
    <div style={levelRowStyle}>
      <span style={levelLabelStyle}>{displayName}</span>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>Size</span>
        <input
          type="number"
          style={inputStyle}
          value={defRPr?.fontSize != null ? String(defRPr.fontSize) : ""}
          placeholder="—"
          onChange={(e) => {
            const v = e.target.value;
            handleRunPropChange({ fontSize: v ? (Number(v) as Points) : undefined });
          }}
          disabled={disabled}
          min={1}
          step={1}
        />
      </div>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={defRPr?.bold ?? false}
          onChange={(e) => handleRunPropChange({ bold: e.target.checked || undefined })}
          disabled={disabled}
        />
        B
      </label>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={defRPr?.italic ?? false}
          onChange={(e) => handleRunPropChange({ italic: e.target.checked || undefined })}
          disabled={disabled}
        />
        I
      </label>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>Align</span>
        <select
          style={selectStyle}
          value={pPr?.alignment ?? ""}
          onChange={(e) => handleAlignmentChange(e.target.value ? (e.target.value as TextAlign) : undefined)}
          disabled={disabled}
        >
          {ALIGNMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
