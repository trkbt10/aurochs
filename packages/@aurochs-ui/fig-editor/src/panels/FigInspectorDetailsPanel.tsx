/**
 * @file Inspector details panel — read-only, DI-extensible.
 *
 * Shows what is actually applied to the primary-selected node (fills,
 * strokes, effects, text style, instance overrides, auto-layout…).
 *
 * Intentionally separate from PropertyPanel: PropertyPanel is for
 * editing, this panel is for inspection. Each section is a plain
 * renderer function so new node features add a new section instead
 * of forcing all callers to opt into a combined bundle.
 *
 * DI contract: pass a custom `sections` array to override or extend
 * the default set. A section that has nothing to show returns null
 * and is omitted from the output.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigColor, FigEffect, FigPaint, KiwiEnumValue } from "@aurochs/fig/types";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { useFigEditor } from "../context/FigEditorContext";

// =============================================================================
// DI contract
// =============================================================================

/**
 * A single inspection section. Receives the primary-selected node and
 * returns either the rendered body (typically inside `<DetailSection>`)
 * or `null` to signal "nothing relevant to show for this node".
 */
export type DetailSectionRenderer = {
  readonly id: string;
  readonly render: (node: FigDesignNode) => ReactNode | null;
};

export type FigInspectorDetailsPanelProps = {
  /**
   * Section renderers. Defaults to `FIG_DETAIL_SECTIONS`.
   * Pass a custom array to add new sections, reorder, or trim the set.
   */
  readonly sections?: readonly DetailSectionRenderer[];
};

// =============================================================================
// Formatting helpers
// =============================================================================

function enumName(value: KiwiEnumValue | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.name;
}

function colorToCss(color: FigColor, alphaOverride?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = alphaOverride ?? color.a;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function colorToHex(color: FigColor): string {
  const to2 = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to2(color.r)}${to2(color.g)}${to2(color.b)}`;
}

function formatNumber(value: number, fractionDigits = 2): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
}

function describePaint(paint: FigPaint): { readonly label: string; readonly swatch?: string; readonly detail?: string } {
  const typeName = enumName(paint.type) ?? "UNKNOWN";
  const visible = paint.visible !== false;
  const opacity = paint.opacity ?? 1;
  const prefix = visible ? "" : "(hidden) ";

  if (typeName === "SOLID") {
    const solid = paint as FigPaint & { readonly color?: FigColor };
    const color = solid.color;
    if (color) {
      return {
        label: `${prefix}${colorToHex(color).toUpperCase()}`,
        swatch: colorToCss(color, opacity * color.a),
        detail: opacity < 1 ? `opacity ${formatNumber(opacity)}` : undefined,
      };
    }
    return { label: `${prefix}Solid` };
  }

  if (typeName.startsWith("GRADIENT_")) {
    const grad = paint as FigPaint & { readonly stops?: readonly { readonly color: FigColor }[]; readonly gradientStops?: readonly { readonly color: FigColor }[] };
    const stops = grad.stops ?? grad.gradientStops ?? [];
    const stopColors = stops.slice(0, 3).map((s) => colorToHex(s.color)).join(" → ");
    return {
      label: `${prefix}${typeName.replace("GRADIENT_", "").toLowerCase()} gradient`,
      detail: stopColors || undefined,
    };
  }

  if (typeName === "IMAGE") {
    const img = paint as FigPaint & { readonly imageRef?: string; readonly scaleMode?: string | KiwiEnumValue };
    const scale = enumName(img.scaleMode);
    return {
      label: `${prefix}Image${img.imageRef ? ` · ${img.imageRef.slice(0, 8)}…` : ""}`,
      detail: scale,
    };
  }

  return { label: `${prefix}${typeName}` };
}

function describeEffect(effect: FigEffect): { readonly label: string; readonly detail?: string } {
  const typeName = enumName(effect.type) ?? "UNKNOWN";
  const visible = effect.visible !== false;
  const prefix = visible ? "" : "(hidden) ";
  const parts: string[] = [];
  if (effect.radius !== undefined) {
    parts.push(`blur ${formatNumber(effect.radius)}`);
  }
  if (effect.spread !== undefined && effect.spread !== 0) {
    parts.push(`spread ${formatNumber(effect.spread)}`);
  }
  if (effect.offset) {
    parts.push(`offset ${formatNumber(effect.offset.x)},${formatNumber(effect.offset.y)}`);
  }
  if (effect.color) {
    parts.push(colorToHex(effect.color).toUpperCase());
  }
  return {
    label: `${prefix}${typeName.replace(/_/g, " ").toLowerCase()}`,
    detail: parts.length > 0 ? parts.join(" · ") : undefined,
  };
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
};

const legendStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  lineHeight: 1.4,
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
  borderRadius: radiusTokens.sm,
  backgroundColor: colorTokens.background.tertiary,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: colorTokens.text.secondary,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  minHeight: "1.4em",
};

const rowLabelStyle: CSSProperties = {
  flex: "0 0 90px",
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.xs,
};

const rowValueStyle: CSSProperties = {
  flex: 1,
  wordBreak: "break-word",
};

const rowDetailStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.xs,
};

const swatchStyle: CSSProperties = {
  width: "1em",
  height: "1em",
  borderRadius: radiusTokens.xs,
  border: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

// =============================================================================
// Shared UI helpers (exported so custom sections can reuse them)
// =============================================================================

export function DetailSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

export function DetailRow({ label, value, detail }: { readonly label: string; readonly value: ReactNode; readonly detail?: ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={rowLabelStyle}>{label}</div>
      <div style={rowValueStyle}>{value}</div>
      {detail !== undefined && detail !== null && <div style={rowDetailStyle}>{detail}</div>}
    </div>
  );
}

export function DetailSwatch({ color }: { readonly color: string }) {
  return <span style={{ ...swatchStyle, backgroundColor: color }} />;
}

// =============================================================================
// Raw (Kiwi) helpers
// =============================================================================

const rawInlineStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.primary,
};

const rawBlockStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.primary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  margin: 0,
  padding: spacingTokens.xs,
  backgroundColor: colorTokens.background.primary,
  borderRadius: radiusTokens.xs,
  border: `1px solid ${colorTokens.border.subtle}`,
  maxHeight: "12em",
  overflow: "auto",
};

const rawToggleStyle: CSSProperties = {
  background: "transparent",
  color: colorTokens.text.secondary,
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: radiusTokens.xs,
  fontSize: fontTokens.size.xs,
  padding: `0 ${spacingTokens.xs}`,
  cursor: "pointer",
};

function formatRawScalar(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "bigint") {
    return `${value}n`;
  }
  return typeof value;
}

function isComplex(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Object.keys(value as object).length > 0;
}

/**
 * One raw Kiwi field row. Scalars are shown inline; objects/arrays get
 * an expandable JSON block so callers can see the exact unmodeled
 * payload without overwhelming the panel.
 */
function DetailRawRow({ fieldKey, value }: { readonly fieldKey: string; readonly value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  if (!isComplex(value)) {
    return <DetailRow label={fieldKey} value={<span style={rawInlineStyle}>{formatRawScalar(value)}</span>} />;
  }
  const summary = Array.isArray(value)
    ? `array(${value.length})`
    : `object(${Object.keys(value as object).length})`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacingTokens.xs }}>
      <div style={rowStyle}>
        <div style={rowLabelStyle}>{fieldKey}</div>
        <div style={rowValueStyle}>
          <button
            type="button"
            style={rawToggleStyle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide" : "Show"} {summary}
          </button>
        </div>
      </div>
      {expanded && <pre style={rawBlockStyle}>{safeJsonStringify(value)}</pre>}
    </div>
  );
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? `${v}n` : v), 2);
  } catch (err) {
    return `<unserializable: ${err instanceof Error ? err.message : String(err)}>`;
  }
}

// =============================================================================
// Default section renderers
// =============================================================================

const identitySection: DetailSectionRenderer = {
  id: "identity",
  render: (node) => (
    <DetailSection title="Identity">
      <DetailRow label="Type" value={node.type} />
      <DetailRow label="Name" value={node.name} />
      <DetailRow label="ID" value={<code>{node.id}</code>} />
      <DetailRow label="Visible" value={node.visible ? "yes" : "no"} />
      <DetailRow label="Opacity" value={formatNumber(node.opacity)} />
      {node.blendMode && <DetailRow label="Blend" value={String(node.blendMode)} />}
    </DetailSection>
  ),
};

const geometrySection: DetailSectionRenderer = {
  id: "geometry",
  render: (node) => {
    const t = node.transform;
    const rows: ReactNode[] = [
      <DetailRow key="size" label="Size" value={`${formatNumber(node.size.x)} × ${formatNumber(node.size.y)}`} />,
      <DetailRow key="pos" label="Position" value={`${formatNumber(t.m02)}, ${formatNumber(t.m12)}`} />,
    ];
    if (node.cornerRadius !== undefined && node.cornerRadius !== 0) {
      rows.push(<DetailRow key="radius" label="Radius" value={formatNumber(node.cornerRadius)} />);
    }
    if (node.rectangleCornerRadii) {
      rows.push(
        <DetailRow
          key="radii"
          label="Radii"
          value={node.rectangleCornerRadii.map((r) => formatNumber(r)).join(" / ")}
        />,
      );
    }
    return <DetailSection title="Geometry">{rows}</DetailSection>;
  },
};

const fillsSection: DetailSectionRenderer = {
  id: "fills",
  render: (node) => {
    if (!node.fills || node.fills.length === 0) {
      return null;
    }
    return (
      <DetailSection title={`Fills (${node.fills.length})`}>
        {node.fills.map((paint, i) => {
          const d = describePaint(paint);
          return (
            <DetailRow
              key={i}
              label={`#${i + 1}`}
              value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: spacingTokens.xs }}>
                  {d.swatch && <DetailSwatch color={d.swatch} />}
                  <span>{d.label}</span>
                </span>
              }
              detail={d.detail}
            />
          );
        })}
      </DetailSection>
    );
  },
};

const strokesSection: DetailSectionRenderer = {
  id: "strokes",
  render: (node) => {
    if (!node.strokes || node.strokes.length === 0) {
      return null;
    }
    const weight =
      typeof node.strokeWeight === "number"
        ? formatNumber(node.strokeWeight)
        : `${formatNumber(node.strokeWeight.top)}/${formatNumber(node.strokeWeight.right)}/${formatNumber(node.strokeWeight.bottom)}/${formatNumber(node.strokeWeight.left)}`;
    return (
      <DetailSection title={`Strokes (${node.strokes.length})`}>
        <DetailRow label="Weight" value={weight} />
        {node.strokeAlign && <DetailRow label="Align" value={enumName(node.strokeAlign) ?? "—"} />}
        {node.strokeCap && <DetailRow label="Cap" value={enumName(node.strokeCap) ?? "—"} />}
        {node.strokeJoin && <DetailRow label="Join" value={enumName(node.strokeJoin) ?? "—"} />}
        {node.strokeDashes && node.strokeDashes.length > 0 && (
          <DetailRow label="Dash" value={node.strokeDashes.map((d) => formatNumber(d)).join(", ")} />
        )}
        {node.strokes.map((paint, i) => {
          const d = describePaint(paint);
          return (
            <DetailRow
              key={i}
              label={`#${i + 1}`}
              value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: spacingTokens.xs }}>
                  {d.swatch && <DetailSwatch color={d.swatch} />}
                  <span>{d.label}</span>
                </span>
              }
              detail={d.detail}
            />
          );
        })}
      </DetailSection>
    );
  },
};

const effectsSection: DetailSectionRenderer = {
  id: "effects",
  render: (node) => {
    if (!node.effects || node.effects.length === 0) {
      return null;
    }
    return (
      <DetailSection title={`Effects (${node.effects.length})`}>
        {node.effects.map((effect, i) => {
          const d = describeEffect(effect);
          return <DetailRow key={i} label={`#${i + 1}`} value={d.label} detail={d.detail} />;
        })}
      </DetailSection>
    );
  },
};

const textSection: DetailSectionRenderer = {
  id: "text",
  render: (node) => {
    const text = node.textData;
    if (!text) {
      return null;
    }
    const fontLabel = `${text.fontName.family} · ${text.fontName.style}`;
    return (
      <DetailSection title="Text">
        <DetailRow label="Font" value={fontLabel} />
        <DetailRow label="Size" value={formatNumber(text.fontSize)} />
        {text.textAlignHorizontal && <DetailRow label="H-align" value={enumName(text.textAlignHorizontal) ?? "—"} />}
        {text.textAlignVertical && <DetailRow label="V-align" value={enumName(text.textAlignVertical) ?? "—"} />}
        {text.textCase && <DetailRow label="Case" value={enumName(text.textCase) ?? "—"} />}
        {text.textDecoration && <DetailRow label="Decor" value={enumName(text.textDecoration) ?? "—"} />}
        {text.lineHeight && (
          <DetailRow
            label="Line height"
            value={`${formatNumber(text.lineHeight.value)} ${enumName(text.lineHeight.units) ?? ""}`}
          />
        )}
        {text.letterSpacing && (
          <DetailRow
            label="Letter sp."
            value={`${formatNumber(text.letterSpacing.value)} ${enumName(text.letterSpacing.units) ?? ""}`}
          />
        )}
        {text.styleOverrideTable && text.styleOverrideTable.length > 0 && (
          <DetailRow
            label="Overrides"
            value={`${text.styleOverrideTable.length} style run(s)`}
          />
        )}
        <DetailRow label="Chars" value={String(text.characters.length)} />
      </DetailSection>
    );
  },
};

const instanceSection: DetailSectionRenderer = {
  id: "instance",
  render: (node) => {
    if (node.type !== "INSTANCE" && !node.symbolId && (!node.componentPropertyAssignments || node.componentPropertyAssignments.length === 0) && (!node.overrides || node.overrides.length === 0)) {
      return null;
    }
    return (
      <DetailSection title="Instance">
        {node.symbolId && <DetailRow label="Symbol" value={<code>{node.symbolId}</code>} />}
        {node.overrides && node.overrides.length > 0 && (
          <DetailRow label="Overrides" value={`${node.overrides.length} entry(s)`} />
        )}
        {node.componentPropertyAssignments && node.componentPropertyAssignments.length > 0 && (
          <DetailRow
            label="Properties"
            value={`${node.componentPropertyAssignments.length} assigned`}
          />
        )}
        {node.derivedSymbolData && node.derivedSymbolData.length > 0 && (
          <DetailRow
            label="Derived"
            value={`${node.derivedSymbolData.length} layout entry(s)`}
          />
        )}
      </DetailSection>
    );
  },
};

const autoLayoutSection: DetailSectionRenderer = {
  id: "auto-layout",
  render: (node) => {
    const al = node.autoLayout;
    if (!al) {
      return null;
    }
    const padding = al.stackPadding
      ? `${formatNumber(al.stackPadding.top)} ${formatNumber(al.stackPadding.right)} ${formatNumber(al.stackPadding.bottom)} ${formatNumber(al.stackPadding.left)}`
      : undefined;
    return (
      <DetailSection title="Auto layout">
        <DetailRow label="Mode" value={enumName(al.stackMode) ?? "—"} />
        {al.stackSpacing !== undefined && <DetailRow label="Gap" value={formatNumber(al.stackSpacing)} />}
        {al.stackCounterSpacing !== undefined && <DetailRow label="Cross gap" value={formatNumber(al.stackCounterSpacing)} />}
        {padding && <DetailRow label="Padding" value={padding} />}
        {al.stackPrimaryAlignItems && <DetailRow label="Primary" value={enumName(al.stackPrimaryAlignItems) ?? "—"} />}
        {al.stackCounterAlignItems && <DetailRow label="Cross" value={enumName(al.stackCounterAlignItems) ?? "—"} />}
        {al.stackWrap !== undefined && <DetailRow label="Wrap" value={al.stackWrap ? "yes" : "no"} />}
      </DetailSection>
    );
  },
};

const rawSection: DetailSectionRenderer = {
  id: "raw",
  render: (node) => {
    const raw = node._raw;
    if (!raw) {
      return null;
    }
    const entries = Object.entries(raw);
    if (entries.length === 0) {
      return null;
    }
    return (
      <DetailSection
        title={`Raw (Kiwi) · ${entries.length} field(s) not modeled in domain`}
      >
        {entries.map(([key, value]) => (
          <DetailRawRow key={key} fieldKey={key} value={value} />
        ))}
      </DetailSection>
    );
  },
};

const constraintsSection: DetailSectionRenderer = {
  id: "constraints",
  render: (node) => {
    const lc = node.layoutConstraints;
    if (!lc) {
      return null;
    }
    return (
      <DetailSection title="Constraints">
        {lc.horizontalConstraint && <DetailRow label="Horizontal" value={enumName(lc.horizontalConstraint) ?? "—"} />}
        {lc.verticalConstraint && <DetailRow label="Vertical" value={enumName(lc.verticalConstraint) ?? "—"} />}
        {lc.stackChildAlignSelf && <DetailRow label="Align self" value={enumName(lc.stackChildAlignSelf) ?? "—"} />}
        {lc.stackChildPrimaryGrow !== undefined && (
          <DetailRow label="Grow" value={formatNumber(lc.stackChildPrimaryGrow)} />
        )}
      </DetailSection>
    );
  },
};

/**
 * Default inspection sections. Use as-is, reorder, filter, or spread
 * alongside custom sections.
 */
export const FIG_DETAIL_SECTIONS: readonly DetailSectionRenderer[] = [
  identitySection,
  geometrySection,
  fillsSection,
  strokesSection,
  effectsSection,
  textSection,
  instanceSection,
  autoLayoutSection,
  constraintsSection,
  rawSection,
];

// =============================================================================
// Panel component
// =============================================================================

/**
 * Read-only details panel for the primary-selected node.
 *
 * Drop-in panel content — pass inside `FigEditor`'s `panels` prop.
 */
export function FigInspectorDetailsPanel({
  sections = FIG_DETAIL_SECTIONS,
}: FigInspectorDetailsPanelProps) {
  const { primaryNode } = useFigEditor();

  const rendered = useMemo(() => {
    if (!primaryNode) {
      return null;
    }
    return sections
      .map((section) => ({ id: section.id, content: section.render(primaryNode) }))
      .filter((entry) => entry.content !== null);
  }, [primaryNode, sections]);

  if (!primaryNode) {
    return <div style={emptyStyle}>Select a node to see applied properties.</div>;
  }
  if (!rendered || rendered.length === 0) {
    return <div style={emptyStyle}>No inspectable properties on this node.</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={legendStyle}>
        Sections above show parsed domain properties. <strong>Raw (Kiwi)</strong>
        {" "}lists fields preserved from the binary that the domain model does
        not yet capture — use it to see what is still missing.
      </div>
      {rendered.map((entry) => (
        <div key={entry.id}>{entry.content}</div>
      ))}
    </div>
  );
}
