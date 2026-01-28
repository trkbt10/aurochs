/**
 * @file Glyph Extraction Test Page
 *
 * Visual debugger for glyph contour extraction.
 * Tests hole detection for characters like 門, O, A, B, D.
 */

import { useState, useMemo, useCallback } from "react";
import { extractGlyphContour } from "@oxen-office/pptx-render/glyph";
import type { GlyphContour, GlyphStyleKey } from "@oxen-office/pptx-render/glyph";
import "./GlyphTestPage.css";

// =============================================================================
// Types
// =============================================================================

type GlyphTestPageProps = {
  readonly onBack: () => void;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CHARS = "門OABDRPQe04689@%&あ";
const DEFAULT_FONT = "Arial";
const DEFAULT_SIZE = 64;

const PRESET_FONTS = [
  "Arial",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Impact",
  "Comic Sans MS",
  "Trebuchet MS",
  "Palatino Linotype",
  "Lucida Console",
];

// =============================================================================
// Helpers
// =============================================================================

function pathToSvgD(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) {return "";}
  const [first, ...rest] = points;
  const moveTo = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  const lineTo = rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return `${moveTo} ${lineTo} Z`;
}

function calculateSignedArea(points: readonly { x: number; y: number }[]): number {
  return points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

// =============================================================================
// Components
// =============================================================================

function GlyphDisplay({ glyph, scale }: { glyph: GlyphContour; scale: number }) {
  const { paths, bounds, metrics } = glyph;

  // Calculate SVG viewBox
  const padding = 5;
  const width = Math.max(bounds.maxX - bounds.minX, metrics.advanceWidth, 10);
  const height = Math.max(bounds.maxY - bounds.minY, metrics.ascent + metrics.descent, 10);
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}`;

  const outerPaths = paths.filter((p) => !p.isHole);
  const holePaths = paths.filter((p) => p.isHole);

  return (
    <div className="glyph-display">
      <div className="glyph-char">{glyph.char}</div>
      <svg
        className="glyph-svg"
        viewBox={viewBox}
        width={width * scale}
        height={height * scale}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect x={bounds.minX - padding} y={bounds.minY - padding} width={width + padding * 2} height={height + padding * 2} fill="url(#grid)" />

        {/* Baseline */}
        <line
          x1={bounds.minX - padding}
          y1={0}
          x2={bounds.maxX + padding}
          y2={0}
          stroke="#666"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />

        {/* Outer contours (blue fill) */}
        {outerPaths.map((path, i) => (
          <path
            key={`outer-${i}`}
            d={pathToSvgD(path.points)}
            fill="rgba(59, 130, 246, 0.5)"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />
        ))}

        {/* Hole contours (red stroke, no fill) */}
        {holePaths.map((path, i) => (
          <path
            key={`hole-${i}`}
            d={pathToSvgD(path.points)}
            fill="rgba(239, 68, 68, 0.3)"
            stroke="#ef4444"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      <div className="glyph-info">
        <div className="info-row">
          <span className="info-label">Paths:</span>
          <span className="info-value">{paths.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Outer:</span>
          <span className="info-value outer">{outerPaths.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Holes:</span>
          <span className="info-value hole">{holePaths.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Advance:</span>
          <span className="info-value">{metrics.advanceWidth.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function PathDetails({ glyph }: { glyph: GlyphContour }) {
  return (
    <div className="path-details">
      <h4>Path Details for "{glyph.char}"</h4>
      <div className="path-list">
        {glyph.paths.map((path, i) => {
          const area = calculateSignedArea(path.points);
          return (
            <div key={i} className={`path-item ${path.isHole ? "hole" : "outer"}`}>
              <span className="path-index">#{i + 1}</span>
              <span className="path-type">{path.isHole ? "Hole" : "Outer"}</span>
              <span className="path-points">{path.points.length} pts</span>
              <span className="path-area">area: {area.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================











export function GlyphTestPage({ onBack }: GlyphTestPageProps) {
  const [inputText, setInputText] = useState(DEFAULT_CHARS);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT);
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [customFont, setCustomFont] = useState("");

  const style: GlyphStyleKey = useMemo(
    () => ({
      fontSize,
      fontWeight: 400,
      fontStyle: "normal",
    }),
    [fontSize]
  );

  const effectiveFont = customFont || fontFamily;

  const glyphs = useMemo(() => {
    const chars = [...inputText];
    const results: { char: string; glyph: GlyphContour | null; error: string | null }[] = [];

    for (const char of chars) {
      if (char === " " || char === "\n" || char === "\t") {
        continue;
      }
      try {
        const glyph = extractGlyphContour(char, effectiveFont, style);
        results.push({ char, glyph, error: null });
      } catch (e) {
        results.push({ char, glyph: null, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return results;
  }, [inputText, effectiveFont, style]);

  const selectedGlyph = useMemo(() => {
    if (!selectedChar) {return null;}
    return glyphs.find((g) => g.char === selectedChar)?.glyph ?? null;
  }, [selectedChar, glyphs]);

  const handleCharClick = useCallback((char: string) => {
    setSelectedChar((prev) => (prev === char ? null : char));
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    const successful = glyphs.filter((g) => g.glyph !== null);
    const withHoles = successful.filter((g) => g.glyph!.paths.some((p) => p.isHole));
    const totalPaths = successful.reduce((sum, g) => sum + g.glyph!.paths.length, 0);
    const totalHoles = successful.reduce((sum, g) => sum + g.glyph!.paths.filter((p) => p.isHole).length, 0);
    return {
      total: glyphs.length,
      successful: successful.length,
      withHoles: withHoles.length,
      totalPaths,
      totalHoles,
    };
  }, [glyphs]);

  return (
    <div className="glyph-test-page">
      {/* Header */}
      <header className="test-header">
        <button className="back-button" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className="test-title">Glyph Extraction Test</h1>
      </header>

      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <label>Text Input</label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter characters to test..."
            className="text-input"
          />
        </div>

        <div className="control-group">
          <label>Font Family</label>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="font-select">
            {PRESET_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customFont}
            onChange={(e) => setCustomFont(e.target.value)}
            placeholder="Or enter custom font..."
            className="custom-font-input"
          />
        </div>

        <div className="control-group">
          <label>Font Size: {fontSize}px</label>
          <input
            type="range"
            min="16"
            max="128"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="size-slider"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <span className="stat">
          <strong>{stats.total}</strong> chars
        </span>
        <span className="stat">
          <strong>{stats.successful}</strong> extracted
        </span>
        <span className="stat">
          <strong>{stats.withHoles}</strong> with holes
        </span>
        <span className="stat">
          <strong>{stats.totalPaths}</strong> paths
        </span>
        <span className="stat hole">
          <strong>{stats.totalHoles}</strong> holes detected
        </span>
      </div>

      {/* Glyph Grid */}
      <div className="glyph-grid">
        {glyphs.map(({ char, glyph, error }) => (
          <div
            key={char}
            className={`glyph-card ${error ? "error" : ""} ${selectedChar === char ? "selected" : ""}`}
            onClick={() => handleCharClick(char)}
          >
            {glyph ? (
              <GlyphDisplay glyph={glyph} scale={2} />
            ) : (
              <div className="glyph-error">
                <div className="error-char">{char}</div>
                <div className="error-msg">{error}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Glyph Details */}
      {selectedGlyph && (
        <div className="selected-details">
          <PathDetails glyph={selectedGlyph} />
        </div>
      )}
    </div>
  );
}
