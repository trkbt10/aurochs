/**
 * @file Effects Test Section
 *
 * Tests for ECMA-376 effect containers and filter rendering.
 */

import { px, deg, pct } from "@lib/pptx/domain/types";
import { type CheckItem, TestSubsection, EffectPreview } from "./common";

/**
 * Effects test section component
 */
export function EffectsTest() {
  const shadowItems: CheckItem[] = [
    { label: "Outer shadow", status: "pass" },
    { label: "Inner shadow", status: "pass" },
    { label: "Shadow direction", status: "pass" },
    { label: "Shadow blur", status: "pass" },
    { label: "Shadow distance", status: "pass" },
    { label: "Preset shadows (1-20)", status: "pending" },
  ];

  const otherEffectItems: CheckItem[] = [
    { label: "Glow effect", status: "pass" },
    { label: "Soft edge", status: "pass" },
    { label: "Reflection", status: "pending" },
    { label: "Alpha effects", status: "pending" },
    { label: "Color effects", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Effects</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8 - Effect containers and filter rendering.
      </p>

      <TestSubsection title="Shadow Effects" items={shadowItems}>
        <div className="effects-row">
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
                blurRadius: px(8),
                distance: px(4),
                direction: deg(45),
              },
            }}
            label="Outer 45°"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
                blurRadius: px(6),
                distance: px(4),
                direction: deg(135),
              },
            }}
            label="Outer 135°"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "inner",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(60) } },
                blurRadius: px(6),
                distance: px(3),
                direction: deg(225),
              },
            }}
            label="Inner"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(30) } },
                blurRadius: px(16),
                distance: px(6),
                direction: deg(90),
              },
            }}
            label="Large Blur"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Glow & Soft Edge" items={otherEffectItems}>
        <div className="effects-row">
          <EffectPreview
            effects={{
              glow: {
                color: { spec: { type: "srgb", value: "FFD700" }, transform: { alpha: pct(75) } },
                radius: px(10),
              },
            }}
            label="Gold Glow"
          />
          <EffectPreview
            effects={{
              glow: {
                color: { spec: { type: "scheme", value: "accent1" }, transform: { alpha: pct(60) } },
                radius: px(8),
              },
            }}
            label="Accent Glow"
          />
          <EffectPreview
            effects={{
              softEdge: { radius: px(8) },
            }}
            label="Soft Edge"
          />
          <EffectPreview
            effects={{
              softEdge: { radius: px(16) },
            }}
            label="Large Soft"
          />
        </div>
      </TestSubsection>

      <TestSubsection
        title="Combined Effects"
        items={[{ label: "Multiple effects", status: "pass" }]}
      >
        <div className="effects-row">
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
                blurRadius: px(6),
                distance: px(3),
                direction: deg(45),
              },
              glow: {
                color: { spec: { type: "scheme", value: "accent1" }, transform: { alpha: pct(50) } },
                radius: px(6),
              },
            }}
            label="Shadow + Glow"
          />
        </div>
      </TestSubsection>
    </div>
  );
}
