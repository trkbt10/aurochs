/**
 * @file UI Components Test
 *
 * Test component for UI primitives (Accordion, ColorSwatch, FieldGroup).
 */

import { useState, type CSSProperties } from "react";
import {
  Accordion,
  ColorSwatch,
  FieldGroup,
  FieldRow,
  Toggle,
  Input,
} from "@lib/pptx-editor";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
  gap: "24px",
};

const swatchRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const sampleColors = [
  { hex: "FF0000", name: "Red" },
  { hex: "00FF00", name: "Green" },
  { hex: "0000FF", name: "Blue" },
  { hex: "0070f3", name: "Accent" },
  { hex: "FF00FF", name: "Magenta" },
  { hex: "000000", name: "Black" },
  { hex: "FFFFFF", name: "White" },
];

/**
 * Test component for Accordion and ColorSwatch UI components.
 */
export function UIComponentsTest() {
  const [accordionExpanded, setAccordionExpanded] = useState(true);
  const [selectedColor, setSelectedColor] = useState("0070f3");

  return (
    <div style={gridStyle}>
      {/* Accordion Test */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Accordion</h2>

        <FieldGroup label="Controlled Accordion">
          <Toggle
            checked={accordionExpanded}
            onChange={setAccordionExpanded}
            label="Expanded"
          />
        </FieldGroup>

        <div style={{ marginTop: "16px" }}>
          <Accordion
            title="Effects Options"
            expanded={accordionExpanded}
            onExpandedChange={setAccordionExpanded}
          >
            <FieldGroup label="Shadow">
              <Input type="number" value="0" onChange={() => {}} suffix="px" />
            </FieldGroup>
            <div style={{ marginTop: "8px" }}>
              <FieldGroup label="Blur">
                <Input type="number" value="4" onChange={() => {}} suffix="px" />
              </FieldGroup>
            </div>
          </Accordion>
        </div>

        <div style={{ marginTop: "16px" }}>
          <Accordion title="3D Properties" defaultExpanded={false}>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              3D rotation and perspective settings would go here.
            </p>
          </Accordion>
        </div>

        <div style={{ marginTop: "16px" }}>
          <Accordion title="Disabled Accordion" disabled>
            <p style={{ margin: 0 }}>This content cannot be toggled.</p>
          </Accordion>
        </div>
      </div>

      {/* ColorSwatch Test */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>ColorSwatch</h2>

        <FieldGroup label="Size Variants">
          <FieldRow gap={16}>
            <ColorSwatch color="0070f3" size="sm" />
            <ColorSwatch color="0070f3" size="md" />
            <ColorSwatch color="0070f3" size="lg" />
          </FieldRow>
        </FieldGroup>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Color Palette (Clickable)">
            <div style={swatchRowStyle}>
              {sampleColors.map((c) => (
                <ColorSwatch
                  key={c.hex}
                  color={c.hex}
                  size="md"
                  onClick={() => setSelectedColor(c.hex)}
                  selected={selectedColor === c.hex}
                />
              ))}
            </div>
            <p
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "var(--text-tertiary)",
              }}
            >
              Selected: #{selectedColor}
            </p>
          </FieldGroup>
        </div>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Transparency (Alpha)">
            <FieldRow gap={8}>
              <ColorSwatch color="FF0000" alpha={1.0} size="lg" />
              <ColorSwatch color="FF0000" alpha={0.75} size="lg" />
              <ColorSwatch color="FF0000" alpha={0.5} size="lg" />
              <ColorSwatch color="FF0000" alpha={0.25} size="lg" />
            </FieldRow>
          </FieldGroup>
        </div>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Disabled State">
            <ColorSwatch color="0070f3" size="md" disabled />
          </FieldGroup>
        </div>
      </div>

      {/* FieldGroup Test */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>FieldGroup</h2>

        <FieldGroup label="Stacked Layout (Default)">
          <Input type="text" value="Stacked content" onChange={() => {}} />
        </FieldGroup>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Inline Layout" inline labelWidth={80}>
            <Input type="text" value="Single line" onChange={() => {}} />
          </FieldGroup>
        </div>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Figma-style Row Layout">
            <FieldRow>
              <FieldGroup label="X" inline labelWidth={20} style={{ flex: 1 }}>
                <Input type="number" value="100" onChange={() => {}} suffix="px" />
              </FieldGroup>
              <FieldGroup label="Y" inline labelWidth={20} style={{ flex: 1 }}>
                <Input type="number" value="200" onChange={() => {}} suffix="px" />
              </FieldGroup>
            </FieldRow>
          </FieldGroup>
        </div>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="Nested Groups (Compact)">
            <FieldRow>
              <FieldGroup label="W" inline labelWidth={20} style={{ flex: 1 }}>
                <Input type="number" value="400" onChange={() => {}} suffix="px" />
              </FieldGroup>
              <FieldGroup label="H" inline labelWidth={20} style={{ flex: 1 }}>
                <Input type="number" value="300" onChange={() => {}} suffix="px" />
              </FieldGroup>
            </FieldRow>
            <FieldGroup label="Rotation" inline labelWidth={56} style={{ marginTop: "6px" }}>
              <Input type="number" value="45" onChange={() => {}} suffix="°" />
            </FieldGroup>
          </FieldGroup>
        </div>

        <div style={{ marginTop: "16px" }}>
          <FieldGroup label="With Hint" hint="optional">
            <Input type="text" value="Field with hint" onChange={() => {}} />
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
