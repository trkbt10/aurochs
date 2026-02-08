/**
 * @file Combined Test Section
 *
 * Integration tests combining fill + stroke + effects.
 */

import type { PatternType } from "@aurochs-office/drawing-ml/domain/fill";
import { px, deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import { CombinedPreview } from "../components";
import { makeGradient } from "../fixtures";

/**
 * Combined test section component
 */
export function CombinedTest() {
  return (
    <div className="test-section">
      <h3>Combined Styles</h3>
      <p className="section-description">Integration tests combining fill + stroke + effects.</p>

      <div className="combined-row">
        <CombinedPreview
          fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "srgb", value: "1F497D" } } },
            width: px(3),
            compound: "sng",
            alignment: "ctr",
            cap: "flat",
            dash: "solid",
            join: "round",
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
        <CombinedPreview
          fill={makeGradient(135, { pos: 0, color: { scheme: "accent3" } }, { pos: 100, color: { scheme: "accent4" } })}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent4" } } },
            width: px(2),
            compound: "sng",
            alignment: "ctr",
            cap: "round",
            dash: "dash",
            join: "round",
          }}
          effects={{
            glow: {
              color: { spec: { type: "scheme", value: "accent4" }, transform: { alpha: pct(60) } },
              radius: px(8),
            },
          }}
          label="Gradient + Dashed + Glow"
        />
        <CombinedPreview
          fill={{
            type: "patternFill",
            preset: "ltUpDiag" as PatternType,
            foregroundColor: { spec: { type: "scheme", value: "accent2" } },
            backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
          }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } },
            width: px(2),
            compound: "sng",
            alignment: "ctr",
            cap: "flat",
            dash: "solid",
            join: "miter",
          }}
          label="Pattern + Solid Stroke"
        />
        <CombinedPreview
          fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent5" } } }}
          effects={{
            shadow: {
              type: "outer",
              color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(30) } },
              blurRadius: px(12),
              distance: px(4),
              direction: deg(90),
            },
            softEdge: { radius: px(4) },
          }}
          label="Solid + Shadow + Soft"
        />
      </div>
    </div>
  );
}
