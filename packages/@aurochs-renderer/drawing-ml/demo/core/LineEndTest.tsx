/**
 * @file Line End Test Section
 *
 * Tests for ECMA-376 line end markers (arrow heads/tails).
 */

import type { Line, LineEnd } from "@aurochs-office/pptx/domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { CheckItem } from "../types";
import { TestSubsection, LineMarkerPreview } from "../components";

/**
 * Helper to create a line with specific head/tail ends
 */
function createLineWithEnds(headEnd?: LineEnd, tailEnd?: LineEnd, width = 2): Line {
  return {
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "lt1" } } },
    width: px(width),
    compound: "sng",
    alignment: "ctr",
    cap: "flat",
    dash: "solid",
    join: "round",
    headEnd,
    tailEnd,
  };
}

/**
 * Line end test section component
 */
export function LineEndTest() {
  const lineEndTypeItems: CheckItem[] = [
    { label: "None", status: "pass" },
    { label: "Triangle", status: "pass" },
    { label: "Stealth", status: "pass" },
    { label: "Diamond", status: "pass" },
    { label: "Oval", status: "pass" },
    { label: "Arrow", status: "pass" },
  ];

  const lineEndSizeItems: CheckItem[] = [
    { label: "Small width/length", status: "pass" },
    { label: "Medium width/length", status: "pass" },
    { label: "Large width/length", status: "pass" },
    { label: "Mixed width/length", status: "pass" },
  ];

  const lineEndPositionItems: CheckItem[] = [
    { label: "Head end only", status: "pass" },
    { label: "Tail end only", status: "pass" },
    { label: "Both ends", status: "pass" },
    { label: "Different types", status: "pass" },
  ];

  return (
    <div className="test-section">
      <h3>Line End Markers</h3>
      <p className="section-description">ECMA-376 Section 20.1.8.37 - Line end types (headEnd/tailEnd).</p>

      <TestSubsection title="Line End Types" items={lineEndTypeItems}>
        <div className="shape-row">
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "med", length: "med" })}
            label="Triangle"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "stealth", width: "med", length: "med" })}
            label="Stealth"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "diamond", width: "med", length: "med" })}
            label="Diamond"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "oval", width: "med", length: "med" })}
            label="Oval"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "arrow", width: "med", length: "med" })}
            label="Arrow"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Line End Sizes" items={lineEndSizeItems}>
        <div className="shape-row">
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "sm", length: "sm" }, 2)}
            label="Small"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "med", length: "med" }, 2)}
            label="Medium"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "lg", length: "lg" }, 2)}
            label="Large"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "lg", length: "sm" }, 2)}
            label="Wide-Short"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "sm", length: "lg" }, 2)}
            label="Narrow-Long"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Head/Tail Positioning" items={lineEndPositionItems}>
        <div className="shape-row">
          <LineMarkerPreview
            line={createLineWithEnds({ type: "triangle", width: "med", length: "med" }, undefined)}
            label="Head Only"
          />
          <LineMarkerPreview
            line={createLineWithEnds(undefined, { type: "triangle", width: "med", length: "med" })}
            label="Tail Only"
          />
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "triangle", width: "med", length: "med" },
              { type: "triangle", width: "med", length: "med" },
            )}
            label="Both"
          />
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "oval", width: "sm", length: "sm" },
              { type: "stealth", width: "lg", length: "lg" },
            )}
            label="Different"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Width Scaling" items={[{ label: "Markers scale with line width", status: "pass" }]}>
        <div className="shape-row">
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "triangle", width: "med", length: "med" },
              { type: "triangle", width: "med", length: "med" },
              1,
            )}
            label="1px"
          />
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "triangle", width: "med", length: "med" },
              { type: "triangle", width: "med", length: "med" },
              2,
            )}
            label="2px"
          />
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "triangle", width: "med", length: "med" },
              { type: "triangle", width: "med", length: "med" },
              3,
            )}
            label="3px"
          />
          <LineMarkerPreview
            line={createLineWithEnds(
              { type: "triangle", width: "med", length: "med" },
              { type: "triangle", width: "med", length: "med" },
              4,
            )}
            label="4px"
          />
        </div>
      </TestSubsection>
    </div>
  );
}
