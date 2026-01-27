/**
 * @file Export button component
 *
 * Button for exporting the current presentation as PPTX file.
 */

import { useCallback, type CSSProperties } from "react";
import { Button, type ButtonSize } from "@oxen-ui/ui-components/primitives/Button";
import { DownloadIcon } from "@oxen-ui/ui-components/icons";
import { useExportPresentation, type UseExportPresentationOptions } from "../hooks";

// =============================================================================
// Types
// =============================================================================

export type ExportButtonProps = {
  /** File name for the exported file (default: "presentation.pptx") */
  readonly fileName?: string;
  /** Button size */
  readonly size?: ButtonSize;
  /** Whether to show text label */
  readonly showLabel?: boolean;
  /** Custom label text */
  readonly label?: string;
  /** Additional style */
  readonly style?: CSSProperties;
  /** Additional class name */
  readonly className?: string;
  /** Callback when export starts */
  readonly onExportStart?: () => void;
  /** Callback when export completes */
  readonly onExportComplete?: () => void;
  /** Callback when export fails */
  readonly onExportError?: (error: Error) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Export button for downloading the presentation as PPTX.
 *
 * @example
 * ```tsx
 * <ExportButton fileName="my-presentation.pptx" />
 * ```
 */
export function ExportButton({
  fileName = "presentation.pptx",
  size = "sm",
  showLabel = true,
  label = "Export",
  style,
  className,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const { exportPresentation, isExporting } = useExportPresentation();

  const handleExport = useCallback(async () => {
    const options: UseExportPresentationOptions = {
      fileName,
      autoDownload: true,
      onExportStart,
      onExportComplete: onExportComplete ? () => onExportComplete() : undefined,
      onExportError,
    };

    await exportPresentation(options);
  }, [exportPresentation, fileName, onExportStart, onExportComplete, onExportError]);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      title={isExporting ? "Exporting..." : "Export as PPTX"}
      style={style}
      className={className}
    >
      <DownloadIcon size={16} />
      {showLabel && (
        <span style={{ marginLeft: "6px" }}>
          {isExporting ? "Exporting..." : label}
        </span>
      )}
    </Button>
  );
}
