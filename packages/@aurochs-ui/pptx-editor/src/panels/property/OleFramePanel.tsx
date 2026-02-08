/**
 * @file OLE Object GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing OLE objects.
 */

import type { ReactNode } from "react";
import type { GraphicFrame } from "@aurochs-office/pptx/domain/index";
import type { OleReference } from "@aurochs-office/pptx/domain/shape";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { NonVisualPropertiesEditor, TransformEditor, OleObjectEditor } from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type OleFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
};

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

  const oleContent: ReactNode = oleData ? (
    <OleObjectEditor value={oleData} onChange={handleOleDataChange} />
  ) : (
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

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor value={shape.transform} onChange={(transform) => onChange({ ...shape, transform })} />
        )}
      </Accordion>

      <Accordion title="OLE Object" defaultExpanded>
        {oleContent}
      </Accordion>
    </>
  );
}
