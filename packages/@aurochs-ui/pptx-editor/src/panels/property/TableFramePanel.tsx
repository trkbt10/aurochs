/**
 * @file Table GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing tables.
 */

import type { GraphicFrame } from "@aurochs-office/pptx/domain/index";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { NonVisualPropertiesEditor, TransformEditor, TableEditor } from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type TableFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly table: Table;
  readonly onChange: (shape: GraphicFrame) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (table) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Table content
 */
export function TableFramePanel({ shape, table, onChange }: TableFramePanelProps) {
  const handleTableChange = (newTable: Table) => {
    if (shape.content.type !== "table") {
      return;
    }
    onChange({
      ...shape,
      content: { ...shape.content, data: { table: newTable } },
    });
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </Accordion>

      <Accordion title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor value={shape.transform} onChange={(transform) => onChange({ ...shape, transform })} />
        )}
      </Accordion>

      <Accordion title="Table" defaultExpanded>
        <TableEditor value={table} onChange={handleTableChange} />
      </Accordion>
    </>
  );
}
