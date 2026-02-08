/**
 * @file Drag and drop file upload component
 */

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";

type Props = {
  readonly onFile: (file: File) => void;
  readonly isLoading?: boolean;
};

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
  },
  dropZone: {
    width: "100%",
    maxWidth: "600px",
    minHeight: "300px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "40px",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "#4a5568",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.02)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  dropZoneDragging: {
    borderColor: "#6366f1",
    background: "rgba(99, 102, 241, 0.1)",
  },
  dropZoneLoading: {
    borderColor: "#6366f1",
    background: "rgba(99, 102, 241, 0.05)",
    cursor: "wait",
  },
  icon: {
    fontSize: "48px",
    opacity: 0.5,
  },
  title: {
    fontSize: "18px",
    fontWeight: 500,
    color: "#e2e8f0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  input: {
    display: "none",
  },
  button: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    background: "#6366f1",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(99, 102, 241, 0.3)",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

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
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".fig")) {
          onFile(file);
        }
      }
    },
    [onFile, isLoading]
  );

  const handleClick = useCallback(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.click();
    }
  }, [isLoading]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".fig")) {
          onFile(file);
        }
      }
      // Reset input
      e.target.value = "";
    },
    [onFile]
  );

  const dropZoneStyle = {
    ...styles.dropZone,
    ...(isLoading ? styles.dropZoneLoading : isDragging ? styles.dropZoneDragging : {}),
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
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
            <div style={styles.spinner} />
            <div style={styles.title}>Parsing file...</div>
          </>
        ) : (
          <>
            <div style={styles.icon}>📁</div>
            <div style={styles.title}>
              {isDragging ? "Drop your .fig file here" : "Drag & drop a .fig file"}
            </div>
            <div style={styles.subtitle}>or click to browse</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".fig"
        style={styles.input}
        onChange={handleInputChange}
      />
    </div>
  );
}
