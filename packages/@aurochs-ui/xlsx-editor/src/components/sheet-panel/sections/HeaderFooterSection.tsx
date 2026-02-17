/**
 * @file Header/Footer section
 *
 * Section for header and footer content configuration.
 * Supports format codes: &L (left), &C (center), &R (right), &P (page), &N (pages), etc.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Input, Toggle, FieldGroup, FieldRow } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxHeaderFooter } from "@aurochs-office/xlsx/domain/page-setup";

export type HeaderFooterSectionProps = {
  readonly disabled: boolean;
  readonly headerFooter: XlsxHeaderFooter | undefined;
  readonly onHeaderFooterChange: (headerFooter: XlsxHeaderFooter) => void;
};

const hintStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
  lineHeight: 1.4,
};

const subsectionStyle: CSSProperties = {
  marginTop: spacingTokens.md,
  paddingTop: spacingTokens.sm,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
};

const subsectionTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.secondary,
  marginBottom: spacingTokens.sm,
};

/**
 * Header/Footer configuration section.
 */
export function HeaderFooterSection({ disabled, headerFooter, onHeaderFooterChange }: HeaderFooterSectionProps) {
  const current = useMemo(() => headerFooter ?? {}, [headerFooter]);

  const update = useCallback(
    (partial: Partial<XlsxHeaderFooter>) => {
      onHeaderFooterChange({ ...current, ...partial });
    },
    [current, onHeaderFooterChange],
  );

  return (
    <Accordion title="Header / Footer" defaultExpanded>
      {/* Format codes hint */}
      <div style={hintStyle}>
        Codes: <code>&amp;L</code> left, <code>&amp;C</code> center, <code>&amp;R</code> right,{" "}
        <code>&amp;P</code> page, <code>&amp;N</code> pages, <code>&amp;D</code> date,{" "}
        <code>&amp;F</code> file, <code>&amp;A</code> sheet
      </div>

      {/* Odd pages (default) */}
      <FieldGroup label="Header">
        <Input
          type="text"
          value={current.oddHeader ?? ""}
          placeholder="&CHeader Text"
          disabled={disabled}
          onChange={(value) => update({ oddHeader: String(value) })}
        />
      </FieldGroup>

      <FieldGroup label="Footer">
        <Input
          type="text"
          value={current.oddFooter ?? ""}
          placeholder="&LPage &P&R&D"
          disabled={disabled}
          onChange={(value) => update({ oddFooter: String(value) })}
        />
      </FieldGroup>

      {/* Options */}
      <div style={subsectionStyle}>
        <div style={subsectionTitleStyle}>Options</div>
        <FieldRow>
          <FieldGroup label="Different First" inline labelWidth={100}>
            <Toggle
              checked={current.differentFirst ?? false}
              disabled={disabled}
              onChange={(checked) => update({ differentFirst: checked })}
            />
          </FieldGroup>
          <FieldGroup label="Different Odd/Even" inline labelWidth={120}>
            <Toggle
              checked={current.differentOddEven ?? false}
              disabled={disabled}
              onChange={(checked) => update({ differentOddEven: checked })}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Scale with Doc" inline labelWidth={100}>
            <Toggle
              checked={current.scaleWithDoc ?? true}
              disabled={disabled}
              onChange={(checked) => update({ scaleWithDoc: checked })}
            />
          </FieldGroup>
          <FieldGroup label="Align with Margins" inline labelWidth={120}>
            <Toggle
              checked={current.alignWithMargins ?? true}
              disabled={disabled}
              onChange={(checked) => update({ alignWithMargins: checked })}
            />
          </FieldGroup>
        </FieldRow>
      </div>

      {/* First page (conditional) */}
      {current.differentFirst && (
        <div style={subsectionStyle}>
          <div style={subsectionTitleStyle}>First Page</div>
          <FieldGroup label="Header">
            <Input
              type="text"
              value={current.firstHeader ?? ""}
              placeholder="First page header"
              disabled={disabled}
              onChange={(value) => update({ firstHeader: String(value) })}
            />
          </FieldGroup>
          <FieldGroup label="Footer">
            <Input
              type="text"
              value={current.firstFooter ?? ""}
              placeholder="First page footer"
              disabled={disabled}
              onChange={(value) => update({ firstFooter: String(value) })}
            />
          </FieldGroup>
        </div>
      )}

      {/* Even pages (conditional) */}
      {current.differentOddEven && (
        <div style={subsectionStyle}>
          <div style={subsectionTitleStyle}>Even Pages</div>
          <FieldGroup label="Header">
            <Input
              type="text"
              value={current.evenHeader ?? ""}
              placeholder="Even page header"
              disabled={disabled}
              onChange={(value) => update({ evenHeader: String(value) })}
            />
          </FieldGroup>
          <FieldGroup label="Footer">
            <Input
              type="text"
              value={current.evenFooter ?? ""}
              placeholder="Even page footer"
              disabled={disabled}
              onChange={(value) => update({ evenFooter: String(value) })}
            />
          </FieldGroup>
        </div>
      )}
    </Accordion>
  );
}
