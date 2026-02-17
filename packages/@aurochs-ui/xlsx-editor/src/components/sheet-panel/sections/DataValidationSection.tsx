/**
 * @file Data Validation section
 *
 * Section for data validation settings.
 * Allows viewing and managing data validation rules.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, Select, Toggle, type SelectOption } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type {
  XlsxDataValidation,
  XlsxDataValidationType,
  XlsxDataValidationOperator,
} from "@aurochs-office/xlsx/domain/data-validation";
import { formatRange, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type DataValidationSectionProps = {
  readonly disabled: boolean;
  readonly validations: readonly XlsxDataValidation[] | undefined;
  readonly selectedRange: CellRange | undefined;
  readonly onValidationAdd: (validation: XlsxDataValidation) => void;
  readonly onValidationDelete: (range: CellRange) => void;
  readonly onValidationsClear: () => void;
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

const validationItemStyle: CSSProperties = {
  padding: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  fontSize: fontTokens.size.sm,
};

const validationLabelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  marginBottom: spacingTokens.xs,
};

const validationRangeStyle: CSSProperties = {
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

const typeOptions: readonly SelectOption<string>[] = [
  { value: "list", label: "List" },
  { value: "whole", label: "Whole Number" },
  { value: "decimal", label: "Decimal" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "textLength", label: "Text Length" },
  { value: "custom", label: "Custom" },
];

const operatorOptions: readonly SelectOption<string>[] = [
  { value: "between", label: "Between" },
  { value: "notBetween", label: "Not Between" },
  { value: "equal", label: "Equal" },
  { value: "notEqual", label: "Not Equal" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "greaterThanOrEqual", label: ">= (Greater or Equal)" },
  { value: "lessThanOrEqual", label: "<= (Less or Equal)" },
];

function getValidationTypeLabel(type?: XlsxDataValidationType): string {
  switch (type) {
    case "list":
      return "List";
    case "whole":
      return "Whole Number";
    case "decimal":
      return "Decimal";
    case "date":
      return "Date";
    case "time":
      return "Time";
    case "textLength":
      return "Text Length";
    case "custom":
      return "Custom";
    default:
      return "Any";
  }
}

/**
 * Data validation settings section.
 */
export function DataValidationSection({
  disabled,
  validations,
  selectedRange,
  onValidationAdd,
  onValidationDelete,
  onValidationsClear,
}: DataValidationSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftType, setDraftType] = useState<XlsxDataValidationType>("list");
  const [draftOperator, setDraftOperator] = useState<XlsxDataValidationOperator>("between");
  const [draftFormula1, setDraftFormula1] = useState("");
  const [draftFormula2, setDraftFormula2] = useState("");
  const [draftAllowBlank, setDraftAllowBlank] = useState(true);
  const [draftErrorMessage, setDraftErrorMessage] = useState("");

  const hasValidations = validations && validations.length > 0;

  // Find validation for the currently selected range
  const currentValidation = useMemo(() => {
    if (!selectedRange || !validations) {
      return undefined;
    }
    return validations.find((v) =>
      v.ranges.some(
        (r) =>
          r.start.row === selectedRange.start.row &&
          r.start.col === selectedRange.start.col &&
          r.end.row === selectedRange.end.row &&
          r.end.col === selectedRange.end.col,
      ),
    );
  }, [selectedRange, validations]);

  const handleStartAdd = useCallback(() => {
    setDraftType("list");
    setDraftOperator("between");
    setDraftFormula1("");
    setDraftFormula2("");
    setDraftAllowBlank(true);
    setDraftErrorMessage("");
    setIsAdding(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setIsAdding(false);
  }, []);

  const handleSaveValidation = useCallback(() => {
    if (!selectedRange) {
      return;
    }
    const sqref = formatRange(selectedRange);
    const validation: XlsxDataValidation = {
      type: draftType,
      operator: draftType !== "list" && draftType !== "custom" ? draftOperator : undefined,
      allowBlank: draftAllowBlank,
      showErrorMessage: draftErrorMessage.length > 0,
      error: draftErrorMessage || undefined,
      sqref,
      ranges: [selectedRange],
      formula1: draftFormula1 || undefined,
      formula2: draftFormula2 || undefined,
    };
    onValidationAdd(validation);
    setIsAdding(false);
  }, [
    selectedRange,
    draftType,
    draftOperator,
    draftAllowBlank,
    draftErrorMessage,
    draftFormula1,
    draftFormula2,
    onValidationAdd,
  ]);

  const handleDeleteCurrent = useCallback(() => {
    if (selectedRange) {
      onValidationDelete(selectedRange);
    }
  }, [selectedRange, onValidationDelete]);

  const needsOperator = draftType !== "list" && draftType !== "custom";
  const needsSecondFormula = needsOperator && (draftOperator === "between" || draftOperator === "notBetween");

  return (
    <Accordion title="Data Validation" defaultExpanded={hasValidations || isAdding}>
      <div style={descriptionStyle}>
        Restrict the type of data or values that users enter into cells.
      </div>

      {isAdding && selectedRange ? (
        <>
          <FieldGroup label="Range">
            <div style={{ fontSize: fontTokens.size.md }}>{formatRange(selectedRange)}</div>
          </FieldGroup>

          <FieldGroup label="Allow">
            <Select
              value={draftType}
              options={typeOptions}
              disabled={disabled}
              onChange={(v) => setDraftType(v as XlsxDataValidationType)}
            />
          </FieldGroup>

          {needsOperator && (
            <FieldGroup label="Condition">
              <Select
                value={draftOperator}
                options={operatorOptions}
                disabled={disabled}
                onChange={(v) => setDraftOperator(v as XlsxDataValidationOperator)}
              />
            </FieldGroup>
          )}

          <FieldGroup label={draftType === "list" ? "Source (comma-separated)" : "Value 1"}>
            <Input
              type="text"
              value={draftFormula1}
              placeholder={draftType === "list" ? "Item1,Item2,Item3" : "Minimum or value"}
              disabled={disabled}
              onChange={(v) => setDraftFormula1(String(v))}
            />
          </FieldGroup>

          {needsSecondFormula && (
            <FieldGroup label="Value 2">
              <Input
                type="text"
                value={draftFormula2}
                placeholder="Maximum"
                disabled={disabled}
                onChange={(v) => setDraftFormula2(String(v))}
              />
            </FieldGroup>
          )}

          <FieldGroup label="Allow blank" inline labelWidth={100}>
            <Toggle
              checked={draftAllowBlank}
              disabled={disabled}
              onChange={setDraftAllowBlank}
            />
          </FieldGroup>

          <FieldGroup label="Error message">
            <Input
              type="text"
              value={draftErrorMessage}
              placeholder="(optional)"
              disabled={disabled}
              onChange={(v) => setDraftErrorMessage(String(v))}
            />
          </FieldGroup>

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled || !draftFormula1} onClick={handleSaveValidation}>
              Apply
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancelAdd}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {currentValidation && (
            <div style={validationItemStyle}>
              <div style={validationLabelStyle}>Current cell has validation:</div>
              <div style={validationRangeStyle}>
                {getValidationTypeLabel(currentValidation.type)}
                {currentValidation.formula1 && `: ${currentValidation.formula1}`}
              </div>
              <div style={buttonRowStyle}>
                <Button size="sm" disabled={disabled} onClick={handleDeleteCurrent}>
                  Remove
                </Button>
              </div>
            </div>
          )}

          {hasValidations && (
            <div style={{ marginBottom: spacingTokens.sm }}>
              <div style={validationLabelStyle}>
                {validations.length} validation rule{validations.length !== 1 ? "s" : ""} on this sheet
              </div>
            </div>
          )}

          <div style={buttonRowStyle}>
            {selectedRange && (
              <Button size="sm" disabled={disabled} onClick={handleStartAdd}>
                {currentValidation ? "Edit Validation" : "Add Validation"}
              </Button>
            )}
            {hasValidations && (
              <Button size="sm" disabled={disabled} onClick={onValidationsClear}>
                Clear All
              </Button>
            )}
          </div>

          {!selectedRange && !hasValidations && (
            <div style={{ ...descriptionStyle, fontStyle: "italic" }}>
              Select a range to add data validation.
            </div>
          )}
        </>
      )}
    </Accordion>
  );
}
