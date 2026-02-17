/**
 * @file Defined Names section
 *
 * Section for managing defined names (named ranges/formulas).
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, Select, type SelectOption } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxDefinedName } from "@aurochs-office/xlsx/domain/workbook";
import { formatRange, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type DefinedNamesSectionProps = {
  readonly disabled: boolean;
  readonly sheetIndex: number;
  readonly sheetNames: readonly string[];
  readonly definedNames: readonly XlsxDefinedName[] | undefined;
  readonly selectedRange: CellRange | undefined;
  readonly onAdd: (definedName: XlsxDefinedName) => void;
  readonly onUpdate: (oldName: string, oldLocalSheetId: number | undefined, definedName: XlsxDefinedName) => void;
  readonly onDelete: (name: string, localSheetId?: number) => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
};

const nameItemStyle: CSSProperties = {
  padding: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  fontSize: fontTokens.size.sm,
};

const nameStyle: CSSProperties = {
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

const formulaStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
  marginTop: spacingTokens.xs,
  fontFamily: "monospace",
};

const scopeStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.xs,
  marginTop: spacingTokens.xs,
};

/**
 * Defined names management section.
 */
export function DefinedNamesSection({
  disabled,
  sheetIndex,
  sheetNames,
  definedNames,
  selectedRange,
  onAdd,
  onUpdate,
  onDelete,
}: DefinedNamesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingName, setEditingName] = useState<XlsxDefinedName | undefined>(undefined);
  const [draftName, setDraftName] = useState("");
  const [draftFormula, setDraftFormula] = useState("");
  const [draftScope, setDraftScope] = useState<string>("workbook");

  const hasNames = definedNames && definedNames.length > 0;

  const scopeOptions = useMemo<readonly SelectOption<string>[]>(() => {
    const options: SelectOption<string>[] = [
      { value: "workbook", label: "Workbook" },
    ];
    sheetNames.forEach((name, idx) => {
      options.push({ value: String(idx), label: name });
    });
    return options;
  }, [sheetNames]);

  const handleStartAdd = useCallback(() => {
    setDraftName("");
    setDraftFormula(selectedRange ? formatRange(selectedRange) : "");
    setDraftScope("workbook");
    setEditingName(undefined);
    setIsAdding(true);
  }, [selectedRange]);

  const handleStartEdit = useCallback((name: XlsxDefinedName) => {
    setDraftName(name.name);
    setDraftFormula(name.formula);
    setDraftScope(name.localSheetId !== undefined ? String(name.localSheetId) : "workbook");
    setEditingName(name);
    setIsAdding(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setEditingName(undefined);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = draftName.trim();
    const trimmedFormula = draftFormula.trim();
    if (!trimmedName || !trimmedFormula) {
      return;
    }

    const localSheetId = draftScope === "workbook" ? undefined : parseInt(draftScope, 10);
    const newDefinedName: XlsxDefinedName = {
      name: trimmedName,
      formula: trimmedFormula,
      localSheetId,
    };

    if (editingName) {
      onUpdate(editingName.name, editingName.localSheetId, newDefinedName);
    } else {
      onAdd(newDefinedName);
    }
    setIsAdding(false);
    setEditingName(undefined);
  }, [draftName, draftFormula, draftScope, editingName, onAdd, onUpdate]);

  const handleDelete = useCallback(
    (name: string, localSheetId?: number) => {
      onDelete(name, localSheetId);
    },
    [onDelete],
  );

  return (
    <Accordion title="Defined Names" defaultExpanded={hasNames || isAdding}>
      <div style={descriptionStyle}>
        Create named ranges or formulas for easier reference in formulas.
      </div>

      {isAdding ? (
        <>
          <FieldGroup label="Name">
            <Input
              type="text"
              value={draftName}
              placeholder="MyRange"
              disabled={disabled}
              onChange={(v) => setDraftName(String(v))}
            />
          </FieldGroup>

          <FieldGroup label="Refers to">
            <Input
              type="text"
              value={draftFormula}
              placeholder="Sheet1!$A$1:$B$10"
              disabled={disabled}
              onChange={(v) => setDraftFormula(String(v))}
            />
          </FieldGroup>

          <FieldGroup label="Scope">
            <Select
              value={draftScope}
              options={scopeOptions}
              disabled={disabled}
              onChange={setDraftScope}
            />
          </FieldGroup>

          <div style={buttonRowStyle}>
            <Button
              size="sm"
              disabled={disabled || !draftName.trim() || !draftFormula.trim()}
              onClick={handleSave}
            >
              {editingName ? "Update" : "Add"}
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {hasNames && (
            <div style={{ marginBottom: spacingTokens.sm }}>
              {definedNames.map((dn) => (
                <div key={`${dn.name}-${dn.localSheetId ?? "wb"}`} style={nameItemStyle}>
                  <div style={nameStyle}>{dn.name}</div>
                  <div style={formulaStyle}>{dn.formula}</div>
                  <div style={scopeStyle}>
                    Scope: {dn.localSheetId !== undefined ? sheetNames[dn.localSheetId] ?? `Sheet ${dn.localSheetId + 1}` : "Workbook"}
                    {dn.hidden && " (hidden)"}
                  </div>
                  <div style={buttonRowStyle}>
                    <Button size="sm" disabled={disabled} onClick={() => handleStartEdit(dn)}>
                      Edit
                    </Button>
                    <Button size="sm" disabled={disabled} onClick={() => handleDelete(dn.name, dn.localSheetId)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleStartAdd}>
              Add Defined Name
            </Button>
          </div>
        </>
      )}
    </Accordion>
  );
}
