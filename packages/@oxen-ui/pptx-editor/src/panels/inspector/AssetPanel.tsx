/**
 * @file Asset panel component
 *
 * Displays a list of embedded assets in the presentation.
 * Uses OPC relationships to discover media files (ECMA-376 compliant).
 * Supports uploading new assets via file picker or drag-and-drop.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import { useMemo, useState, useRef, useCallback, type CSSProperties } from "react";
import type { PresentationFile } from "@oxen-office/pptx/domain";
import { discoverMediaPaths } from "@oxen-office/pptx/app/media-discovery";
import { toDataUrl, formatSize } from "@oxen/buffer";
import { getMimeTypeFromPath } from "@oxen/files";
import { InspectorSection, Accordion } from "@oxen-ui/ui-components/layout";
import { ImageIcon, AudioIcon, VideoIcon, FileIcon, AddIcon } from "@oxen-ui/ui-components/icons";
import { colorTokens, fontTokens, spacingTokens, iconTokens } from "@oxen-ui/ui-components/design-tokens";
import { Button } from "@oxen-ui/ui-components/primitives/Button";

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
  cursor: "grab",
};

/** Data transfer type for asset drag operations */
export const ASSET_DRAG_TYPE = "application/x-pptx-asset";

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

const uploadAreaStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.md,
  marginBottom: spacingTokens.md,
  border: `2px dashed ${colorTokens.border.primary}`,
  borderRadius: "8px",
  backgroundColor: colorTokens.background.secondary,
  textAlign: "center",
  transition: "border-color 0.2s, background-color 0.2s",
};

const uploadAreaDragOverStyle: CSSProperties = {
  ...uploadAreaStyle,
  borderColor: colorTokens.accent.primary,
  backgroundColor: colorTokens.background.tertiary,
};

const uploadHintStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
};

const uploadButtonRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: spacingTokens.sm,
};

const hiddenInputStyle: CSSProperties = {
  display: "none",
};

/**
 * Accepted file types for upload.
 * These correspond to MediaType in media-manager.ts and OleType in ole-manager.ts:
 * - image/png, image/jpeg, image/gif, image/svg+xml
 * - video/mp4
 * - audio/mpeg (mp3)
 * - Office documents (xlsx, docx, pptx) as OLE objects
 */
const ACCEPTED_FILE_TYPES = ".png,.jpg,.jpeg,.gif,.svg,.mp4,.mp3,.xlsx,.docx,.pptx";

/** Generate unique ID for uploaded assets */
// eslint-disable-next-line no-restricted-syntax
let uploadedAssetCounter = 0;
function generateUploadedAssetId(): string {
  uploadedAssetCounter += 1;
  return `uploaded-${uploadedAssetCounter}`;
}

/** Asset information discovered from PPTX package */
export type AssetInfo = {
  path: string;
  name: string;
  type: "image" | "audio" | "video" | "ole" | "other";
  extension: string;
  size?: number;
  dataUrl?: string;
  /** Raw binary data for OLE objects (used during drag-drop) */
  embedData?: ArrayBuffer;
};

/**
 * Get asset type from file path.
 */
function getAssetType(path: string): AssetInfo["type"] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const imageExts = ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "tif", "wmf", "emf", "svg"];
  const audioExts = ["mp3", "wav", "m4a", "wma", "aac"];
  const videoExts = ["mp4", "avi", "wmv", "mov", "webm"];
  const oleExts = ["xlsx", "docx", "pptx"];

  if (imageExts.includes(ext)) {
    return "image";
  }
  if (audioExts.includes(ext)) {
    return "audio";
  }
  if (videoExts.includes(ext)) {
    return "video";
  }
  if (oleExts.includes(ext)) {
    return "ole";
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
  ole: FileIcon,
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
 * Check if an asset type supports drag-and-drop to canvas.
 * Images and OLE objects can be dropped onto the canvas.
 */
function isAssetDraggable(asset: AssetInfo): boolean {
  if (asset.type === "image" && asset.dataUrl !== undefined) {
    return true;
  }
  if (asset.type === "ole" && asset.embedData !== undefined) {
    return true;
  }
  return false;
}

/**
 * Convert ArrayBuffer to base64 string for JSON serialization.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

/**
 * Handle drag start for asset items.
 */
function handleAssetDragStart(e: React.DragEvent<HTMLDivElement>, asset: AssetInfo): void {
  if (!isAssetDraggable(asset)) {
    e.preventDefault();
    return;
  }
  // Set drag data as JSON
  const dragData: Record<string, unknown> = {
    path: asset.path,
    name: asset.name,
    type: asset.type,
  };

  if (asset.type === "image" && asset.dataUrl) {
    dragData.dataUrl = asset.dataUrl;
  }

  if (asset.type === "ole" && asset.embedData) {
    // Encode ArrayBuffer as base64 for JSON serialization
    dragData.embedDataBase64 = arrayBufferToBase64(asset.embedData);
    dragData.extension = asset.extension;
  }

  e.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(dragData));
  e.dataTransfer.effectAllowed = "copy";
}

/**
 * Render a single asset item.
 */
function AssetItem({ asset }: { asset: AssetInfo }) {
  const draggable = isAssetDraggable(asset);
  const itemStyle = draggable ? assetItemStyle : { ...assetItemStyle, cursor: "default", opacity: 0.7 };

  return (
    <div
      style={itemStyle}
      title={draggable ? `${asset.path} (drag to canvas)` : `${asset.path} (not supported for drag)`}
      draggable={draggable}
      onDragStart={(e) => handleAssetDragStart(e, asset)}
    >
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
      <AssetList assets={assets} type="ole" title="Documents" />
      <AssetList assets={assets} type="other" title="Other" />
    </>
  );
}

/**
 * Read a File as dataURL.
 */
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * PPTX-supported MIME types mapped to asset types.
 * Based on MediaType in media-manager.ts and OleType in ole-manager.ts
 */
const SUPPORTED_MIME_TYPES: Record<string, AssetInfo["type"]> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/svg+xml": "image",
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "ole",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "ole",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ole",
};

/**
 * Check if a MIME type is supported by PPTX.
 */
function isSupportedMimeType(mimeType: string): boolean {
  return mimeType in SUPPORTED_MIME_TYPES;
}

/**
 * Read a File as ArrayBuffer.
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert File to AssetInfo.
 * Only accepts files with MIME types supported by PPTX.
 */
async function fileToAssetInfo(file: File): Promise<AssetInfo | null> {
  if (!isSupportedMimeType(file.type)) {
    return null;
  }

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const assetType = SUPPORTED_MIME_TYPES[file.type];

    // For OLE files, read as ArrayBuffer
    if (assetType === "ole") {
      const embedData = await readFileAsArrayBuffer(file);
      return {
        path: `uploaded/${generateUploadedAssetId()}/${file.name}`,
        name: file.name,
        type: assetType,
        extension,
        size: file.size,
        embedData,
      };
    }

    // For media files, read as dataUrl
    const dataUrl = await readFileAsDataUrl(file);

    return {
      path: `uploaded/${generateUploadedAssetId()}/${file.name}`,
      name: file.name,
      type: assetType,
      extension,
      size: file.size,
      // dataUrl is used for image preview and canvas drop
      dataUrl: assetType === "image" ? dataUrl : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Upload area component for adding new assets.
 */
function UploadArea({ onUpload }: { onUpload: (assets: AssetInfo[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {return;}

      const assetPromises = Array.from(files).map(fileToAssetInfo);
      const results = await Promise.all(assetPromises);
      const validAssets = results.filter((a): a is AssetInfo => a !== null);

      if (validAssets.length > 0) {
        onUpload(validAssets);
      }
    },
    [onUpload],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input to allow selecting the same file again
      e.target.value = "";
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      style={isDragOver ? uploadAreaDragOverStyle : uploadAreaStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        onChange={handleFileInputChange}
        style={hiddenInputStyle}
      />
      <div style={uploadButtonRowStyle}>
        <Button variant="secondary" size="sm" onClick={handleButtonClick}>
          <AddIcon size={14} />
          <span style={{ marginLeft: "4px" }}>Add Media</span>
        </Button>
      </div>
      <div style={uploadHintStyle}>or drop files here (PNG, JPEG, GIF, SVG, MP4, MP3, XLSX, DOCX, PPTX)</div>
    </div>
  );
}

/**
 * Render panel content based on state.
 */
function AssetPanelContent({
  presentationFile,
  embeddedAssets,
  uploadedAssets,
  onUpload,
}: {
  presentationFile?: PresentationFile;
  embeddedAssets: AssetInfo[];
  uploadedAssets: AssetInfo[];
  onUpload: (assets: AssetInfo[]) => void;
}) {
  const allAssets = [...uploadedAssets, ...embeddedAssets];
  const hasAssets = allAssets.length > 0;

  return (
    <>
      <UploadArea onUpload={onUpload} />
      {!presentationFile && uploadedAssets.length === 0 && (
        <div style={emptyStateStyle}>No presentation file loaded</div>
      )}
      {presentationFile && !hasAssets && (
        <div style={emptyStateStyle}>No assets found</div>
      )}
      {hasAssets && <AssetLists assets={allAssets} />}
    </>
  );
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
 * Also supports uploading new image assets via file picker or drag-and-drop.
 * Uploaded assets are stored locally and can be dragged to the canvas.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function AssetPanel({ presentationFile }: AssetPanelProps) {
  const [uploadedAssets, setUploadedAssets] = useState<AssetInfo[]>([]);

  const embeddedAssets = useMemo(() => {
    if (!presentationFile) {
      return [];
    }
    const mediaPaths = discoverMediaPaths(presentationFile);
    return buildAssetInfo(presentationFile, mediaPaths);
  }, [presentationFile]);

  const handleUpload = useCallback((newAssets: AssetInfo[]) => {
    setUploadedAssets((prev) => [...newAssets, ...prev]);
  }, []);

  return (
    <div style={containerStyle}>
      <InspectorSection title="Assets">
        <AssetPanelContent
          presentationFile={presentationFile}
          embeddedAssets={embeddedAssets}
          uploadedAssets={uploadedAssets}
          onUpload={handleUpload}
        />
      </InspectorSection>
    </div>
  );
}
