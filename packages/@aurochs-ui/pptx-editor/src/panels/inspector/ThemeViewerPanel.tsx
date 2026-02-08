/**
 * @file Theme viewer panel component
 *
 * Displays the theme color scheme and font scheme from the presentation.
 * Read-only view of theme elements for reference.
 */

import type { CSSProperties } from "react";
import type { ColorContext, ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { InspectorSection, Accordion } from "@aurochs-ui/ui-components/layout";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

export type ThemeViewerPanelProps = {
  /** Color context with color scheme and color map */
  readonly colorContext: ColorContext;
  /** Font scheme with major and minor fonts */
  readonly fontScheme?: FontScheme;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const colorGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const colorSwatchStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
};

const swatchBoxStyle: CSSProperties = {
  width: "48px",
  height: "32px",
  borderRadius: "4px",
  border: "1px solid var(--border-subtle, #333)",
};

const colorLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
  textAlign: "center",
};

const colorValueStyle: CSSProperties = {
  fontSize: "10px",
  color: colorTokens.text.tertiary,
  fontFamily: "monospace",
};

const fontInfoStyle: CSSProperties = {
  padding: spacingTokens.sm,
  fontSize: fontTokens.size.sm,
};

const fontRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: `${spacingTokens.xs} 0`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const fontLabelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.xs,
};

const fontValueStyle: CSSProperties = {
  color: colorTokens.text.primary,
  fontWeight: fontTokens.weight.medium,
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

/** Standard color scheme keys in display order */
const COLOR_SCHEME_KEYS = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
] as const;

/** Human-readable labels for color scheme keys */
const COLOR_LABELS: Record<string, string> = {
  dk1: "Dark 1",
  lt1: "Light 1",
  dk2: "Dark 2",
  lt2: "Light 2",
  accent1: "Accent 1",
  accent2: "Accent 2",
  accent3: "Accent 3",
  accent4: "Accent 4",
  accent5: "Accent 5",
  accent6: "Accent 6",
  hlink: "Hyperlink",
  folHlink: "Followed",
};

/**
 * Normalize color value to CSS format with # prefix.
 */
function toCssColor(color: string): string {
  if (color.startsWith("#")) {
    return color;
  }
  return `#${color}`;
}

/**
 * Render a single color swatch.
 */
function ColorSwatch({ colorKey, color }: { colorKey: string; color: string }) {
  const cssColor = toCssColor(color);
  return (
    <div style={colorSwatchStyle}>
      <div style={{ ...swatchBoxStyle, backgroundColor: cssColor }} title={`${colorKey}: ${color}`} />
      <div style={colorLabelStyle}>{COLOR_LABELS[colorKey] ?? colorKey}</div>
      <div style={colorValueStyle}>{color.toUpperCase()}</div>
    </div>
  );
}

/**
 * Render the color scheme grid.
 */
function ColorSchemeSection({ colorScheme }: { colorScheme: ColorScheme }) {
  const colors = COLOR_SCHEME_KEYS.filter((key) => colorScheme[key]).map((key) => ({
    key,
    color: colorScheme[key],
  }));

  if (colors.length === 0) {
    return <div style={emptyStateStyle}>No color scheme defined</div>;
  }

  return (
    <div style={colorGridStyle}>
      {colors.map(({ key, color }) => (
        <ColorSwatch key={key} colorKey={key} color={color} />
      ))}
    </div>
  );
}

const colorMapRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const colorMapSwatchStyle: CSSProperties = {
  width: "20px",
  height: "20px",
  borderRadius: "4px",
  border: "1px solid var(--border-subtle, #333)",
  flexShrink: 0,
};

/**
 * Render the color map section.
 */
function ColorMapSection({ colorMap, colorScheme }: { colorMap: Record<string, string>; colorScheme: ColorScheme }) {
  const entries = Object.entries(colorMap);

  if (entries.length === 0) {
    return <div style={emptyStateStyle}>No color map defined</div>;
  }

  return (
    <div>
      {entries.map(([key, value]) => {
        const resolvedColor = colorScheme[value];
        const cssColor = resolvedColor ? toCssColor(resolvedColor) : undefined;
        return (
          <div key={key} style={colorMapRowStyle}>
            <div
              style={{
                ...colorMapSwatchStyle,
                backgroundColor: cssColor ?? "transparent",
              }}
              title={resolvedColor ?? "unresolved"}
            />
            <span style={{ ...fontLabelStyle, flex: 1 }}>{key}</span>
            <span style={fontValueStyle}>→ {value}</span>
          </div>
        );
      })}
    </div>
  );
}

const fontSectionHeaderStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  padding: `${spacingTokens.sm} 0 ${spacingTokens.xs}`,
};

/**
 * Render the font scheme section.
 */
function FontSchemeSection({ fontScheme }: { fontScheme: FontScheme }) {
  const { majorFont, minorFont } = fontScheme;

  return (
    <div style={fontInfoStyle}>
      <div style={fontSectionHeaderStyle}>Major Font (Headings)</div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>Latin</span>
        <span style={fontValueStyle}>{majorFont.latin ?? "—"}</span>
      </div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>East Asian</span>
        <span style={fontValueStyle}>{majorFont.eastAsian ?? "—"}</span>
      </div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>Complex Script</span>
        <span style={fontValueStyle}>{majorFont.complexScript ?? "—"}</span>
      </div>

      <div style={{ ...fontSectionHeaderStyle, marginTop: spacingTokens.md }}>Minor Font (Body)</div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>Latin</span>
        <span style={fontValueStyle}>{minorFont.latin ?? "—"}</span>
      </div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>East Asian</span>
        <span style={fontValueStyle}>{minorFont.eastAsian ?? "—"}</span>
      </div>
      <div style={fontRowStyle}>
        <span style={fontLabelStyle}>Complex Script</span>
        <span style={fontValueStyle}>{minorFont.complexScript ?? "—"}</span>
      </div>
    </div>
  );
}

/**
 * Render font scheme accordion content.
 */
function FontSchemeAccordionContent({ fontScheme }: { fontScheme?: FontScheme }) {
  if (fontScheme) {
    return <FontSchemeSection fontScheme={fontScheme} />;
  }
  return <div style={emptyStateStyle}>No font scheme defined</div>;
}

/**
 * Theme viewer panel component.
 *
 * Displays the presentation's theme elements:
 * - Color scheme (12 theme colors)
 * - Color map (abstract to concrete mapping)
 * - Font scheme (major and minor fonts)
 */
export function ThemeViewerPanel({ colorContext, fontScheme }: ThemeViewerPanelProps) {
  return (
    <div style={containerStyle}>
      <InspectorSection title="Theme">
        <Accordion title="Color Scheme" defaultExpanded>
          <ColorSchemeSection colorScheme={colorContext.colorScheme} />
        </Accordion>

        <Accordion title="Color Map" defaultExpanded={false}>
          <ColorMapSection colorMap={colorContext.colorMap} colorScheme={colorContext.colorScheme} />
        </Accordion>

        <Accordion title="Font Scheme" defaultExpanded={false}>
          <FontSchemeAccordionContent fontScheme={fontScheme} />
        </Accordion>
      </InspectorSection>
    </div>
  );
}
