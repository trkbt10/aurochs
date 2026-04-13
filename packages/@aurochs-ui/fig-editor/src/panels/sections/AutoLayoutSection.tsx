/**
 * @file AutoLayout display section
 *
 * Shows auto-layout properties of frame/component nodes.
 * Read-only display with the key layout parameters.
 */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

type AutoLayoutSectionProps = {
  readonly node: FigDesignNode;
};

function enumName(val: KiwiEnumValue | undefined): string {
  if (!val) {return "—";}
  return val.name ?? String(val.value);
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: fontTokens.size.sm,
  padding: "1px 0",
};

const labelStyle: CSSProperties = {
  color: colorTokens.text.secondary,
};

const valueStyle: CSSProperties = {
  color: colorTokens.text.primary,
  fontFamily: "monospace",
};

function PropertyRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}






/** Panel section for viewing and editing auto layout properties of a Figma node. */
export function AutoLayoutSection({ node }: AutoLayoutSectionProps) {
  const al = node.autoLayout;
  if (!al) {
    return null;
  }

  const direction = enumName(al.stackMode);
  const padding = al.stackPadding;
  const paddingStr = padding ? `${padding.top} ${padding.right} ${padding.bottom} ${padding.left}` : "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <PropertyRow label="Direction" value={direction} />
      <PropertyRow label="Gap" value={al.stackSpacing ?? 0} />
      <PropertyRow label="Padding" value={paddingStr} />
      <PropertyRow label="Align" value={enumName(al.stackPrimaryAlignItems)} />
      <PropertyRow label="Counter" value={enumName(al.stackCounterAlignItems)} />
      {al.stackWrap && <PropertyRow label="Wrap" value="Yes" />}
    </div>
  );
}
