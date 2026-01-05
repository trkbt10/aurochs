/**
 * @file DrawingML Test Page
 *
 * Interactive test page for DrawingML rendering features.
 * Allows testing colors, fills, effects, and backgrounds with live preview.
 */

import { useState, useMemo } from "react";
import type { Color, Fill, Line } from "@lib/pptx/domain";
import type { Effects } from "@lib/pptx/domain/effects";
import type { SlideSize, Pixels } from "@lib/pptx/domain/types";
import { px, deg, pct } from "@lib/pptx/domain/types";
import { RenderProvider } from "@lib/pptx/render/react/context";
import { SvgDefsProvider } from "@lib/pptx/render/react/hooks/useSvgDefs";
import {
  ColorSwatch,
  ColorSwatchRow,
  useShapeStyle,
  getSupportedPatterns,
} from "@lib/pptx/render/react/drawing-ml";
import "./DrawingMLTestPage.css";

// =============================================================================
// Types
// =============================================================================

type DrawingMLTestPageProps = {
  readonly onBack: () => void;
};

type TestSection = "colors" | "fills" | "effects" | "combined";

// =============================================================================
// Test Fixtures
// =============================================================================

const testSlideSize: SlideSize = {
  width: px(960) as Pixels,
  height: px(540) as Pixels,
};

const testColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

const testColors: Array<{ label: string; color: Color }> = [
  { label: "sRGB Red", color: { spec: { type: "srgb", value: "FF0000" } } },
  { label: "sRGB Green", color: { spec: { type: "srgb", value: "00FF00" } } },
  { label: "sRGB Blue", color: { spec: { type: "srgb", value: "0000FF" } } },
  { label: "Scheme accent1", color: { spec: { type: "scheme", value: "accent1" } } },
  { label: "Scheme accent2", color: { spec: { type: "scheme", value: "accent2" } } },
  { label: "50% Alpha", color: { spec: { type: "srgb", value: "4F81BD" }, transform: { alpha: pct(50) } } },
  { label: "Shade 50%", color: { spec: { type: "srgb", value: "FF0000" }, transform: { shade: pct(50) } } },
  { label: "Tint 50%", color: { spec: { type: "srgb", value: "0000FF" }, transform: { tint: pct(50) } } },
];

// =============================================================================
// Components
// =============================================================================

/**
 * Color test section
 */
function ColorTestSection() {
  return (
    <div className="test-section">
      <h3>Color Resolution</h3>
      <p className="section-description">
        Tests sRGB, scheme, and color transforms (alpha, shade, tint).
      </p>
      <div className="color-grid">
        {testColors.map((item, i) => (
          <div key={i} className="color-item">
            <ColorSwatch color={item.color} size={48} showInfo />
            <span className="color-label">{item.label}</span>
          </div>
        ))}
      </div>

      <h4>Color Scheme</h4>
      <div className="scheme-row">
        <ColorSwatchRow
          colors={[
            { spec: { type: "scheme", value: "dk1" } },
            { spec: { type: "scheme", value: "lt1" } },
            { spec: { type: "scheme", value: "accent1" } },
            { spec: { type: "scheme", value: "accent2" } },
            { spec: { type: "scheme", value: "accent3" } },
            { spec: { type: "scheme", value: "accent4" } },
            { spec: { type: "scheme", value: "accent5" } },
            { spec: { type: "scheme", value: "accent6" } },
          ]}
          labels={["dk1", "lt1", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]}
          size={36}
        />
      </div>
    </div>
  );
}

/**
 * Fill test section
 */
function FillTestSection() {
  const supportedPatterns = useMemo(() => getSupportedPatterns().slice(0, 12), []);

  return (
    <div className="test-section">
      <h3>Fill Types</h3>
      <p className="section-description">
        Tests solid fills, gradients, and pattern fills.
      </p>

      <div className="fill-examples">
        <h4>Solid Fills</h4>
        <div className="shape-row">
          <ShapePreview
            fill={{ type: "solidFill", color: { spec: { type: "srgb", value: "4F81BD" } } }}
            label="Solid Blue"
          />
          <ShapePreview
            fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } }}
            label="Scheme accent2"
          />
          <ShapePreview
            fill={{
              type: "solidFill",
              color: { spec: { type: "srgb", value: "00FF00" }, transform: { alpha: pct(50) } },
            }}
            label="50% Alpha"
          />
        </div>

        <h4>Gradient Fills</h4>
        <div className="shape-row">
          <ShapePreview
            fill={{
              type: "gradientFill",
              gradientStops: [
                { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
                { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
              ],
              linear: { angle: deg(90) },
            }}
            label="Linear 90°"
          />
          <ShapePreview
            fill={{
              type: "gradientFill",
              gradientStops: [
                { position: pct(0), color: { spec: { type: "srgb", value: "FFFFFF" } } },
                { position: pct(50), color: { spec: { type: "scheme", value: "accent1" } } },
                { position: pct(100), color: { spec: { type: "srgb", value: "000000" } } },
              ],
              linear: { angle: deg(45) },
            }}
            label="3-stop 45°"
          />
        </div>

        <h4>Supported Pattern Fills</h4>
        <p className="pattern-info">{supportedPatterns.length} patterns supported</p>
        <div className="pattern-names">
          {supportedPatterns.join(", ")}
        </div>
      </div>
    </div>
  );
}

/**
 * Effects test section
 */
function EffectsTestSection() {
  const shadowEffect = useMemo(() => ({
    shadow: {
      type: "outer" as const,
      color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
      blurRadius: px(8),
      distance: px(4),
      direction: deg(45),
    },
  }), []);

  const glowEffect = useMemo(() => ({
    glow: {
      color: { spec: { type: "srgb", value: "FFD700" }, transform: { alpha: pct(75) } },
      radius: px(10),
    },
  }), []);

  const softEdgeEffect = useMemo(() => ({
    softEdge: { radius: px(8) },
  }), []);

  return (
    <div className="test-section">
      <h3>Effects</h3>
      <p className="section-description">
        Tests shadow, glow, and soft edge effects as SVG filters.
      </p>

      <div className="effects-row">
        <EffectPreview effects={shadowEffect} label="Outer Shadow" />
        <EffectPreview effects={glowEffect} label="Glow" />
        <EffectPreview effects={softEdgeEffect} label="Soft Edge" />
        <EffectPreview
          effects={{ ...shadowEffect, ...glowEffect }}
          label="Shadow + Glow"
        />
      </div>
    </div>
  );
}

/**
 * Combined test section with all features
 */
function CombinedTestSection() {
  return (
    <div className="test-section">
      <h3>Combined Styles</h3>
      <p className="section-description">
        Tests fill + stroke + effects combined using useShapeStyle hook.
      </p>

      <div className="combined-row">
        <CombinedShapePreview
          fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "srgb", value: "1F497D" } } },
            width: px(3),
            compound: "single",
            alignment: "center",
            cap: "flat",
            dash: "solid",
          }}
          effects={{
            shadow: {
              type: "outer",
              color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
              blurRadius: px(6),
              distance: px(3),
              direction: deg(45),
            },
          }}
          label="Solid + Stroke + Shadow"
        />
        <CombinedShapePreview
          fill={{
            type: "gradientFill",
            gradientStops: [
              { position: pct(0), color: { spec: { type: "scheme", value: "accent3" } } },
              { position: pct(100), color: { spec: { type: "scheme", value: "accent4" } } },
            ],
            linear: { angle: deg(135) },
          }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "srgb", value: "8064A2" } } },
            width: px(2),
            compound: "single",
            alignment: "center",
            cap: "round",
            dash: "dash",
          }}
          effects={{
            glow: {
              color: { spec: { type: "scheme", value: "accent4" }, transform: { alpha: pct(60) } },
              radius: px(8),
            },
          }}
          label="Gradient + Dashed + Glow"
        />
      </div>
    </div>
  );
}

/**
 * Shape preview component
 */
function ShapePreview({
  fill,
  label,
}: {
  fill: Fill;
  label: string;
}) {
  const style = useShapeStyle({ fill, width: 120, height: 80 });

  return (
    <div className="shape-preview">
      <svg width="120" height="80" viewBox="0 0 120 80">
        <defs>{style.defs}</defs>
        <rect
          x="10"
          y="10"
          width="100"
          height="60"
          rx="8"
          {...style.svgProps}
        />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Effect preview component
 */
function EffectPreview({
  effects,
  label,
}: {
  effects: Effects;
  label: string;
}) {
  const style = useShapeStyle({
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
    effects,
    width: 100,
    height: 70,
  });

  return (
    <div className="effect-preview">
      <svg width="120" height="90" viewBox="0 0 120 90">
        <defs>{style.defs}</defs>
        <rect
          x="20"
          y="20"
          width="80"
          height="50"
          rx="6"
          {...style.svgProps}
        />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Combined shape preview component
 */
function CombinedShapePreview({
  fill,
  line,
  effects,
  label,
}: {
  fill: Fill;
  line: Line;
  effects: Effects;
  label: string;
}) {
  const style = useShapeStyle({ fill, line, effects, width: 140, height: 100 });

  return (
    <div className="combined-preview">
      <svg width="160" height="120" viewBox="0 0 160 120">
        <defs>{style.defs}</defs>
        <rect
          x="20"
          y="20"
          width="120"
          height="80"
          rx="10"
          {...style.svgProps}
        />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DrawingML Test Page component.
 */
export function DrawingMLTestPage({ onBack }: DrawingMLTestPageProps) {
  const [activeSection, setActiveSection] = useState<TestSection>("colors");

  return (
    <RenderProvider slideSize={testSlideSize} colorContext={testColorContext}>
      <SvgDefsProvider>
        <div className="drawingml-test-page">
          <header className="test-header">
            <button className="back-button" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
            <h1 className="test-title">DrawingML Test Page</h1>
          </header>

          <nav className="test-nav">
            <button
              className={`nav-button ${activeSection === "colors" ? "active" : ""}`}
              onClick={() => setActiveSection("colors")}
            >
              Colors
            </button>
            <button
              className={`nav-button ${activeSection === "fills" ? "active" : ""}`}
              onClick={() => setActiveSection("fills")}
            >
              Fills
            </button>
            <button
              className={`nav-button ${activeSection === "effects" ? "active" : ""}`}
              onClick={() => setActiveSection("effects")}
            >
              Effects
            </button>
            <button
              className={`nav-button ${activeSection === "combined" ? "active" : ""}`}
              onClick={() => setActiveSection("combined")}
            >
              Combined
            </button>
          </nav>

          <main className="test-content">
            {activeSection === "colors" && <ColorTestSection />}
            {activeSection === "fills" && <FillTestSection />}
            {activeSection === "effects" && <EffectsTestSection />}
            {activeSection === "combined" && <CombinedTestSection />}
          </main>
        </div>
      </SvgDefsProvider>
    </RenderProvider>
  );
}
