/**
 * @file SVG Mode Text Effects Test
 *
 * Tests for ECMA-376 text effects rendered in SVG mode.
 * SVG mode uses SVG elements, CSS filters, and transforms.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */

import type { CheckItem } from "../types";
import { TestSubsection } from "../components";

// =============================================================================
// Text Style Preview Component
// =============================================================================

/**
 * Simple text preview with CSS styling
 */
function TextStylePreview({
  label,
  style,
}: {
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <div className="shape-preview" style={{ minWidth: 120 }}>
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-secondary)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 50,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, ...style }}>Sample</span>
      </div>
      <span className="preview-label">{label}</span>
    </div>
  );
}

// =============================================================================
// Text Warp Preview
// =============================================================================

const textWarpPresets = [
  "textNoShape",
  "textPlain",
  "textStop",
  "textTriangle",
  "textTriangleInverted",
  "textChevron",
  "textChevronInverted",
  "textRingInside",
  "textRingOutside",
  "textArchUp",
  "textArchDown",
  "textCircle",
  "textButton",
  "textArchUpPour",
  "textArchDownPour",
  "textCirclePour",
  "textButtonPour",
  "textCurveUp",
  "textCurveDown",
  "textCanUp",
  "textCanDown",
  "textWave1",
  "textWave2",
  "textDoubleWave1",
  "textWave4",
  "textInflate",
  "textDeflate",
  "textInflateBottom",
  "textDeflateBottom",
  "textInflateTop",
  "textDeflateTop",
  "textDeflateInflate",
  "textDeflateInflateDeflate",
  "textFadeRight",
  "textFadeLeft",
  "textFadeUp",
  "textFadeDown",
  "textSlantUp",
  "textSlantDown",
  "textCascadeUp",
  "textCascadeDown",
];

/**
 * Text warp preview (visual mockup)
 */
function TextWarpPreview({
  warpType,
  label,
}: {
  warpType: string;
  label: string;
}) {
  const getSvgPath = () => {
    switch (warpType) {
      case "textArchUp":
        return (
          <path
            d="M 10 50 Q 60 10 110 50"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textArchDown":
        return (
          <path
            d="M 10 20 Q 60 60 110 20"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textWave1":
        return (
          <path
            d="M 10 35 Q 35 15 60 35 Q 85 55 110 35"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textCircle":
        return <circle cx="60" cy="35" r="25" fill="none" stroke="var(--accent-blue)" strokeWidth="3" />;
      case "textTriangle":
        return (
          <path
            d="M 60 15 L 100 55 L 20 55 Z"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textInflate":
        return (
          <path
            d="M 10 35 Q 60 10 110 35 M 10 35 Q 60 60 110 35"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textSlantUp":
        return (
          <path
            d="M 15 50 L 25 20 L 95 20 L 105 50"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="3"
          />
        );
      case "textFadeRight":
        return (
          <>
            <line x1="15" y1="25" x2="105" y2="30" stroke="var(--accent-blue)" strokeWidth="3" />
            <line x1="15" y1="45" x2="105" y2="40" stroke="var(--accent-blue)" strokeWidth="3" />
          </>
        );
      default:
        return (
          <text x="60" y="40" textAnchor="middle" fill="var(--text-tertiary)" fontSize="12">
            {warpType.replace("text", "")}
          </text>
        );
    }
  };

  return (
    <div className="shape-preview">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <rect x="0" y="0" width="120" height="70" fill="var(--bg-secondary)" rx="4" />
        {getSvgPath()}
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SVG Mode Text Effects Test
 *
 * Tests text rendering capabilities in SVG mode:
 * - Text fill (solid, gradient, pattern, image)
 * - Text outline (stroke)
 * - Text effects (shadow, glow, reflection, soft edge)
 * - 3D approximation (CSS transforms)
 * - Text warp presets
 */
export function SvgTextEffectsTest() {
  // Text Warp items
  const textWarpItems: CheckItem[] = [
    { label: "Arch (up/down)", status: "pending", notes: "parsed only" },
    { label: "Wave (1-4)", status: "pending", notes: "parsed only" },
    { label: "Circle/Ring", status: "pending", notes: "parsed only" },
    { label: "Triangle/Chevron", status: "pending", notes: "parsed only" },
    { label: "Inflate/Deflate", status: "pending", notes: "parsed only" },
    { label: "Fade (4 directions)", status: "pending", notes: "parsed only" },
    { label: "Slant (up/down)", status: "pending", notes: "parsed only" },
    { label: "Cascade (up/down)", status: "pending", notes: "parsed only" },
  ];

  // Text Fill items
  const textFillItems: CheckItem[] = [
    { label: "Solid fill (solidFill)", status: "pass", notes: "fill attribute" },
    { label: "Gradient fill (gradFill)", status: "pass", notes: "linearGradient/radialGradient defs" },
    { label: "Pattern fill (pattFill)", status: "pass", notes: "pattern defs" },
    { label: "Image fill (blipFill)", status: "pass", notes: "pattern with image" },
  ];

  // Text Outline items
  const textOutlineItems: CheckItem[] = [
    { label: "Solid outline (ln)", status: "pass", notes: "stroke attribute" },
    { label: "Outline width (w)", status: "pass", notes: "stroke-width" },
    { label: "Outline color", status: "pass", notes: "stroke color" },
  ];

  // Text Effects items
  const textEffectItems: CheckItem[] = [
    { label: "Shadow (outerShdw)", status: "pass", notes: "feDropShadow filter" },
    { label: "Glow (glow)", status: "pass", notes: "feGaussianBlur filter" },
    { label: "Reflection (reflection)", status: "partial", notes: "CSS transform approximation" },
    { label: "Soft edge (softEdge)", status: "pass", notes: "feGaussianBlur edge filter" },
  ];

  // 3D Approximation items
  const text3dItems: CheckItem[] = [
    { label: "3D scene (scene3d)", status: "partial", notes: "CSS perspective transform fallback" },
    { label: "3D shape (sp3d)", status: "pending", notes: "No true 3D in SVG" },
    { label: "Flat text (flatTx)", status: "pending", notes: "N/A for SVG" },
    { label: "Bevel effects (bevel)", status: "partial", notes: "SVG gradient approximation" },
  ];

  return (
    <div className="test-section">
      <h3>SVG Mode - Text Effects</h3>
      <p className="section-description">
        ECMA-376 text effects rendered using SVG elements, CSS filters, and transforms.
        <br />
        Good for compatibility but limited 3D support.
      </p>

      <TestSubsection title="Text Warp Presets (prstTxWarp)" items={textWarpItems}>
        <div className="shape-row">
          <TextWarpPreview warpType="textArchUp" label="Arch Up" />
          <TextWarpPreview warpType="textArchDown" label="Arch Down" />
          <TextWarpPreview warpType="textWave1" label="Wave" />
          <TextWarpPreview warpType="textCircle" label="Circle" />
          <TextWarpPreview warpType="textTriangle" label="Triangle" />
          <TextWarpPreview warpType="textInflate" label="Inflate" />
          <TextWarpPreview warpType="textSlantUp" label="Slant Up" />
          <TextWarpPreview warpType="textFadeRight" label="Fade Right" />
        </div>
        <p className="pattern-info">
          {textWarpPresets.length} preset text warps defined in ECMA-376. Parser complete, renderer pending.
        </p>
        <div className="pattern-names">{textWarpPresets.join(", ")}</div>
      </TestSubsection>

      <TestSubsection title="Text Fill" items={textFillItems}>
        <div className="shape-row">
          <TextStylePreview label="Solid (Blue)" style={{ color: "#4F81BD" }} />
          <TextStylePreview label="Solid (Red)" style={{ color: "#C0504D" }} />
          <TextStylePreview
            label="Gradient"
            style={{
              background: "linear-gradient(90deg, #4F81BD, #9BBB59)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          />
          <TextStylePreview
            label="Gradient (Vertical)"
            style={{
              background: "linear-gradient(180deg, #8064A2, #4BACC6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Text Outline" items={textOutlineItems}>
        <div className="shape-row">
          <TextStylePreview
            label="Blue Outline"
            style={{ color: "transparent", WebkitTextStroke: "1px #4F81BD" }}
          />
          <TextStylePreview
            label="Red Outline"
            style={{ color: "transparent", WebkitTextStroke: "2px #C0504D" }}
          />
          <TextStylePreview
            label="Fill + Outline"
            style={{ color: "#FFFFFF", WebkitTextStroke: "1px #1F497D" }}
          />
          <TextStylePreview
            label="Thick Outline"
            style={{ color: "transparent", WebkitTextStroke: "3px #9BBB59" }}
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Text Effects" items={textEffectItems}>
        <div className="shape-row">
          <TextStylePreview
            label="Shadow"
            style={{ color: "#4F81BD", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
          />
          <TextStylePreview
            label="Glow"
            style={{ color: "#9BBB59", textShadow: "0 0 10px #9BBB59, 0 0 20px #9BBB59" }}
          />
          <TextStylePreview
            label="Multiple Shadows"
            style={{
              color: "#FFFFFF",
              textShadow: "1px 1px 0 #4F81BD, 2px 2px 0 #1F497D, 3px 3px 4px rgba(0,0,0,0.3)",
            }}
          />
        </div>
        <p className="pattern-info">
          SVG filters: feDropShadow, feGaussianBlur, feFlood, feComposite.
        </p>
      </TestSubsection>

      <TestSubsection title="3D Approximation" items={text3dItems}>
        <p className="pattern-info">
          SVG cannot render true 3D. Uses CSS perspective transforms and gradient approximations.
          For true 3D rendering, use WebGL mode.
        </p>
      </TestSubsection>
    </div>
  );
}
