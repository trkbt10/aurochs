/**
 * @file Asset panel component
 *
 * Displays a list of embedded assets in the presentation.
 * Uses OPC relationships to discover media files (ECMA-376 compliant).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import { useMemo, type CSSProperties } from "react";
import type { PresentationFile } from "../../../pptx/domain";
import { discoverMediaPaths } from "../../../pptx/app/media-discovery";
import { toDataUrl, formatSize } from "../../../buffer";
import { getMimeTypeFromPath } from "../../../pptx/opc";
import { InspectorSection, Accordion } from "../../ui/layout";
import { ImageIcon, AudioIcon, VideoIcon, FileIcon, iconTokens } from "../../ui/icons";
import { colorTokens, fontTokens, spacingTokens } from "../../ui/design-tokens";

export type AssetPanelProps = {
  /** Presentation file for reading asset content */
  readonly presentationFile?: PresentationFile;
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
 * Get icon component for asset type.
 */
const ASSET_TYPE_ICONS = {
  image: ImageIcon,
  audio: AudioIcon,
  video: VideoIcon,
  other: FileIcon,
} as const;

/**
 * Read asset data from presentation file.
 */
function readAssetData(
  presentationFile: PresentationFile,
  path: string,
  type: AssetInfo["type"],
): { size?: number; dataUrl?: string } {
  try {
    const buffer = presentationFile.readBinary(path);
    if (!buffer) {
      return {};
    }
    const size = buffer.byteLength;
    const mimeType = getMimeTypeFromPath(path);
    const dataUrl =
      type === "image" && mimeType ? toDataUrl(buffer, mimeType) : undefined;
    return { size, dataUrl };
  } catch {
    return {};
  }
}

/**
 * Build asset info from discovered media paths.
 */
function buildAssetInfo(presentationFile: PresentationFile, mediaPaths: readonly string[]): AssetInfo[] {
  return mediaPaths.map((path) => {
    const name = path.split("/").pop() ?? path;
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const type = getAssetType(path);
    const { size, dataUrl } = readAssetData(presentationFile, path, type);

    return { path, name, type, extension, size, dataUrl };
  });
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
  const IconComponent = ASSET_TYPE_ICONS[asset.type];
  return <IconComponent size={iconTokens.size.md} color={colorTokens.text.tertiary} />;
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
  assets,
}: {
  presentationFile?: PresentationFile;
  assets: AssetInfo[];
}) {
  if (!presentationFile) {
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
 * Displays embedded assets discovered via OPC relationships:
 * - Images (PNG, JPEG, etc.)
 * - Audio files
 * - Video files
 * - Other media
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function AssetPanel({ presentationFile }: AssetPanelProps) {
  const assets = useMemo(() => {
    if (!presentationFile) {
      return [];
    }
    const mediaPaths = discoverMediaPaths(presentationFile);
    return buildAssetInfo(presentationFile, mediaPaths);
  }, [presentationFile]);

  return (
    <div style={containerStyle}>
      <InspectorSection title="Assets">
        <AssetPanelContent presentationFile={presentationFile} assets={assets} />
      </InspectorSection>
    </div>
  );
}
