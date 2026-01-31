/**
 * @file Color Test Section
 *
 * Tests for ECMA-376 color specifications and transforms.
 */

import { pct } from "@oxen-office/ooxml/domain/units";
import { ColorSwatch, ColorSwatchRow } from "@oxen-renderer/drawing-ml";
import { type CheckItem, TestSubsection } from "../common";

/**
 * Color test section component
 */
export function ColorTest() {
  const colorSpecItems: CheckItem[] = [
    { label: "sRGB (hex)", status: "pass" },
    { label: "Scheme colors", status: "pass" },
    { label: "Preset colors", status: "partial", notes: "basic support" },
    { label: "System colors", status: "pending" },
    { label: "HSL colors", status: "pending" },
  ];

  const colorTransformItems: CheckItem[] = [
    { label: "Alpha (transparency)", status: "pass" },
    { label: "Shade (darken)", status: "pass" },
    { label: "Tint (lighten)", status: "pass" },
    { label: "LumMod/LumOff", status: "pass" },
    { label: "SatMod/SatOff", status: "partial" },
    { label: "HueMod/HueOff", status: "pending" },
    { label: "Complement/Inverse", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Color System</h3>
      <p className="section-description">
        ECMA-376 color specifications and transforms.
      </p>

      <TestSubsection title="Color Specifications" items={colorSpecItems}>
        <div className="shape-row">
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "FF0000" } }} size={48} showInfo />
            <span className="color-label">sRGB Red</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "00FF00" } }} size={48} showInfo />
            <span className="color-label">sRGB Green</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "0000FF" } }} size={48} showInfo />
            <span className="color-label">sRGB Blue</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "scheme", value: "accent1" } }} size={48} showInfo />
            <span className="color-label">Scheme accent1</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "preset", value: "coral" } }} size={48} showInfo />
            <span className="color-label">Preset coral</span>
          </div>
        </div>
      </TestSubsection>

      <TestSubsection title="Color Transforms" items={colorTransformItems}>
        <div className="shape-row">
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "4F81BD" }, transform: { alpha: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Alpha</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "FF0000" }, transform: { shade: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Shade</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "0000FF" }, transform: { tint: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Tint</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "scheme", value: "accent1" }, transform: { lumMod: pct(75), lumOff: pct(25) } }}
              size={48}
              showInfo
            />
            <span className="color-label">LumMod 75%</span>
          </div>
        </div>
      </TestSubsection>

      <TestSubsection
        title="Color Scheme (12 slots)"
        items={[{ label: "Full scheme support", status: "pass" }]}
      >
        <div className="scheme-row">
          <ColorSwatchRow
            colors={[
              { spec: { type: "scheme", value: "dk1" } },
              { spec: { type: "scheme", value: "lt1" } },
              { spec: { type: "scheme", value: "dk2" } },
              { spec: { type: "scheme", value: "lt2" } },
              { spec: { type: "scheme", value: "accent1" } },
              { spec: { type: "scheme", value: "accent2" } },
              { spec: { type: "scheme", value: "accent3" } },
              { spec: { type: "scheme", value: "accent4" } },
              { spec: { type: "scheme", value: "accent5" } },
              { spec: { type: "scheme", value: "accent6" } },
              { spec: { type: "scheme", value: "hlink" } },
              { spec: { type: "scheme", value: "folHlink" } },
            ]}
            labels={["dk1", "lt1", "dk2", "lt2", "ac1", "ac2", "ac3", "ac4", "ac5", "ac6", "hlink", "folHlink"]}
            size={32}
          />
        </div>
      </TestSubsection>
    </div>
  );
}
