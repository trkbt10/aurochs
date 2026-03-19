/**
 * @file FormatSchemeEditor - Editor for format scheme (a:fmtScheme)
 *
 * Displays 4 style categories × 3 levels (subtle/moderate/intense).
 * Bridges XmlElement ⇄ domain types using drawing-ml parsers and pptx serializers.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (fmtScheme)
 */

import { useCallback, type CSSProperties } from "react";
import type { XmlElement } from "@aurochs/xml";
import type { FormatScheme } from "@aurochs-office/pptx/domain/theme/types";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { Effects } from "@aurochs-office/pptx/domain/types";
import type { Fill } from "@aurochs-office/pptx/domain/color/types";
import { parseBaseFill, parseLine, parseEffects } from "@aurochs-office/drawing-ml/parser";
import { serializeFill } from "@aurochs-builder/pptx/patcher/serializer/fill";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { BaseFillEditor } from "@aurochs-ui/editor-controls/editors";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type FormatSchemeEditorProps = {
  readonly formatScheme: FormatScheme;
  readonly onChange: (formatScheme: FormatScheme) => void;
  readonly disabled?: boolean;
};

type StyleCategory = {
  readonly key: keyof FormatScheme;
  readonly label: string;
};

// =============================================================================
// Constants
// =============================================================================

const STYLE_CATEGORIES: readonly StyleCategory[] = [
  { key: "fillStyles", label: "Fill Styles" },
  { key: "lineStyles", label: "Line Styles" },
  { key: "effectStyles", label: "Effect Styles" },
  { key: "bgFillStyles", label: "Background Fill Styles" },
];

const LEVEL_LABELS = ["Subtle", "Moderate", "Intense"] as const;

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const levelLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.xs,
};

const levelContainerStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderRadius: "4px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const emptyStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  textAlign: "center",
  padding: spacingTokens.sm,
};

// =============================================================================
// Helpers
// =============================================================================

function getActiveEffectNames(effects: Effects): readonly string[] {
  const names: string[] = [];
  if (effects.shadow) { names.push("shadow"); }
  if (effects.glow) { names.push("glow"); }
  if (effects.reflection) { names.push("reflection"); }
  if (effects.softEdge) { names.push("softEdge"); }
  return names;
}

function parseFillFromElement(el: XmlElement): BaseFill {
  return parseBaseFill(el) ?? { type: "noFill" };
}

function parseLineFromElement(el: XmlElement): BaseLine {
  return parseLine(el) ?? { width: 1, fill: { type: "noFill" }, cap: "flat", compound: "sng", alignment: "ctr", dash: "solid", join: "round" } as BaseLine;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Format scheme editor displaying fill/line/effect/bgFill style lists.
 */
export function FormatSchemeEditor({ formatScheme, onChange, disabled }: FormatSchemeEditorProps) {
  const handleFillChange = useCallback(
    (categoryKey: keyof FormatScheme, index: number, fill: BaseFill) => {
      const elements = [...formatScheme[categoryKey]];
      elements[index] = serializeFill(fill as Fill);
      onChange({ ...formatScheme, [categoryKey]: elements });
    },
    [formatScheme, onChange],
  );

  return (
    <OptionalPropertySection title="Format Scheme" defaultExpanded={false}>
      <div style={contentStyle}>
        {STYLE_CATEGORIES.map(({ key, label }) => (
          <FormatStyleSection
            key={key}
            categoryKey={key}
            label={label}
            elements={formatScheme[key]}
            onFillChange={handleFillChange}
            disabled={disabled}
          />
        ))}
      </div>
    </OptionalPropertySection>
  );
}

// =============================================================================
// Sub-component
// =============================================================================

type FormatStyleSectionProps = {
  readonly categoryKey: keyof FormatScheme;
  readonly label: string;
  readonly elements: readonly XmlElement[];
  readonly onFillChange: (key: keyof FormatScheme, index: number, fill: BaseFill) => void;
  readonly disabled?: boolean;
};

function FormatStyleSection({ categoryKey, label, elements, onFillChange, disabled }: FormatStyleSectionProps) {
  if (elements.length === 0) {
    return (
      <div>
        <div style={levelLabelStyle}>{label}</div>
        <div style={emptyStyle}>No styles defined</div>
      </div>
    );
  }

  const isFillCategory = categoryKey === "fillStyles" || categoryKey === "bgFillStyles";

  return (
    <div>
      <div style={levelLabelStyle}>{label}</div>
      {elements.map((el, i) => {
        const levelLabel = LEVEL_LABELS[i] ?? `Level ${i + 1}`;

        if (isFillCategory) {
          const fill = parseFillFromElement(el);
          return (
            <div key={i} style={levelContainerStyle}>
              <div style={levelLabelStyle}>{levelLabel}</div>
              <BaseFillEditor
                value={fill}
                onChange={(newFill) => onFillChange(categoryKey, i, newFill)}
                disabled={disabled}
                compact
              />
            </div>
          );
        }

        if (categoryKey === "lineStyles") {
          const line = parseLineFromElement(el);
          const dashLabel = typeof line.dash === "string" ? line.dash : "custom";
          return (
            <div key={i} style={levelContainerStyle}>
              <div style={levelLabelStyle}>{levelLabel} — {line.width}px {dashLabel}</div>
            </div>
          );
        }

        // effectStyles — show summary
        const effects = parseEffects(el);
        const effectNames = effects ? getActiveEffectNames(effects) : [];
        return (
          <div key={i} style={levelContainerStyle}>
            <div style={levelLabelStyle}>{levelLabel} — {effectNames.length > 0 ? effectNames.join(", ") : "none"}</div>
          </div>
        );
      })}
    </div>
  );
}
