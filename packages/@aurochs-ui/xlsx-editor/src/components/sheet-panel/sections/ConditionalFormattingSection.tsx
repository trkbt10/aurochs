/**
 * @file Conditional Formatting section
 *
 * Section for conditional formatting settings.
 * Allows viewing and managing conditional formatting rules.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Button, FieldGroup, Input, Select, type SelectOption } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type {
  XlsxConditionalFormatting,
  XlsxConditionalFormattingRule,
  XlsxStandardRule,
} from "@aurochs-office/xlsx/domain/conditional-formatting";
import { formatRange, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type ConditionalFormattingSectionProps = {
  readonly disabled: boolean;
  readonly formattings: readonly XlsxConditionalFormatting[] | undefined;
  readonly selectedRange: CellRange | undefined;
  readonly onFormattingAdd: (formatting: XlsxConditionalFormatting) => void;
  readonly onFormattingDelete: (range: CellRange) => void;
  readonly onFormattingsClear: () => void;
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

const ruleItemStyle: CSSProperties = {
  padding: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  fontSize: fontTokens.size.sm,
};

const ruleLabelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  marginBottom: spacingTokens.xs,
};

const ruleRangeStyle: CSSProperties = {
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

type RuleType = XlsxStandardRule["type"] | "colorScale" | "dataBar" | "iconSet";

const ruleTypeOptions: readonly SelectOption<string>[] = [
  { value: "cellIs", label: "Cell Value" },
  { value: "containsText", label: "Contains Text" },
  { value: "notContainsText", label: "Does Not Contain" },
  { value: "beginsWith", label: "Begins With" },
  { value: "endsWith", label: "Ends With" },
  { value: "containsBlanks", label: "Is Blank" },
  { value: "notContainsBlanks", label: "Is Not Blank" },
  { value: "duplicateValues", label: "Duplicate Values" },
  { value: "uniqueValues", label: "Unique Values" },
  { value: "top10", label: "Top/Bottom N" },
  { value: "aboveAverage", label: "Above/Below Average" },
];

const operatorOptions: readonly SelectOption<string>[] = [
  { value: "equal", label: "Equal To" },
  { value: "notEqual", label: "Not Equal To" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "greaterThanOrEqual", label: ">=" },
  { value: "lessThanOrEqual", label: "<=" },
  { value: "between", label: "Between" },
  { value: "notBetween", label: "Not Between" },
];

function getRuleTypeLabel(rule: XlsxConditionalFormattingRule): string {
  switch (rule.type) {
    case "colorScale":
      return "Color Scale";
    case "dataBar":
      return "Data Bar";
    case "iconSet":
      return `Icon Set (${rule.iconSet})`;
    case "cellIs":
      return "Cell Value";
    case "containsText":
      return "Contains Text";
    case "notContainsText":
      return "Does Not Contain";
    case "beginsWith":
      return "Begins With";
    case "endsWith":
      return "Ends With";
    case "containsBlanks":
      return "Is Blank";
    case "notContainsBlanks":
      return "Is Not Blank";
    case "duplicateValues":
      return "Duplicate Values";
    case "uniqueValues":
      return "Unique Values";
    case "top10":
      return "Top/Bottom N";
    case "aboveAverage":
      return "Above/Below Average";
    case "expression":
      return "Formula";
    default:
      return rule.type;
  }
}

/**
 * Conditional formatting settings section.
 */
export function ConditionalFormattingSection({
  disabled,
  formattings,
  selectedRange,
  onFormattingAdd,
  onFormattingDelete,
  onFormattingsClear,
}: ConditionalFormattingSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftRuleType, setDraftRuleType] = useState<RuleType>("cellIs");
  const [draftOperator, setDraftOperator] = useState("greaterThan");
  const [draftValue1, setDraftValue1] = useState("");
  const [draftValue2, setDraftValue2] = useState("");

  const hasFormattings = formattings && formattings.length > 0;
  const totalRules = formattings?.reduce((sum, cf) => sum + cf.rules.length, 0) ?? 0;

  // Find formatting for the currently selected range
  const currentFormatting = useMemo(() => {
    if (!selectedRange || !formattings) {
      return undefined;
    }
    return formattings.find((cf) =>
      cf.ranges.some(
        (r) =>
          r.start.row === selectedRange.start.row &&
          r.start.col === selectedRange.start.col &&
          r.end.row === selectedRange.end.row &&
          r.end.col === selectedRange.end.col,
      ),
    );
  }, [selectedRange, formattings]);

  const handleStartAdd = useCallback(() => {
    setDraftRuleType("cellIs");
    setDraftOperator("greaterThan");
    setDraftValue1("");
    setDraftValue2("");
    setIsAdding(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setIsAdding(false);
  }, []);

  const handleSaveRule = useCallback(() => {
    if (!selectedRange) {
      return;
    }
    const sqref = formatRange(selectedRange);

    // Build the rule based on type
    const formulas: string[] = [];
    if (draftValue1) {
      formulas.push(draftValue1);
    }
    if (draftValue2 && (draftOperator === "between" || draftOperator === "notBetween")) {
      formulas.push(draftValue2);
    }

    const rule: XlsxStandardRule = {
      type: draftRuleType as XlsxStandardRule["type"],
      operator: draftRuleType === "cellIs" ? draftOperator : undefined,
      formulas,
      text: ["containsText", "notContainsText", "beginsWith", "endsWith"].includes(draftRuleType)
        ? draftValue1
        : undefined,
      priority: 1,
    };

    const formatting: XlsxConditionalFormatting = {
      sqref,
      ranges: [selectedRange],
      rules: [rule],
    };

    onFormattingAdd(formatting);
    setIsAdding(false);
  }, [selectedRange, draftRuleType, draftOperator, draftValue1, draftValue2, onFormattingAdd]);

  const handleDeleteCurrent = useCallback(() => {
    if (selectedRange) {
      onFormattingDelete(selectedRange);
    }
  }, [selectedRange, onFormattingDelete]);

  const needsOperator = draftRuleType === "cellIs";
  const needsValue = !["containsBlanks", "notContainsBlanks", "duplicateValues", "uniqueValues"].includes(draftRuleType);
  const needsSecondValue = needsOperator && (draftOperator === "between" || draftOperator === "notBetween");

  return (
    <Accordion title="Conditional Formatting" defaultExpanded={hasFormattings || isAdding}>
      <div style={descriptionStyle}>
        Highlight cells based on their values or formulas.
      </div>

      {isAdding && selectedRange ? (
        <>
          <FieldGroup label="Range">
            <div style={{ fontSize: fontTokens.size.md }}>{formatRange(selectedRange)}</div>
          </FieldGroup>

          <FieldGroup label="Rule Type">
            <Select
              value={draftRuleType}
              options={ruleTypeOptions}
              disabled={disabled}
              onChange={(v) => setDraftRuleType(v as RuleType)}
            />
          </FieldGroup>

          {needsOperator && (
            <FieldGroup label="Condition">
              <Select
                value={draftOperator}
                options={operatorOptions}
                disabled={disabled}
                onChange={setDraftOperator}
              />
            </FieldGroup>
          )}

          {needsValue && (
            <FieldGroup label="Value">
              <Input
                type="text"
                value={draftValue1}
                placeholder="Value or formula"
                disabled={disabled}
                onChange={(v) => setDraftValue1(String(v))}
              />
            </FieldGroup>
          )}

          {needsSecondValue && (
            <FieldGroup label="And">
              <Input
                type="text"
                value={draftValue2}
                placeholder="Second value"
                disabled={disabled}
                onChange={(v) => setDraftValue2(String(v))}
              />
            </FieldGroup>
          )}

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled || (needsValue && !draftValue1)} onClick={handleSaveRule}>
              Apply
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancelAdd}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {currentFormatting && (
            <div style={ruleItemStyle}>
              <div style={ruleLabelStyle}>Rules on current selection:</div>
              {currentFormatting.rules.map((rule, idx) => (
                <div key={idx} style={ruleRangeStyle}>
                  {getRuleTypeLabel(rule)}
                  {rule.type !== "colorScale" && rule.type !== "dataBar" && rule.type !== "iconSet" &&
                    rule.formulas.length > 0 && `: ${rule.formulas.join(", ")}`}
                </div>
              ))}
              <div style={buttonRowStyle}>
                <Button size="sm" disabled={disabled} onClick={handleDeleteCurrent}>
                  Remove
                </Button>
              </div>
            </div>
          )}

          {hasFormattings && (
            <div style={{ marginBottom: spacingTokens.sm }}>
              <div style={ruleLabelStyle}>
                {totalRules} rule{totalRules !== 1 ? "s" : ""} on this sheet
              </div>
            </div>
          )}

          <div style={buttonRowStyle}>
            {selectedRange && (
              <Button size="sm" disabled={disabled} onClick={handleStartAdd}>
                Add Rule
              </Button>
            )}
            {hasFormattings && (
              <Button size="sm" disabled={disabled} onClick={onFormattingsClear}>
                Clear All
              </Button>
            )}
          </div>

          {!selectedRange && !hasFormattings && (
            <div style={{ ...descriptionStyle, fontStyle: "italic" }}>
              Select a range to add conditional formatting.
            </div>
          )}
        </>
      )}
    </Accordion>
  );
}
