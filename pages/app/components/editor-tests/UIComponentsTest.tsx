/**
 * @file UI Components Test
 *
 * Test component for UI primitives (Accordion, FieldGroup).
 */

import { useState, type CSSProperties } from "react";
import { Accordion, FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Toggle } from "@oxen-ui/ui-components/primitives";

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

/**
 * Test component for Accordion and FieldGroup UI components.
 */
export function UIComponentsTest() {
  const [accordionExpanded, setAccordionExpanded] = useState(true);

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
