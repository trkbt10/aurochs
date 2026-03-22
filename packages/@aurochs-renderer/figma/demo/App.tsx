/**
 * @file Demo app main component
 */

import { useState, useCallback } from "react";
import { FileDropZone } from "./components/FileDropZone";
import { FigPreview } from "./components/FigPreview";
import type { ParsedFigFile } from "@aurochs/fig/parser";
import { parseFigFile } from "@aurochs/fig/parser";

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #333",
    background: "#16213e",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    padding: "20px",
  },
  error: {
    marginTop: "20px",
    padding: "16px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#ef4444",
  },
};






/** Main demo application component */
export function App() {
  const [parsedFile, setParsedFile] = useState<ParsedFigFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const parsed = await parseFigFile(data);

      setParsedFile(parsed);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse file";
      setError(message);
      setParsedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setParsedFile(null);
    setError(null);
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Figma File Viewer</h1>
      </header>

      <main style={styles.main}>
        {renderMainContent({ parsedFile, handleFile, isLoading, error, handleClose })}
      </main>
    </div>
  );
}

/** Render the main content area based on whether a file is loaded */
function renderMainContent({ parsedFile, handleFile, isLoading, error, handleClose }: {
  parsedFile: ParsedFigFile | null;
  handleFile: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  handleClose: () => void;
}) {
  if (!parsedFile) {
    return (
      <>
        <FileDropZone onFile={handleFile} isLoading={isLoading} />
        {error && <div style={styles.error}>{error}</div>}
      </>
    );
  }
  return <FigPreview parsedFile={parsedFile} onClose={handleClose} />;
}
