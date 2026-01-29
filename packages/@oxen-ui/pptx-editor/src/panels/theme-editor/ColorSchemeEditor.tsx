/**
 * @file Color scheme editor component
 *
 * Editor for the 12 standard theme colors.
 */

import { useCallback, type CSSProperties } from "react";
import type { ColorScheme } from "@oxen-office/ooxml/domain/color-context";
import type { SchemeColorName } from "@oxen-office/ooxml/domain/color";
import { ColorPickerPopover } from "../../ui/color/ColorPickerPopover";
import { InspectorSection, Accordion } from "@oxen-ui/ui-components/layout";
import { colorTokens, fontTokens, spacingTokens } from "@oxen-ui/ui-components/design-tokens";
import { COLOR_LABELS } from "./types";

export type ColorSchemeEditorProps = {
  readonly colorScheme: ColorScheme;
  readonly onColorChange: (name: SchemeColorName, color: string) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const colorGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: spacingTokens.md,
  padding: spacingTokens.sm,
};

const colorItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const colorLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  flex: 1,
};

const swatchStyle: CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "4px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  cursor: "pointer",
};

const accentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: spacingTokens.md,
  padding: spacingTokens.sm,
};

const accentItemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const accentLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  textAlign: "center",
};

/**
 * Normalize color value (remove # prefix if present).
 */
function normalizeColor(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}

type ColorItemProps = {
  readonly colorKey: SchemeColorName;
  readonly color: string;
  readonly onChange: (color: string) => void;
  readonly disabled?: boolean;
  readonly layout: "horizontal" | "vertical";
};

function ColorItem({ colorKey, color, onChange, disabled, layout }: ColorItemProps) {
  const normalizedColor = normalizeColor(color);

  if (layout === "vertical") {
    return (
      <div style={accentItemStyle}>
        <ColorPickerPopover
          value={normalizedColor}
          onChange={onChange}
          disabled={disabled}
          trigger={
            <div
              style={{
                ...swatchStyle,
                width: "48px",
                height: "32px",
                backgroundColor: `#${normalizedColor}`,
              }}
            />
          }
        />
        <div style={accentLabelStyle}>{COLOR_LABELS[colorKey]}</div>
      </div>
    );
  }

  return (
    <div style={colorItemStyle}>
      <ColorPickerPopover
        value={normalizedColor}
        onChange={onChange}
        disabled={disabled}
        trigger={
          <div
            style={{
              ...swatchStyle,
              backgroundColor: `#${normalizedColor}`,
            }}
          />
        }
      />
      <div style={colorLabelStyle}>{COLOR_LABELS[colorKey]}</div>
    </div>
  );
}

/**
 * Color scheme editor component.
 *
 * Allows editing of all 12 theme colors:
 * - Base colors: dk1, lt1, dk2, lt2
 * - Accent colors: accent1-6
 * - Hyperlink colors: hlink, folHlink
 */
export function ColorSchemeEditor({
  colorScheme,
  onColorChange,
  disabled,
}: ColorSchemeEditorProps) {
  const handleColorChange = useCallback(
    (name: SchemeColorName) => (color: string) => {
      onColorChange(name, color);
    },
    [onColorChange]
  );

  const baseColors: SchemeColorName[] = ["dk1", "lt1", "dk2", "lt2"];
  const accentColors: SchemeColorName[] = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
  const hyperlinkColors: SchemeColorName[] = ["hlink", "folHlink"];

  return (
    <div style={containerStyle}>
      <InspectorSection title="Color Scheme">
        <Accordion title="Base Colors" defaultExpanded>
          <div style={colorGridStyle}>
            {baseColors.map((key) => (
              <ColorItem
                key={key}
                colorKey={key}
                color={colorScheme[key] ?? "000000"}
                onChange={handleColorChange(key)}
                disabled={disabled}
                layout="horizontal"
              />
            ))}
          </div>
        </Accordion>

        <Accordion title="Accent Colors" defaultExpanded>
          <div style={accentGridStyle}>
            {accentColors.map((key) => (
              <ColorItem
                key={key}
                colorKey={key}
                color={colorScheme[key] ?? "000000"}
                onChange={handleColorChange(key)}
                disabled={disabled}
                layout="vertical"
              />
            ))}
          </div>
        </Accordion>

        <Accordion title="Hyperlink Colors" defaultExpanded={false}>
          <div style={colorGridStyle}>
            {hyperlinkColors.map((key) => (
              <ColorItem
                key={key}
                colorKey={key}
                color={colorScheme[key] ?? "000000"}
                onChange={handleColorChange(key)}
                disabled={disabled}
                layout="horizontal"
              />
            ))}
          </div>
        </Accordion>
      </InspectorSection>
    </div>
  );
}
