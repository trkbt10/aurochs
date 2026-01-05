/**
 * @file Line Test Section
 *
 * Tests for ECMA-376 line/stroke styles.
 */

import type { Line, LineCap, DashStyle } from "@lib/pptx/domain";
import { px, pct } from "@lib/pptx/domain/types";
import { type CheckItem, TestSubsection, LinePreview } from "./common";

/**
 * Line test section component
 */
export function LineTest() {
  const capJoinItems: CheckItem[] = [
    { label: "LineCap: flat", status: "pass" },
    { label: "LineCap: round", status: "pass" },
    { label: "LineCap: square", status: "pass" },
    { label: "LineJoin: miter", status: "pass" },
    { label: "LineJoin: round", status: "pass" },
    { label: "LineJoin: bevel", status: "pass" },
  ];

  const dashItems: CheckItem[] = [
    { label: "solid", status: "pass" },
    { label: "dot", status: "pass" },
    { label: "dash", status: "pass" },
    { label: "lgDash", status: "pass" },
    { label: "dashDot", status: "pass" },
    { label: "lgDashDot", status: "pass" },
    { label: "lgDashDotDot", status: "pass" },
    { label: "Custom dash", status: "partial" },
  ];

  const compoundItems: CheckItem[] = [
    { label: "Single (sng)", status: "pass" },
    { label: "Double (dbl)", status: "pending" },
    { label: "ThickThin", status: "pending" },
    { label: "ThinThick", status: "pending" },
    { label: "Triple (tri)", status: "pending" },
  ];

  const baseLine = (overrides: Partial<Line>): Line => ({
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "lt1" } } },
    width: px(3),
    compound: "sng",
    alignment: "ctr",
    cap: "flat",
    dash: "solid",
    join: "round",
    ...overrides,
  });

  return (
    <div className="test-section">
      <h3>Line/Stroke Styles</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8.36 - Line properties (a:ln).
      </p>

      <TestSubsection title="Line Width" items={[{ label: "Width scaling", status: "pass" }]}>
        <div className="shape-row">
          <LinePreview line={baseLine({ width: px(1) })} label="1px" />
          <LinePreview line={baseLine({ width: px(2) })} label="2px" />
          <LinePreview line={baseLine({ width: px(4) })} label="4px" />
          <LinePreview line={baseLine({ width: px(8) })} label="8px" />
        </div>
      </TestSubsection>

      <TestSubsection title="Line Cap & Join" items={capJoinItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ cap: "flat" as LineCap, width: px(6) })} label="cap: flat" />
          <LinePreview line={baseLine({ cap: "round" as LineCap, width: px(6) })} label="cap: round" />
          <LinePreview line={baseLine({ cap: "square" as LineCap, width: px(6) })} label="cap: square" />
        </div>
      </TestSubsection>

      <TestSubsection title="Dash Patterns" items={dashItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ dash: "solid" as DashStyle })} label="solid" />
          <LinePreview line={baseLine({ dash: "dot" as DashStyle })} label="dot" />
          <LinePreview line={baseLine({ dash: "dash" as DashStyle })} label="dash" />
          <LinePreview line={baseLine({ dash: "lgDash" as DashStyle })} label="lgDash" />
          <LinePreview line={baseLine({ dash: "dashDot" as DashStyle })} label="dashDot" />
          <LinePreview line={baseLine({ dash: "lgDashDot" as DashStyle })} label="lgDashDot" />
        </div>
      </TestSubsection>

      <TestSubsection title="Compound Lines" items={compoundItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ compound: "sng", width: px(4) })} label="single" />
        </div>
        <p className="pattern-info">Double/Triple compound lines require additional implementation</p>
      </TestSubsection>

      <TestSubsection
        title="Stroke Color"
        items={[{ label: "Solid stroke color", status: "pass" }]}
      >
        <div className="shape-row">
          <LinePreview
            line={baseLine({
              fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
              width: px(4),
            })}
            label="accent1"
          />
          <LinePreview
            line={baseLine({
              fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } },
              width: px(4),
            })}
            label="accent2"
          />
          <LinePreview
            line={baseLine({
              fill: {
                type: "solidFill",
                color: { spec: { type: "srgb", value: "FFFFFF" }, transform: { alpha: pct(50) } },
              },
              width: px(4),
            })}
            label="50% alpha"
          />
        </div>
      </TestSubsection>
    </div>
  );
}
