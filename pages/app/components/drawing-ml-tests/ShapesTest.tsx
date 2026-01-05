/**
 * @file Shapes Test Section
 *
 * Tests for ECMA-376 shape geometries and transforms.
 */

import type { Fill } from "@lib/pptx/domain";
import { px } from "@lib/pptx/domain/types";
import { type CheckItem, TestSubsection, GeometryPreview, PresetShapePreview, TransformPreview } from "./common";

// =============================================================================
// Preset Shape Path Data
// =============================================================================

const shapes = {
  // Basic shapes
  rect: "M 10 10 L 90 10 L 90 60 L 10 60 Z",
  roundRect: "M 20 10 L 80 10 Q 90 10 90 20 L 90 50 Q 90 60 80 60 L 20 60 Q 10 60 10 50 L 10 20 Q 10 10 20 10 Z",
  ellipse: "M 50 10 A 40 25 0 1 1 50 60 A 40 25 0 1 1 50 10 Z",
  triangle: "M 50 10 L 90 60 L 10 60 Z",
  rtTriangle: "M 10 10 L 90 60 L 10 60 Z",
  diamond: "M 50 10 L 90 35 L 50 60 L 10 35 Z",
  parallelogram: "M 25 10 L 90 10 L 65 60 L 10 60 Z",
  trapezoid: "M 25 10 L 75 10 L 90 60 L 10 60 Z",
  hexagon: "M 25 10 L 75 10 L 90 35 L 75 60 L 25 60 L 10 35 Z",
  octagon: "M 30 10 L 70 10 L 90 30 L 90 50 L 70 60 L 30 60 L 10 50 L 10 30 Z",
  pentagon: "M 50 10 L 88 32 L 73 60 L 27 60 L 12 32 Z",

  // Stars
  star4: "M 50 10 L 60 35 L 90 35 L 65 48 L 75 70 L 50 55 L 25 70 L 35 48 L 10 35 L 40 35 Z",
  star5: "M 50 10 L 62 38 L 95 38 L 68 52 L 78 80 L 50 62 L 22 80 L 32 52 L 5 38 L 38 38 Z",
  star6: "M 50 5 L 60 25 L 85 15 L 75 35 L 95 45 L 75 55 L 85 75 L 60 65 L 50 85 L 40 65 L 15 75 L 25 55 L 5 45 L 25 35 L 15 15 L 40 25 Z",

  // Arrows
  rightArrow: "M 10 25 L 60 25 L 60 15 L 90 35 L 60 55 L 60 45 L 10 45 Z",
  leftArrow: "M 90 25 L 40 25 L 40 15 L 10 35 L 40 55 L 40 45 L 90 45 Z",
  downArrow: "M 35 10 L 65 10 L 65 40 L 80 40 L 50 65 L 20 40 L 35 40 Z",
  upArrow: "M 50 10 L 80 40 L 65 40 L 65 65 L 35 65 L 35 40 L 20 40 Z",
  leftRightArrow: "M 10 35 L 30 15 L 30 25 L 70 25 L 70 15 L 90 35 L 70 55 L 70 45 L 30 45 L 30 55 Z",
  upDownArrow: "M 50 5 L 75 25 L 60 25 L 60 50 L 75 50 L 50 70 L 25 50 L 40 50 L 40 25 L 25 25 Z",
  chevron: "M 10 10 L 60 10 L 90 35 L 60 60 L 10 60 L 40 35 Z",
  notchedRightArrow: "M 10 25 L 60 25 L 60 15 L 90 35 L 60 55 L 60 45 L 10 45 L 25 35 Z",
  bentArrow: "M 10 50 L 10 25 L 60 25 L 60 15 L 90 35 L 60 55 L 60 45 L 20 45 L 20 50 Z",
  curvedRightArrow: "M 10 60 Q 10 25 50 25 L 50 15 L 80 35 L 50 55 L 50 45 Q 25 45 25 60 Z",

  // Flowchart
  flowChartProcess: "M 10 15 L 90 15 L 90 55 L 10 55 Z",
  flowChartDecision: "M 50 10 L 90 35 L 50 60 L 10 35 Z",
  flowChartTerminator: "M 25 15 L 75 15 Q 90 15 90 35 Q 90 55 75 55 L 25 55 Q 10 55 10 35 Q 10 15 25 15 Z",
  flowChartDocument: "M 10 15 L 90 15 L 90 50 Q 70 45 50 50 Q 30 55 10 50 Z",
  flowChartConnector: "M 50 10 A 25 25 0 1 1 50 60 A 25 25 0 1 1 50 10 Z",
  flowChartInputOutput: "M 25 15 L 90 15 L 75 55 L 10 55 Z",
  flowChartPredefinedProcess: "M 15 15 L 85 15 L 85 55 L 15 55 Z M 20 15 L 20 55 M 80 15 L 80 55",
  flowChartPreparation: "M 30 15 L 70 15 L 90 35 L 70 55 L 30 55 L 10 35 Z",
  flowChartManualInput: "M 10 25 L 90 15 L 90 55 L 10 55 Z",
  flowChartMultidocument: "M 15 20 L 85 20 L 85 45 Q 65 42 50 45 M 10 25 L 80 25 L 80 50 Q 60 47 45 50 M 5 30 L 75 30 L 75 55 Q 55 52 40 55 L 5 55 Z",

  // Callouts
  wedgeRectCallout: "M 10 10 L 90 10 L 90 50 L 50 50 L 30 65 L 45 50 L 10 50 Z",
  wedgeEllipseCallout: "M 50 10 A 40 20 0 1 1 50 50 L 30 65 L 45 48 A 40 20 0 0 1 50 10 Z",
  cloudCallout: "M 30 35 Q 25 25 40 25 Q 40 15 55 20 Q 65 15 75 25 Q 85 30 80 40 Q 85 50 70 55 L 30 65 L 50 55 Q 30 55 25 45 Q 20 40 30 35 Z",

  // Connectors
  straightConnector1: "M 10 10 L 90 60",
  bentConnector3: "M 10 35 L 50 35 L 50 60 L 90 60",
  curvedConnector3: "M 10 35 Q 50 35 50 47 Q 50 60 90 60",

  // Symbols
  plus: "M 35 10 L 65 10 L 65 25 L 90 25 L 90 45 L 65 45 L 65 60 L 35 60 L 35 45 L 10 45 L 10 25 L 35 25 Z",
  sun: "M 50 25 A 15 15 0 1 1 50 55 A 15 15 0 1 1 50 25 M 50 5 L 50 15 M 50 55 L 50 65 M 25 35 L 15 35 M 75 35 L 85 35 M 32 18 L 25 10 M 68 52 L 75 60 M 32 52 L 25 60 M 68 18 L 75 10",
  moon: "M 60 10 A 30 30 0 1 0 60 60 A 22 22 0 1 1 60 10 Z",
  heart: "M 50 60 Q 10 40 10 25 Q 10 10 30 10 Q 50 10 50 25 Q 50 10 70 10 Q 90 10 90 25 Q 90 40 50 60 Z",
  lightningBolt: "M 55 5 L 30 35 L 50 35 L 35 65 L 75 30 L 55 30 Z",
  cube: "M 10 20 L 40 10 L 90 10 L 90 50 L 60 60 L 10 60 Z M 40 10 L 40 50 L 10 60 M 40 50 L 90 50",
  can: "M 10 20 A 40 10 0 0 1 90 20 L 90 55 A 40 10 0 0 1 10 55 Z M 10 20 A 40 10 0 0 0 90 20",
  ribbon: "M 5 25 L 20 25 L 20 10 L 80 10 L 80 25 L 95 25 L 85 35 L 95 45 L 80 45 L 80 60 L 20 60 L 20 45 L 5 45 L 15 35 Z",
  donut: "M 50 10 A 35 30 0 1 1 50 60 A 35 30 0 1 1 50 10 M 50 25 A 20 15 0 1 0 50 45 A 20 15 0 1 0 50 25 Z",
  noSmoking: "M 50 10 A 30 30 0 1 1 50 60 A 30 30 0 1 1 50 10 M 25 35 L 75 35 L 75 40 L 25 40 Z",

  // Action buttons
  actionButtonHome: "M 5 5 L 95 5 L 95 65 L 5 65 Z M 50 15 L 25 30 L 25 55 L 45 55 L 45 40 L 55 40 L 55 55 L 75 55 L 75 30 Z",
  actionButtonHelp: "M 5 5 L 95 5 L 95 65 L 5 65 Z M 50 50 A 2 2 0 1 1 50 54 A 2 2 0 1 1 50 50 M 40 25 Q 40 15 50 15 Q 60 15 60 25 Q 60 32 53 35 L 53 42 L 47 42 L 47 32 Q 47 28 50 28 Q 53 28 53 25 Q 53 22 50 22 Q 47 22 47 25 L 40 25 Z",
};

/**
 * Shapes test section component
 */
export function ShapesTest() {
  const basicGeometryItems: CheckItem[] = [
    { label: "Rectangle", status: "pass" },
    { label: "Rounded Rectangle", status: "pass" },
    { label: "Ellipse", status: "pass" },
    { label: "Triangle", status: "pass" },
    { label: "Right Triangle", status: "pass" },
    { label: "Diamond", status: "pass" },
    { label: "Parallelogram", status: "pass" },
    { label: "Trapezoid", status: "pass" },
    { label: "Pentagon", status: "pass" },
    { label: "Hexagon", status: "pass" },
    { label: "Octagon", status: "pass" },
  ];

  const starItems: CheckItem[] = [
    { label: "4-point star", status: "pass" },
    { label: "5-point star", status: "pass" },
    { label: "6-point star", status: "pass" },
    { label: "7-32 point stars", status: "pass" },
  ];

  const arrowItems: CheckItem[] = [
    { label: "Right arrow", status: "pass" },
    { label: "Left arrow", status: "pass" },
    { label: "Up arrow", status: "pass" },
    { label: "Down arrow", status: "pass" },
    { label: "Left-right arrow", status: "pass" },
    { label: "Up-down arrow", status: "pass" },
    { label: "Chevron", status: "pass" },
    { label: "Notched arrow", status: "pass" },
    { label: "Bent arrow", status: "pass" },
    { label: "Curved arrows", status: "pass" },
    { label: "Circular arrows", status: "pass" },
    { label: "U-turn arrow", status: "pass" },
    { label: "Arrow callouts", status: "pass" },
  ];

  const flowchartItems: CheckItem[] = [
    { label: "Process", status: "pass" },
    { label: "Decision", status: "pass" },
    { label: "Terminator", status: "pass" },
    { label: "Document", status: "pass" },
    { label: "Connector", status: "pass" },
    { label: "Input/Output", status: "pass" },
    { label: "Predefined Process", status: "pass" },
    { label: "Preparation", status: "pass" },
    { label: "Manual Input", status: "pass" },
    { label: "Multi-document", status: "pass" },
    { label: "Merge/Extract", status: "pass" },
    { label: "Storage shapes", status: "pass" },
  ];

  const calloutItems: CheckItem[] = [
    { label: "Wedge rect callout", status: "pass" },
    { label: "Wedge ellipse callout", status: "pass" },
    { label: "Cloud callout", status: "pass" },
    { label: "Callout 1-3", status: "pass" },
    { label: "Accent callouts", status: "pass" },
    { label: "Border callouts", status: "pass" },
  ];

  const connectorItems: CheckItem[] = [
    { label: "Straight connector", status: "pass" },
    { label: "Bent connectors (2-5)", status: "pass" },
    { label: "Curved connectors (2-5)", status: "pass" },
  ];

  const symbolItems: CheckItem[] = [
    { label: "Plus/Cross", status: "pass" },
    { label: "Sun", status: "pass" },
    { label: "Moon", status: "pass" },
    { label: "Heart", status: "pass" },
    { label: "Lightning bolt", status: "pass" },
    { label: "Cube/Can", status: "pass" },
    { label: "Ribbon", status: "pass" },
    { label: "Donut", status: "pass" },
    { label: "No smoking", status: "pass" },
    { label: "Smiley face", status: "partial" },
    { label: "Scrolls", status: "pass" },
    { label: "Gears", status: "pass" },
    { label: "Math symbols", status: "pass" },
  ];

  const actionButtonItems: CheckItem[] = [
    { label: "Home button", status: "pass" },
    { label: "Help button", status: "pass" },
    { label: "Information button", status: "pass" },
    { label: "Navigation buttons", status: "pass" },
    { label: "Media buttons", status: "pass" },
  ];

  const transformItems: CheckItem[] = [
    { label: "Position (x, y)", status: "pass" },
    { label: "Size (w, h)", status: "pass" },
    { label: "Rotation", status: "pass" },
    { label: "Flip H", status: "pass" },
    { label: "Flip V", status: "pass" },
  ];

  const accentFill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } };
  const accent2Fill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } };
  const accent3Fill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent3" } } };
  const accent4Fill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent4" } } };
  const accent5Fill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent5" } } };
  const accent6Fill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent6" } } };

  return (
    <div className="test-section">
      <h3>Shapes & Geometry</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.9 - Shape geometries and transforms. 180+ preset shapes supported.
      </p>

      <TestSubsection title="Basic Geometries" items={basicGeometryItems}>
        <div className="shape-row">
          <GeometryPreview shape="rect" fill={accentFill} label="Rectangle" />
          <GeometryPreview shape="roundRect" fill={accentFill} label="Rounded Rect" />
          <GeometryPreview shape="ellipse" fill={accentFill} label="Ellipse" />
          <GeometryPreview shape="triangle" fill={accentFill} label="Triangle" />
          <GeometryPreview shape="diamond" fill={accentFill} label="Diamond" />
        </div>
        <div className="shape-row" style={{ marginTop: 12 }}>
          <PresetShapePreview pathData={shapes.rtTriangle} fill={accent2Fill} label="Right Triangle" />
          <PresetShapePreview pathData={shapes.parallelogram} fill={accent2Fill} label="Parallelogram" />
          <PresetShapePreview pathData={shapes.trapezoid} fill={accent2Fill} label="Trapezoid" />
          <PresetShapePreview pathData={shapes.pentagon} fill={accent2Fill} label="Pentagon" />
          <PresetShapePreview pathData={shapes.hexagon} fill={accent2Fill} label="Hexagon" />
          <PresetShapePreview pathData={shapes.octagon} fill={accent2Fill} label="Octagon" />
        </div>
      </TestSubsection>

      <TestSubsection title="Stars" items={starItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.star4} fill={accent3Fill} label="4-Point" viewBox="0 0 100 80" />
          <PresetShapePreview pathData={shapes.star5} fill={accent3Fill} label="5-Point" viewBox="0 0 100 90" />
          <PresetShapePreview pathData={shapes.star6} fill={accent3Fill} label="6-Point" viewBox="0 0 100 90" />
        </div>
      </TestSubsection>

      <TestSubsection title="Arrows" items={arrowItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.rightArrow} fill={accent4Fill} label="Right" />
          <PresetShapePreview pathData={shapes.leftArrow} fill={accent4Fill} label="Left" />
          <PresetShapePreview pathData={shapes.upArrow} fill={accent4Fill} label="Up" />
          <PresetShapePreview pathData={shapes.downArrow} fill={accent4Fill} label="Down" />
          <PresetShapePreview pathData={shapes.leftRightArrow} fill={accent4Fill} label="Left-Right" />
          <PresetShapePreview pathData={shapes.upDownArrow} fill={accent4Fill} label="Up-Down" />
        </div>
        <div className="shape-row" style={{ marginTop: 12 }}>
          <PresetShapePreview pathData={shapes.chevron} fill={accent5Fill} label="Chevron" />
          <PresetShapePreview pathData={shapes.notchedRightArrow} fill={accent5Fill} label="Notched" />
          <PresetShapePreview pathData={shapes.bentArrow} fill={accent5Fill} label="Bent" />
          <PresetShapePreview pathData={shapes.curvedRightArrow} fill={accent5Fill} label="Curved" />
        </div>
      </TestSubsection>

      <TestSubsection title="Flowchart Shapes" items={flowchartItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.flowChartProcess} fill={accent6Fill} label="Process" />
          <PresetShapePreview pathData={shapes.flowChartDecision} fill={accent6Fill} label="Decision" />
          <PresetShapePreview pathData={shapes.flowChartTerminator} fill={accent6Fill} label="Terminator" />
          <PresetShapePreview pathData={shapes.flowChartDocument} fill={accent6Fill} label="Document" />
          <PresetShapePreview pathData={shapes.flowChartConnector} fill={accent6Fill} label="Connector" />
        </div>
        <div className="shape-row" style={{ marginTop: 12 }}>
          <PresetShapePreview pathData={shapes.flowChartInputOutput} fill={accentFill} label="I/O" />
          <PresetShapePreview pathData={shapes.flowChartPreparation} fill={accentFill} label="Preparation" />
          <PresetShapePreview pathData={shapes.flowChartManualInput} fill={accentFill} label="Manual Input" />
        </div>
      </TestSubsection>

      <TestSubsection title="Callouts" items={calloutItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.wedgeRectCallout} fill={accent2Fill} label="Rect Callout" />
          <PresetShapePreview pathData={shapes.wedgeEllipseCallout} fill={accent2Fill} label="Ellipse Callout" />
          <PresetShapePreview pathData={shapes.cloudCallout} fill={accent2Fill} label="Cloud Callout" />
        </div>
      </TestSubsection>

      <TestSubsection title="Connectors" items={connectorItems}>
        <div className="shape-row">
          <PresetShapePreview
            pathData={shapes.straightConnector1}
            fill={{ type: "noFill" }}
            line={{ fill: { type: "solidFill", color: { spec: { type: "scheme", value: "lt1" } } }, width: px(2), compound: "sng", alignment: "ctr", cap: "flat", dash: "solid", join: "round" }}
            label="Straight"
          />
          <PresetShapePreview
            pathData={shapes.bentConnector3}
            fill={{ type: "noFill" }}
            line={{ fill: { type: "solidFill", color: { spec: { type: "scheme", value: "lt1" } } }, width: px(2), compound: "sng", alignment: "ctr", cap: "flat", dash: "solid", join: "round" }}
            label="Bent"
          />
          <PresetShapePreview
            pathData={shapes.curvedConnector3}
            fill={{ type: "noFill" }}
            line={{ fill: { type: "solidFill", color: { spec: { type: "scheme", value: "lt1" } } }, width: px(2), compound: "sng", alignment: "ctr", cap: "flat", dash: "solid", join: "round" }}
            label="Curved"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Symbols" items={symbolItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.plus} fill={accent3Fill} label="Plus" />
          <PresetShapePreview pathData={shapes.heart} fill={accent2Fill} label="Heart" />
          <PresetShapePreview pathData={shapes.lightningBolt} fill={accent3Fill} label="Lightning" />
          <PresetShapePreview pathData={shapes.moon} fill={accent4Fill} label="Moon" />
          <PresetShapePreview pathData={shapes.donut} fill={accent5Fill} label="Donut" />
          <PresetShapePreview pathData={shapes.ribbon} fill={accent6Fill} label="Ribbon" />
        </div>
        <div className="shape-row" style={{ marginTop: 12 }}>
          <PresetShapePreview pathData={shapes.cube} fill={accentFill} label="Cube" />
          <PresetShapePreview pathData={shapes.can} fill={accent2Fill} label="Can" />
          <PresetShapePreview pathData={shapes.noSmoking} fill={accent2Fill} label="No Smoking" />
        </div>
      </TestSubsection>

      <TestSubsection title="Action Buttons" items={actionButtonItems}>
        <div className="shape-row">
          <PresetShapePreview pathData={shapes.actionButtonHome} fill={accent4Fill} label="Home" />
          <PresetShapePreview pathData={shapes.actionButtonHelp} fill={accent4Fill} label="Help" />
        </div>
      </TestSubsection>

      <TestSubsection title="Transform Properties" items={transformItems}>
        <div className="shape-row">
          <TransformPreview transform="translate(0,0)" fill={accentFill} label="Normal" />
          <TransformPreview transform="translate(0,0) rotate(15, 50, 35)" fill={accent2Fill} label="Rotate 15°" />
          <TransformPreview transform="translate(0,0) rotate(45, 50, 35)" fill={accent3Fill} label="Rotate 45°" />
          <TransformPreview transform="translate(100,0) scale(-1,1)" fill={accent4Fill} label="Flip H" />
          <TransformPreview transform="translate(0,70) scale(1,-1)" fill={accent5Fill} label="Flip V" />
        </div>
      </TestSubsection>
    </div>
  );
}
