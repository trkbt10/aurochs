/**
 * @file Theme import/export section component
 *
 * Context-free UI component for theme import (.potx upload) and export (.potx download).
 * Takes callback props so the caller can inject its own logic (builder, extractor, etc.).
 *
 * Shared between potx-editor (theme editing) and pptx-editor (theme replacement).
 */

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { DownloadIcon, UploadIcon } from "@aurochs-ui/ui-components/icons";
import { spacingTokens, fontTokens, colorTokens, iconTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ThemeImportExportSectionProps = {
  /** Called when the user clicks export. Caller provides the async export logic. */
  readonly onExport: () => Promise<void>;
  /** Called when the user picks a file. Receives the raw ArrayBuffer for caller to parse. */
  readonly onImport: (buffer: ArrayBuffer, fileName: string) => Promise<void>;
  /** Section title (default: "Import / Export") */
  readonly title?: string;
  /** Whether to start expanded (default: true) */
  readonly defaultExpanded?: boolean;
  /** File extensions to accept (default: ".potx,.pptx") */
  readonly accept?: string;
  /** Disable both buttons */
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const rowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const errorStyle: CSSProperties = {
  padding: `0 ${spacingTokens.sm} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.xs,
  color: `var(--accent-danger, ${colorTokens.accent.danger})`,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Theme import/export section with export (.potx download) and import (.potx upload) buttons.
 *
 * This component is context-free: all IO logic is provided via callbacks.
 * The caller is responsible for:
 * - `onExport`: generating the POTX blob and triggering download
 * - `onImport`: parsing the ArrayBuffer via `extractThemeFromBuffer` and applying to state
 */
export function ThemeImportExportSection({
  onExport,
  onImport,
  title = "Import / Export",
  defaultExpanded = true,
  accept = ".potx,.pptx",
  disabled,
}: ThemeImportExportSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleExport = useCallback(async () => {
    setError(undefined);
    setIsExporting(true);
    try {
      await onExport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [onExport]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { return; }
    setError(undefined);
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      await onImport(buffer, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
      // Reset input so the same file can be re-imported
      e.target.value = "";
    }
  }, [onImport]);

  const isBusy = isExporting || isImporting;

  return (
    <OptionalPropertySection title={title} defaultExpanded={defaultExpanded}>
      <div style={rowStyle}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={disabled || isBusy}
          title="Export theme as .potx file"
        >
          <DownloadIcon size={iconTokens.size.sm} />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          disabled={disabled || isBusy}
          title="Import theme from .potx/.pptx file"
        >
          <UploadIcon size={iconTokens.size.sm} />
          {isImporting ? "Importing..." : "Import"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
      {error && <div style={errorStyle}>{error}</div>}
    </OptionalPropertySection>
  );
}
