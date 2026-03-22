/**
 * @file OLE Object GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing OLE objects.
 */

import type { ReactNode } from "react";
import type { GraphicFrame } from "@aurochs-office/pptx/domain/index";
import type { OleReference } from "@aurochs-office/pptx/domain/shape";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { NonVisualPropertiesEditor } from "@aurochs-ui/ooxml-components/drawing-ml";
import { OleObjectEditor } from "@aurochs-ui/ooxml-components/pptx-slide";
import { TransformEditor } from "@aurochs-ui/editor-controls/editors";

// =============================================================================
// Types
// =============================================================================

export type OleFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
};

// =============================================================================
// Helpers
// =============================================================================

/** Render OLE content editor or placeholder */
function renderOleContent(
  oleData: OleReference | undefined,
  onChange: (data: OleReference) => void,
): ReactNode {
  if (oleData) {
    return <OleObjectEditor value={oleData} onChange={onChange} />;
  }
  return (
    <div
      style={{
        padding: "12px",
        textAlign: "center",
        color: "var(--text-tertiary, #737373)",
        fontSize: "12px",
      }}
    >
      OLE object data not available
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (OLE object) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - OLE Object content
 */
export function OleFramePanel({ shape, onChange }: OleFramePanelProps) {
  const oleData = shape.content.type === "oleObject" ? shape.content.data : undefined;

  const handleOleDataChange = (newOleData: OleReference) => {
    if (shape.content.type !== "oleObject") {
      return;
    }
    onChange({
      ...shape,
      content: {
        ...shape.content,
        data: newOleData,
      },
    });
  };

  const oleContent: ReactNode = renderOleContent(oleData, handleOleDataChange);

  return (
    <>
      <OptionalPropertySection title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </OptionalPropertySection>

      <OptionalPropertySection title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor value={shape.transform} onChange={(transform) => onChange({ ...shape, transform })} />
        )}
      </OptionalPropertySection>

      <OptionalPropertySection title="OLE Object" defaultExpanded>
        {oleContent}
      </OptionalPropertySection>
    </>
  );
}
