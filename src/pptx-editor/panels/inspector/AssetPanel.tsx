/**
 * @file Asset panel component
 *
 * Displays a list of embedded assets in the presentation.
 * Shows images, media files, and their metadata.
 */

import { useMemo, type CSSProperties } from "react";
import type { PresentationFile } from "../../../pptx/domain";
import { InspectorSection, Accordion } from "../../ui/layout";
import { colorTokens, fontTokens, spacingTokens } from "../../ui/design-tokens";

export type AssetPanelProps = {
  /** Presentation file for reading asset content */
  readonly presentationFile?: PresentationFile;
  /** List of file paths in the presentation (from loader) */
  readonly filePaths?: readonly string[];
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const assetListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1px",
};

const assetItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
  backgroundColor: colorTokens.background.secondary,
  borderRadius: "4px",
  cursor: "default",
};

const assetThumbnailStyle: CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "4px",
  backgroundColor: colorTokens.background.tertiary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  color: colorTokens.text.tertiary,
  overflow: "hidden",
};

const assetInfoStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const assetNameStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const assetMetaStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

type AssetInfo = {
  path: string;
  name: string;
  type: "image" | "audio" | "video" | "other";
  extension: string;
  size?: number;
  dataUrl?: string;
};

/**
 * Get asset type from file path.
 */
function getAssetType(path: string): AssetInfo["type"] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const imageExts = ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "tif", "wmf", "emf", "svg"];
  const audioExts = ["mp3", "wav", "m4a", "wma", "aac"];
  const videoExts = ["mp4", "avi", "wmv", "mov", "webm"];

  if (imageExts.includes(ext)) {
    return "image";
  }
  if (audioExts.includes(ext)) {
    return "audio";
  }
  if (videoExts.includes(ext)) {
    return "video";
  }
  return "other";
}

/**
 * Get icon for asset type.
 */
function getAssetIcon(type: AssetInfo["type"]): string {
  switch (type) {
    case "image":
      return "🖼️";
    case "audio":
      return "🎵";
    case "video":
      return "🎬";
    default:
      return "📄";
  }
}

/**
 * Format file size.
 */
function formatSize(bytes?: number): string {
  if (bytes === undefined) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Convert ArrayBuffer to base64 data URL.
 */
function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  // Convert to base64 in chunks to avoid stack overflow for large files
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.slice(i, i + chunkSize)));
  }
  const base64 = btoa(chunks.join(""));
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Read asset data from presentation file.
 */
function readAssetData(
  presentationFile: PresentationFile,
  path: string,
  type: AssetInfo["type"],
  extension: string,
): { size?: number; dataUrl?: string } {
  try {
    const buffer = presentationFile.readBinary(path);
    if (!buffer) {
      return {};
    }
    const size = buffer.byteLength;
    const dataUrl =
      type === "image" ? bufferToDataUrl(buffer, getMimeType(extension)) : undefined;
    return { size, dataUrl };
  } catch {
    return {};
  }
}

/**
 * Extract assets from presentation file.
 */
function extractAssets(presentationFile: PresentationFile, filePaths: readonly string[]): AssetInfo[] {
  const mediaPrefix = "ppt/media/";

  const assets = filePaths
    .filter((path) => path.startsWith(mediaPrefix))
    .map((path) => {
      const name = path.slice(mediaPrefix.length);
      const extension = name.split(".").pop()?.toLowerCase() ?? "";
      const type = getAssetType(path);
      const { size, dataUrl } = readAssetData(presentationFile, path, type, extension);

      return { path, name, type, extension, size, dataUrl };
    });

  return assets.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get MIME type for file extension.
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    wmf: "image/x-wmf",
    emf: "image/x-emf",
    svg: "image/svg+xml",
  };
  return mimeTypes[ext] ?? "application/octet-stream";
}

const thumbnailImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

/**
 * Render asset thumbnail (image preview or icon).
 */
function AssetThumbnail({ asset }: { asset: AssetInfo }) {
  if (asset.dataUrl) {
    return <img src={asset.dataUrl} alt={asset.name} style={thumbnailImageStyle} />;
  }
  return <span>{getAssetIcon(asset.type)}</span>;
}

/**
 * Render a single asset item.
 */
function AssetItem({ asset }: { asset: AssetInfo }) {
  return (
    <div style={assetItemStyle} title={asset.path}>
      <div style={assetThumbnailStyle}>
        <AssetThumbnail asset={asset} />
      </div>
      <div style={assetInfoStyle}>
        <div style={assetNameStyle}>{asset.name}</div>
        <div style={assetMetaStyle}>
          {asset.extension.toUpperCase()} • {formatSize(asset.size)}
        </div>
      </div>
    </div>
  );
}

/**
 * Render asset list by type.
 */
function AssetList({ assets, type, title }: { assets: AssetInfo[]; type: AssetInfo["type"]; title: string }) {
  const filtered = assets.filter((a) => a.type === type);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <Accordion title={`${title} (${filtered.length})`} defaultExpanded>
      <div style={assetListStyle}>
        {filtered.map((asset) => (
          <AssetItem key={asset.path} asset={asset} />
        ))}
      </div>
    </Accordion>
  );
}

/**
 * Render asset lists grouped by type.
 */
function AssetLists({ assets }: { assets: AssetInfo[] }) {
  return (
    <>
      <AssetList assets={assets} type="image" title="Images" />
      <AssetList assets={assets} type="audio" title="Audio" />
      <AssetList assets={assets} type="video" title="Video" />
      <AssetList assets={assets} type="other" title="Other" />
    </>
  );
}

/**
 * Render panel content based on state.
 */
function AssetPanelContent({
  presentationFile,
  filePaths,
  assets,
}: {
  presentationFile?: PresentationFile;
  filePaths?: readonly string[];
  assets: AssetInfo[];
}) {
  if (!presentationFile || !filePaths) {
    return <div style={emptyStateStyle}>No presentation file loaded</div>;
  }
  if (assets.length === 0) {
    return <div style={emptyStateStyle}>No embedded assets found</div>;
  }
  return <AssetLists assets={assets} />;
}

/**
 * Asset panel component.
 *
 * Displays embedded assets in the presentation:
 * - Images (PNG, JPEG, etc.)
 * - Audio files
 * - Video files
 * - Other media
 */
export function AssetPanel({ presentationFile, filePaths }: AssetPanelProps) {
  const assets = useMemo(() => {
    if (!presentationFile || !filePaths) {
      return [];
    }
    return extractAssets(presentationFile, filePaths);
  }, [presentationFile, filePaths]);

  return (
    <div style={containerStyle}>
      <InspectorSection title="Assets">
        <AssetPanelContent presentationFile={presentationFile} filePaths={filePaths} assets={assets} />
      </InspectorSection>
    </div>
  );
}
