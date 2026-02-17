/**
 * @file Hyperlink section (format panel)
 *
 * UI for viewing and editing cell hyperlinks.
 */

import { useState, useCallback, type CSSProperties } from "react";
import { Accordion, Input, Button, FieldGroup, Select, type SelectOption } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type HyperlinkSectionProps = {
  readonly disabled: boolean;
  readonly address: CellAddress;
  readonly hyperlink: XlsxHyperlink | undefined;
  readonly onHyperlinkChange: (hyperlink: XlsxHyperlink) => void;
  readonly onHyperlinkDelete: () => void;
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
};

const noHyperlinkStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  fontStyle: "italic",
  marginBottom: spacingTokens.sm,
};

const linkDisplayStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  marginBottom: spacingTokens.sm,
  wordBreak: "break-all",
};

const linkTargetStyle: CSSProperties = {
  color: colorTokens.accent.primary,
  textDecoration: "underline",
  cursor: "pointer",
};

const targetModeOptions: readonly SelectOption<string>[] = [
  { value: "External", label: "External (URL)" },
  { value: "Internal", label: "Internal (Sheet)" },
];

/**
 * Hyperlink editing section in the format panel.
 */
export function HyperlinkSection({
  disabled,
  address,
  hyperlink,
  onHyperlinkChange,
  onHyperlinkDelete,
}: HyperlinkSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTarget, setDraftTarget] = useState(hyperlink?.target ?? "");
  const [draftDisplay, setDraftDisplay] = useState(hyperlink?.display ?? "");
  const [draftTooltip, setDraftTooltip] = useState(hyperlink?.tooltip ?? "");
  const [draftLocation, setDraftLocation] = useState(hyperlink?.location ?? "");
  const [draftTargetMode, setDraftTargetMode] = useState<"External" | "Internal">(
    hyperlink?.targetMode ?? "External",
  );

  const hasHyperlink = hyperlink !== undefined;

  const handleStartEdit = useCallback(() => {
    setDraftTarget(hyperlink?.target ?? "");
    setDraftDisplay(hyperlink?.display ?? "");
    setDraftTooltip(hyperlink?.tooltip ?? "");
    setDraftLocation(hyperlink?.location ?? "");
    setDraftTargetMode(hyperlink?.targetMode ?? "External");
    setIsEditing(true);
  }, [hyperlink]);

  const handleSave = useCallback(() => {
    const trimmedTarget = draftTarget.trim();
    if (trimmedTarget.length === 0) {
      // Empty target = delete hyperlink
      onHyperlinkDelete();
    } else {
      const ref: CellRange = { start: address, end: address };
      onHyperlinkChange({
        ref,
        target: trimmedTarget,
        targetMode: draftTargetMode,
        display: draftDisplay.trim() || undefined,
        tooltip: draftTooltip.trim() || undefined,
        location: draftLocation.trim() || undefined,
      });
    }
    setIsEditing(false);
  }, [address, draftTarget, draftDisplay, draftTooltip, draftLocation, draftTargetMode, onHyperlinkChange, onHyperlinkDelete]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraftTarget(hyperlink?.target ?? "");
    setDraftDisplay(hyperlink?.display ?? "");
    setDraftTooltip(hyperlink?.tooltip ?? "");
    setDraftLocation(hyperlink?.location ?? "");
    setDraftTargetMode(hyperlink?.targetMode ?? "External");
  }, [hyperlink]);

  const handleDelete = useCallback(() => {
    onHyperlinkDelete();
    setIsEditing(false);
    setDraftTarget("");
    setDraftDisplay("");
    setDraftTooltip("");
    setDraftLocation("");
    setDraftTargetMode("External");
  }, [onHyperlinkDelete]);

  const handleOpenLink = useCallback(() => {
    if (hyperlink?.target && hyperlink.targetMode === "External") {
      window.open(hyperlink.target, "_blank", "noopener,noreferrer");
    }
  }, [hyperlink]);

  return (
    <Accordion title="Hyperlink" defaultExpanded={hasHyperlink}>
      {isEditing ? (
        <>
          <FieldGroup label="Target Mode">
            <Select
              value={draftTargetMode}
              options={targetModeOptions}
              disabled={disabled}
              onChange={(v) => setDraftTargetMode(v as "External" | "Internal")}
            />
          </FieldGroup>
          <FieldGroup label={draftTargetMode === "External" ? "URL" : "Reference"}>
            <Input
              type="text"
              value={draftTarget}
              placeholder={draftTargetMode === "External" ? "https://example.com" : "Sheet1!A1"}
              disabled={disabled}
              onChange={(v) => setDraftTarget(String(v))}
            />
          </FieldGroup>
          <FieldGroup label="Display Text">
            <Input
              type="text"
              value={draftDisplay}
              placeholder="(optional) Text to display"
              disabled={disabled}
              onChange={(v) => setDraftDisplay(String(v))}
            />
          </FieldGroup>
          <FieldGroup label="Tooltip">
            <Input
              type="text"
              value={draftTooltip}
              placeholder="(optional) Hover text"
              disabled={disabled}
              onChange={(v) => setDraftTooltip(String(v))}
            />
          </FieldGroup>
          {draftTargetMode === "External" && (
            <FieldGroup label="Location">
              <Input
                type="text"
                value={draftLocation}
                placeholder="(optional) Bookmark/anchor"
                disabled={disabled}
                onChange={(v) => setDraftLocation(String(v))}
              />
            </FieldGroup>
          )}
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancel}>
              Cancel
            </Button>
            {hasHyperlink && (
              <Button size="sm" disabled={disabled} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        </>
      ) : hasHyperlink ? (
        <>
          <div style={linkDisplayStyle}>
            <span
              style={hyperlink.targetMode === "External" ? linkTargetStyle : undefined}
              onClick={hyperlink.targetMode === "External" ? handleOpenLink : undefined}
              title={hyperlink.tooltip}
            >
              {hyperlink.display || hyperlink.target}
            </span>
          </div>
          {hyperlink.target && hyperlink.display && (
            <div style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.secondary, marginBottom: spacingTokens.xs }}>
              Target: {hyperlink.target}
            </div>
          )}
          {hyperlink.targetMode && (
            <div style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.tertiary, marginBottom: spacingTokens.sm }}>
              Type: {hyperlink.targetMode === "External" ? "External URL" : "Internal Reference"}
            </div>
          )}
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleStartEdit}>
              Edit
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={noHyperlinkStyle}>No hyperlink on this cell</div>
          <Button size="sm" disabled={disabled} onClick={handleStartEdit}>
            Add Hyperlink
          </Button>
        </>
      )}
    </Accordion>
  );
}
