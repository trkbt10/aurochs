import { useCallback, useRef, useState, useEffect } from "react";
import "./FileUpload.css";

type Props = {
  onFileSelect: (file: File) => void;
  onDemoLoad: () => void;
  isLoading?: boolean;
};

export function FileUpload({ onFileSelect, onDemoLoad, isLoading }: Props) {
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <span className="logo-text">web-pptx</span>
        </div>
        <a
          href="https://github.com/trkbt10/web-pptx"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
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

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading presentation...</span>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="upload-text">
                  <span className="upload-primary">Drop your .pptx file here</span>
                  <span className="upload-secondary">or click to browse</span>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="divider">
            <span>or try with</span>
          </div>

          {/* Demo Button */}
          <button className="demo-button" onClick={onDemoLoad} disabled={isLoading}>
            <span>Load Demo Presentation</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Features */}
        <div className={`features ${mounted ? "mounted" : ""}`}>
          <div className="feature">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div className="feature-content">
              <span className="feature-title">SVG Rendering</span>
              <span className="feature-desc">Crisp at any resolution</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="feature-content">
              <span className="feature-title">Presentation Mode</span>
              <span className="feature-desc">Fullscreen slideshow</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
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
      </footer>
    </div>
  );
}
