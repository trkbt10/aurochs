/**
 * @file Drag and drop file upload component for .fig files
 */

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent, type CSSProperties } from "react";
import { colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components";

type Props = {
  readonly onFile: (file: File) => void;
  readonly isLoading?: boolean;
};

// =============================================================================
// Styles (layout + design tokens)
// =============================================================================

const containerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: spacingTokens.lg,
};

const dropZoneBaseStyle: CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  minHeight: "300px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: spacingTokens.md,
  padding: spacingTokens.xl,
  borderWidth: "2px",
  borderStyle: "dashed",
  borderColor: colorTokens.border.strong,
  borderRadius: radiusTokens.lg,
  backgroundColor: colorTokens.background.tertiary,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const dropZoneDraggingOverride: CSSProperties = {
  borderColor: colorTokens.accent.primary,
  backgroundColor: `color-mix(in srgb, ${colorTokens.accent.primary} 8%, ${colorTokens.background.tertiary})`,
};

const dropZoneLoadingOverride: CSSProperties = {
  borderColor: colorTokens.accent.primary,
  backgroundColor: `color-mix(in srgb, ${colorTokens.accent.primary} 4%, ${colorTokens.background.tertiary})`,
  cursor: "wait",
};

const iconStyle: CSSProperties = {
  fontSize: "48px",
  opacity: 0.5,
};

const dropTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.xl,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.primary,
};

const subtitleStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  color: colorTokens.text.secondary,
};

const inputStyle: CSSProperties = {
  display: "none",
};

const spinnerStyle: CSSProperties = {
  width: "40px",
  height: "40px",
  border: `3px solid color-mix(in srgb, ${colorTokens.accent.primary} 30%, transparent)`,
  borderTopColor: colorTokens.accent.primary,
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

// =============================================================================
// Component
// =============================================================================

export function FileDropZone({ onFile, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isLoading) return;
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith(".fig")) {
        onFile(files[0]);
      }
    },
    [onFile, isLoading],
  );

  const handleClick = useCallback(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.click();
    }
  }, [isLoading]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && files[0].name.endsWith(".fig")) {
        onFile(files[0]);
      }
      e.target.value = "";
    },
    [onFile],
  );

  const dropZoneStyle: CSSProperties = {
    ...dropZoneBaseStyle,
    ...(isLoading ? dropZoneLoadingOverride : isDragging ? dropZoneDraggingOverride : {}),
  };

  return (
    <div style={containerStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={dropZoneStyle}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isLoading ? (
          <>
            <div style={spinnerStyle} />
            <div style={dropTitleStyle}>Parsing file...</div>
          </>
        ) : (
          <>
            <div style={iconStyle}>📁</div>
            <div style={dropTitleStyle}>
              {isDragging ? "Drop your .fig file here" : "Drag & drop a .fig file"}
            </div>
            <div style={subtitleStyle}>or click to browse</div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".fig" style={inputStyle} onChange={handleInputChange} />
    </div>
  );
}
