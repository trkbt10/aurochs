/**
 * @file Fill Test Section
 *
 * Tests for ECMA-376 fill types.
 */

import { useMemo } from "react";
import type { PatternType } from "@lib/pptx/domain";
import { getSupportedPatterns } from "@lib/pptx/render/react/drawing-ml";
import { type CheckItem, TestSubsection, ShapePreview, makeGradient } from "./common";

/**
 * Fill test section component
 */
export function FillTest() {
  const supportedPatterns = useMemo(() => getSupportedPatterns(), []);

  const fillTypeItems: CheckItem[] = [
    { label: "NoFill", status: "pass" },
    { label: "SolidFill", status: "pass" },
    { label: "GradientFill (linear)", status: "pass" },
    { label: "GradientFill (radial)", status: "pass" },
    { label: "PatternFill", status: "pass", notes: `${supportedPatterns.length} patterns` },
    { label: "BlipFill (image)", status: "partial", notes: "dataURL only" },
    { label: "GroupFill", status: "pending" },
  ];

  const gradientItems: CheckItem[] = [
    { label: "2-stop gradient", status: "pass" },
    { label: "Multi-stop gradient", status: "pass" },
    { label: "Angle rotation", status: "pass" },
    { label: "Radial (path) gradient", status: "pass" },
    { label: "TileRect", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Fill Types</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8 - Fill properties for shapes.
      </p>

      <TestSubsection title="Fill Types" items={fillTypeItems}>
        <div className="shape-row">
          <ShapePreview fill={{ type: "noFill" }} label="NoFill" />
          <ShapePreview
            fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } }}
            label="Solid"
          />
          <ShapePreview
            fill={makeGradient(90, { pos: 0, color: "FF0000" }, { pos: 100, color: "0000FF" })}
            label="Linear Grad"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "smGrid" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "4F81BD" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="Pattern"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Gradient Variations" items={gradientItems}>
        <div className="shape-row">
          <ShapePreview
            fill={makeGradient(0, { pos: 0, color: { scheme: "accent1" } }, { pos: 100, color: { scheme: "accent2" } })}
            label="0° (→)"
          />
          <ShapePreview
            fill={makeGradient(45, { pos: 0, color: { scheme: "accent3" } }, { pos: 100, color: { scheme: "accent4" } })}
            label="45° (↘)"
          />
          <ShapePreview
            fill={makeGradient(90, { pos: 0, color: { scheme: "accent5" } }, { pos: 100, color: { scheme: "accent6" } })}
            label="90° (↓)"
          />
          <ShapePreview
            fill={makeGradient(
              135,
              { pos: 0, color: "FFFFFF" },
              { pos: 50, color: { scheme: "accent1" } },
              { pos: 100, color: "000000" },
            )}
            label="3-stop 135°"
          />
        </div>
      </TestSubsection>

      <TestSubsection
        title={`Pattern Fills (${supportedPatterns.length} types)`}
        items={[
          { label: "Grid patterns", status: "pass" },
          { label: "Diagonal patterns", status: "pass" },
          { label: "Percentage patterns", status: "pass" },
          { label: "Specialty patterns", status: "partial" },
        ]}
      >
        <div className="shape-row">
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "smGrid" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "4F81BD" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="smGrid"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "ltUpDiag" as PatternType,
              foregroundColor: { spec: { type: "scheme", value: "accent2" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="ltUpDiag"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "pct25" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "000000" } },
              backgroundColor: { spec: { type: "scheme", value: "accent1" } },
            }}
            label="pct25"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "horzBrick" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "8B4513" } },
              backgroundColor: { spec: { type: "srgb", value: "F4E4D4" } },
            }}
            label="horzBrick"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "diagCross" as PatternType,
              foregroundColor: { spec: { type: "scheme", value: "accent3" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="diagCross"
          />
        </div>
        <div className="pattern-names">
          {supportedPatterns.join(", ")}
        </div>
      </TestSubsection>
    </div>
  );
}
