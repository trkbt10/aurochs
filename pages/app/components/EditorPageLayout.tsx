/**
 * @file Shared editor page layout
 *
 * Common page structure for PPTX, DOCX, and XLSX editor pages:
 * full-height page with a header bar (back button + title) and editor container.
 */

import type { CSSProperties, ReactNode } from "react";
import { Button, ChevronLeftIcon } from "@aurochs-ui/ui-components";

type Props = {
  readonly fileName: string;
  readonly onBack: () => void;
  readonly backLabel?: string;
  readonly headerActions?: ReactNode;
  readonly editorContainerStyle?: CSSProperties;
  readonly children: ReactNode;
};

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px 16px",
  background: "var(--bg-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const defaultEditorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

export function EditorPageLayout({
  fileName,
  onBack,
  backLabel = "Back",
  headerActions,
  editorContainerStyle,
  children,
}: Props) {
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <Button variant="outline" size="md" onClick={onBack}>
          <ChevronLeftIcon size={16} />
          {backLabel}
        </Button>
        <span style={titleStyle}>{fileName}</span>
        {headerActions}
      </header>
      <div style={{ ...defaultEditorContainerStyle, ...editorContainerStyle }}>
        {children}
      </div>
    </div>
  );
}
