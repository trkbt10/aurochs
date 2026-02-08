/**
 * @file TableCellEditor - Editor for TableCell type
 *
 * Edits cell content (textBody) and properties.
 */

import { useCallback, type CSSProperties } from "react";
import { Accordion, FieldGroup } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { TextBodyEditor, createDefaultTextBody } from "../text/TextBodyEditor";
import { TableCellPropertiesEditor, createDefaultTableCellProperties } from "./TableCellPropertiesEditor";
import type { TableCell, TableCellProperties } from "@aurochs-office/pptx/domain/table/types";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type TableCellEditorProps = EditorProps<TableCell> & {
  readonly style?: CSSProperties;
  /** Show text body editor */
  readonly showTextBody?: boolean;
  /** Show cell ID field */
  readonly showId?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

/**
 * Editor for TableCell type.
 */
export function TableCellEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showTextBody = true,
  showId = false,
}: TableCellEditorProps) {
  const handlePropertiesChange = useCallback(
    (properties: TableCellProperties) => {
      onChange({ ...value, properties });
    },
    [value, onChange],
  );

  const handleTextBodyChange = useCallback(
    (textBody: TextBody) => {
      onChange({ ...value, textBody });
    },
    [value, onChange],
  );

  const handleIdChange = useCallback(
    (id: string | number) => {
      const idStr = String(id);
      if (idStr.trim() === "") {
        const updated = { ...value };
        delete (updated as Record<string, unknown>).id;
        onChange(updated);
      } else {
        onChange({ ...value, id: idStr });
      }
    },
    [value, onChange],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Cell ID */}
      {showId && (
        <FieldGroup label="Cell ID">
          <Input value={value.id ?? ""} onChange={handleIdChange} disabled={disabled} placeholder="(optional)" />
        </FieldGroup>
      )}

      {/* Cell Properties */}
      <Accordion title="Cell Properties" defaultExpanded>
        <TableCellPropertiesEditor value={value.properties} onChange={handlePropertiesChange} disabled={disabled} />
      </Accordion>

      {/* Text Content */}
      {showTextBody && value.textBody && (
        <Accordion title="Text Content" defaultExpanded>
          <TextBodyEditor value={value.textBody} onChange={handleTextBodyChange} disabled={disabled} />
        </Accordion>
      )}
    </div>
  );
}

/**
 * Create default table cell
 */
export function createDefaultTableCell(): TableCell {
  return {
    properties: createDefaultTableCellProperties(),
    textBody: createDefaultTextBody(),
  };
}

/**
 * Create empty table cell (no text)
 */
export function createEmptyTableCell(): TableCell {
  return {
    properties: createDefaultTableCellProperties(),
  };
}
