/**
 * @file Sample slide preview component
 *
 * Live preview of theme colors and fonts applied to a sample slide layout.
 * Extracted from ThemeEditorCanvas for reuse in ThemeInspectorPanel.
 */

import type { CSSProperties } from "react";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { OFFICE_THEME } from "./presets/office-themes";
import { colorTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type SampleSlidePreviewProps = {
  readonly colorScheme: ColorScheme;
  readonly fontScheme?: FontScheme;
};

// =============================================================================
// Defaults from OFFICE_THEME
// =============================================================================

const DEFAULT_COLORS = OFFICE_THEME.colorScheme;
const DEFAULT_FONTS = OFFICE_THEME.fontScheme;

// =============================================================================
// Styles
// =============================================================================

const slidePreviewStyle: CSSProperties = {
  flex: 1,
  borderRadius: radiusTokens.lg,
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Sample slide preview showing theme colors and fonts in context.
 *
 * Renders a mock slide with:
 * - Title area using major font + dk1
 * - Body text using minor font + dk1/dk2
 * - Hyperlink samples
 * - Color palette visualization (base, accent, link colors)
 * - Footer area on lt2 background
 */
export function SampleSlidePreview({ colorScheme, fontScheme }: SampleSlidePreviewProps) {
  // Use shared defaults from OFFICE_THEME
  const majorFont = fontScheme?.majorFont?.latin ?? DEFAULT_FONTS.majorFont.latin ?? "Calibri Light";
  const minorFont = fontScheme?.minorFont?.latin ?? DEFAULT_FONTS.minorFont.latin ?? "Calibri";
  const majorEastAsian = fontScheme?.majorFont?.eastAsian;
  const minorEastAsian = fontScheme?.minorFont?.eastAsian;

  // Colors with proper defaults
  const dk1 = colorScheme?.dk1 ?? DEFAULT_COLORS.dk1;
  const dk2 = colorScheme?.dk2 ?? DEFAULT_COLORS.dk2;
  const lt1 = colorScheme?.lt1 ?? DEFAULT_COLORS.lt1;
  const lt2 = colorScheme?.lt2 ?? DEFAULT_COLORS.lt2;
  const hlink = colorScheme?.hlink ?? DEFAULT_COLORS.hlink;
  const folHlink = colorScheme?.folHlink ?? DEFAULT_COLORS.folHlink;
  const accent1 = colorScheme?.accent1 ?? DEFAULT_COLORS.accent1;
  const accent2 = colorScheme?.accent2 ?? DEFAULT_COLORS.accent2;
  const accent3 = colorScheme?.accent3 ?? DEFAULT_COLORS.accent3;
  const accent4 = colorScheme?.accent4 ?? DEFAULT_COLORS.accent4;
  const accent5 = colorScheme?.accent5 ?? DEFAULT_COLORS.accent5;
  const accent6 = colorScheme?.accent6 ?? DEFAULT_COLORS.accent6;

  const colorLabelStyle: CSSProperties = {
    fontSize: "9px",
    color: colorTokens.text.tertiary,
    textAlign: "center",
    marginTop: "2px",
  };

  return (
    <div style={slidePreviewStyle}>
      {/* Slide Background (lt1) */}
      <div
        style={{
          flex: 1,
          backgroundColor: `#${lt1}`,
          padding: spacingTokens.lg,
          display: "flex",
          flexDirection: "column",
          gap: spacingTokens.sm,
          overflow: "auto",
        }}
      >
        {/* Title Area (Major Font + dk1) */}
        <div style={{ marginBottom: spacingTokens.xs }}>
          <div style={{ fontFamily: majorFont, fontSize: "24px", fontWeight: 600, color: `#${dk1}` }}>
            Presentation Title
          </div>
          {majorEastAsian && (
            <div style={{ fontFamily: majorEastAsian, fontSize: "14px", color: `#${dk2}`, marginTop: "4px" }}>
              {majorEastAsian} フォント
            </div>
          )}
          <div style={{ fontFamily: minorFont, fontSize: "14px", color: `#${dk2}`, marginTop: "4px" }}>
            Subtitle text using {minorFont}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", gap: spacingTokens.md }}>
          {/* Left: Text samples */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
            {/* Body text (Minor Font + dk1/dk2) */}
            <div style={{ fontFamily: minorFont, fontSize: "12px", color: `#${dk1}` }}>• Primary body text (dk1)</div>
            <div style={{ fontFamily: minorFont, fontSize: "12px", color: `#${dk2}` }}>• Secondary text (dk2)</div>
            {minorEastAsian && (
              <div style={{ fontFamily: minorEastAsian, fontSize: "12px", color: `#${dk1}` }}>
                • {minorEastAsian} テキスト
              </div>
            )}

            {/* Links */}
            <div style={{ fontFamily: minorFont, fontSize: "12px", marginTop: spacingTokens.xs }}>
              <span style={{ color: `#${hlink}`, textDecoration: "underline", cursor: "pointer" }}>Hyperlink</span>
              <span style={{ color: `#${dk2}`, margin: "0 6px" }}>|</span>
              <span style={{ color: `#${folHlink}`, textDecoration: "underline", cursor: "pointer" }}>
                Followed Link
              </span>
            </div>

            {/* Accent colored text samples */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: spacingTokens.sm }}>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent1}` }}>Accent 1</span>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent2}` }}>Accent 2</span>
              <span style={{ fontFamily: minorFont, fontSize: "11px", color: `#${accent3}` }}>Accent 3</span>
            </div>
          </div>

          {/* Right: Color palette visualization */}
          <div style={{ width: "100px", display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
            {/* Base colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${dk1}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>dk1</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${lt1}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.2)",
                  }}
                />
                <div style={colorLabelStyle}>lt1</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${dk2}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>dk2</div>
              </div>
              <div>
                <div
                  style={{
                    height: "20px",
                    backgroundColor: `#${lt2}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>lt2</div>
              </div>
            </div>

            {/* Accent colors */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", marginTop: "4px" }}>
              {[accent1, accent2, accent3, accent4, accent5, accent6].map((c, i) => (
                <div key={i}>
                  <div
                    style={{
                      height: "16px",
                      backgroundColor: `#${c}`,
                      borderRadius: "3px",
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                  />
                  <div style={colorLabelStyle}>{i + 1}</div>
                </div>
              ))}
            </div>

            {/* Link colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginTop: "4px" }}>
              <div>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: `#${hlink}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>hlink</div>
              </div>
              <div>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: `#${folHlink}`,
                    borderRadius: "3px",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <div style={colorLabelStyle}>fol</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (lt2 background) */}
        <div
          style={{
            fontFamily: minorFont,
            fontSize: "10px",
            color: `#${dk2}`,
            backgroundColor: `#${lt2}`,
            padding: "6px 8px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Footer text on lt2 background</span>
          <span>Page 1</span>
        </div>
      </div>
    </div>
  );
}
