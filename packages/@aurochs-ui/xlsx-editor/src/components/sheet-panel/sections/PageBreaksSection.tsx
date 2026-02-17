/**
 * @file Page Breaks section
 *
 * Section for page break configuration (row and column breaks).
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { Accordion, Input, Button, FieldGroup, FieldRow } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxPageBreaks, XlsxPageBreak } from "@aurochs-office/xlsx/domain/page-breaks";

export type PageBreaksSectionProps = {
  readonly disabled: boolean;
  readonly pageBreaks: XlsxPageBreaks | undefined;
  readonly onPageBreaksChange: (pageBreaks: XlsxPageBreaks) => void;
};

const subsectionStyle: CSSProperties = {
  marginTop: spacingTokens.sm,
};

const subsectionTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.secondary,
  marginBottom: spacingTokens.xs,
};

const breakListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  marginBottom: spacingTokens.sm,
};

const breakItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: "4px",
  fontSize: fontTokens.size.sm,
};

const emptyStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  fontStyle: "italic",
  marginBottom: spacingTokens.sm,
};

/**
 * Page breaks configuration section.
 */
export function PageBreaksSection({ disabled, pageBreaks, onPageBreaksChange }: PageBreaksSectionProps) {
  const current = useMemo<XlsxPageBreaks>(
    () => pageBreaks ?? { rowBreaks: [], colBreaks: [] },
    [pageBreaks],
  );

  const [newRowBreak, setNewRowBreak] = useState<number>(1);
  const [newColBreak, setNewColBreak] = useState<number>(1);

  const addRowBreak = useCallback(() => {
    const existing = current.rowBreaks.some((b) => b.id === newRowBreak);
    if (existing) return;
    const newBreak: XlsxPageBreak = { id: newRowBreak, manual: true };
    onPageBreaksChange({
      ...current,
      rowBreaks: [...current.rowBreaks, newBreak].sort((a, b) => a.id - b.id),
    });
  }, [current, newRowBreak, onPageBreaksChange]);

  const removeRowBreak = useCallback(
    (id: number) => {
      onPageBreaksChange({
        ...current,
        rowBreaks: current.rowBreaks.filter((b) => b.id !== id),
      });
    },
    [current, onPageBreaksChange],
  );

  const addColBreak = useCallback(() => {
    const existing = current.colBreaks.some((b) => b.id === newColBreak);
    if (existing) return;
    const newBreak: XlsxPageBreak = { id: newColBreak, manual: true };
    onPageBreaksChange({
      ...current,
      colBreaks: [...current.colBreaks, newBreak].sort((a, b) => a.id - b.id),
    });
  }, [current, newColBreak, onPageBreaksChange]);

  const removeColBreak = useCallback(
    (id: number) => {
      onPageBreaksChange({
        ...current,
        colBreaks: current.colBreaks.filter((b) => b.id !== id),
      });
    },
    [current, onPageBreaksChange],
  );

  return (
    <Accordion title="Page Breaks" defaultExpanded={false}>
      {/* Row Breaks */}
      <div style={subsectionStyle}>
        <div style={subsectionTitleStyle}>Row Breaks (Horizontal)</div>
        {current.rowBreaks.length === 0 ? (
          <div style={emptyStyle}>No row breaks</div>
        ) : (
          <div style={breakListStyle}>
            {current.rowBreaks.map((b) => (
              <div key={b.id} style={breakItemStyle}>
                <span style={{ flex: 1 }}>After row {b.id}</span>
                <Button size="sm" disabled={disabled} onClick={() => removeRowBreak(b.id)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
        <FieldRow>
          <FieldGroup label="Add after row" inline labelWidth={90}>
            <Input
              type="number"
              value={newRowBreak}
              min={1}
              disabled={disabled}
              onChange={(v) => setNewRowBreak(Number(v))}
            />
          </FieldGroup>
          <Button size="sm" disabled={disabled} onClick={addRowBreak}>
            Add
          </Button>
        </FieldRow>
      </div>

      {/* Column Breaks */}
      <div style={{ ...subsectionStyle, borderTop: `1px solid ${colorTokens.border.subtle}`, paddingTop: spacingTokens.sm }}>
        <div style={subsectionTitleStyle}>Column Breaks (Vertical)</div>
        {current.colBreaks.length === 0 ? (
          <div style={emptyStyle}>No column breaks</div>
        ) : (
          <div style={breakListStyle}>
            {current.colBreaks.map((b) => (
              <div key={b.id} style={breakItemStyle}>
                <span style={{ flex: 1 }}>After column {b.id}</span>
                <Button size="sm" disabled={disabled} onClick={() => removeColBreak(b.id)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
        <FieldRow>
          <FieldGroup label="Add after col" inline labelWidth={90}>
            <Input
              type="number"
              value={newColBreak}
              min={1}
              disabled={disabled}
              onChange={(v) => setNewColBreak(Number(v))}
            />
          </FieldGroup>
          <Button size="sm" disabled={disabled} onClick={addColBreak}>
            Add
          </Button>
        </FieldRow>
      </div>
    </Accordion>
  );
}
