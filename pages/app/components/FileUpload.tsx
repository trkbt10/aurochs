/**
 * @file Upload screen with file input + demo launch.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import {
  UploadIcon,
  ArrowRightIcon,
  GridIcon,
  PlayIcon,
  ShieldIcon,
  GitHubIcon,
  LogoIcon,
} from "./ui";
import "./FileUpload.css";

type Props = {
  onFileSelect: (file: File) => void;
  onDemoLoad: () => void;
  isLoading?: boolean;
  onEditorTest?: () => void;
  onDrawingMLTest?: () => void;
};

/**
 * File upload landing screen for the web PPTX viewer.
 */
export function FileUpload({ onFileSelect, onDemoLoad, isLoading, onEditorTest, onDrawingMLTest }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith(".pptx")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".pptx")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const renderUploadContent = () => {
    if (isLoading) {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading presentation...</span>
        </div>
      );
    }

    return (
      <>
        <div className="upload-icon">
          <UploadIcon size={32} />
        </div>
        <div className="upload-text">
          <span className="upload-primary">Drop your .pptx file here</span>
          <span className="upload-secondary">or click to browse</span>
        </div>
      </>
    );
  };

  return (
    <div className="upload-page">
      {/* Ambient background effects */}
      <div className="ambient-bg">
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />
        <div className="grid-overlay" />
      </div>

      {/* Header */}
      <header className={`upload-header ${mounted ? "mounted" : ""}`}>
        <div className="logo">
          <div className="logo-mark">
            <LogoIcon size={24} />
          </div>
          <span className="logo-text">web-pptx</span>
        </div>
        <a
          href="https://github.com/trkbt10/web-pptx"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <GitHubIcon size={20} />
        </a>
      </header>

      {/* Hero Section */}
      <main className="upload-main">
        <div className={`hero-content ${mounted ? "mounted" : ""}`}>
          <div className="badge">
            <span className="badge-dot" />
            <span>Open Source PPTX Viewer</span>
          </div>

          <h1 className="hero-title">
            View presentations
            <br />
            <span className="gradient-text">in the browser</span>
          </h1>

          <p className="hero-description">
            A powerful, client-side PowerPoint viewer. No uploads to servers.
            <br />
            Your files stay on your device.
          </p>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragging ? "dragging" : ""} ${isLoading ? "loading" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileChange}
              className="file-input"
            />

            <div className="upload-zone-border" />

            {renderUploadContent()}
          </div>

          {/* Divider */}
          <div className="divider">
            <span>or try with</span>
          </div>

          {/* Demo Button */}
          <button className="demo-button" onClick={onDemoLoad} disabled={isLoading}>
            <span>Load Demo Presentation</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>

        {/* Features */}
        <div className={`features ${mounted ? "mounted" : ""}`}>
          <div className="feature">
            <div className="feature-icon">
              <GridIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">SVG Rendering</span>
              <span className="feature-desc">Crisp at any resolution</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <PlayIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">Presentation Mode</span>
              <span className="feature-desc">Fullscreen slideshow</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <ShieldIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">100% Private</span>
              <span className="feature-desc">Files never leave your device</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`upload-footer ${mounted ? "mounted" : ""}`}>
        <span className="footer-text">
          Built with precision. Powered by TypeScript.
        </span>
        {onEditorTest && (
          <button
            className="editor-test-link"
            onClick={onEditorTest}
            style={{
              marginLeft: "16px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Editor Test
          </button>
        )}
        {onDrawingMLTest && (
          <button
            className="drawingml-test-link"
            onClick={onDrawingMLTest}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            DrawingML Test
          </button>
        )}
      </footer>
    </div>
  );
}
