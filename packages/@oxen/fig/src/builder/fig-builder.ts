/**
 * @file Complete .fig file builder
 *
 * Builds .fig files from node definitions.
 * Outputs ZIP-wrapped format that Figma can open.
 */

import { deflateRaw } from "pako";
import type { KiwiSchema } from "../types";
import { ByteBuffer } from "../kiwi/byte-buffer";
import { StreamingFigEncoder } from "../kiwi/stream";
import { createTextSchema } from "./text-schema";
import type { TextNodeData, FrameNodeData, StackPadding } from "./text-builder";
import type { SymbolNodeData, InstanceNodeData } from "./symbol-builder";
import { buildFigHeader } from "./header";
import { createEmptyZipPackage } from "@oxen/zip";

// =============================================================================
// Types
// =============================================================================

export type NodeTypeMap = {
  DOCUMENT: 1;
  CANVAS: 2;
  FRAME: 3;
  TEXT: 13;
  SYMBOL: 15;
  INSTANCE: 16;
};

const NODE_TYPE_VALUES: NodeTypeMap = {
  DOCUMENT: 1,
  CANVAS: 2,
  FRAME: 3,
  TEXT: 13,
  SYMBOL: 15,
  INSTANCE: 16,
};

type BaseNode = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
};

// =============================================================================
// Schema Encoder (fig-kiwi format)
// =============================================================================

function writeNullString(buffer: ByteBuffer, value: string): void {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  for (const byte of bytes) {
    buffer.writeByte(byte);
  }
  buffer.writeByte(0);
}

function encodeFigSchema(schema: KiwiSchema): Uint8Array {
  const buffer = new ByteBuffer();

  buffer.writeVarUint(schema.definitions.length);

  for (const def of schema.definitions) {
    writeNullString(buffer, def.name);
    buffer.writeByte(def.kind === "ENUM" ? 0 : def.kind === "STRUCT" ? 1 : 2);
    buffer.writeVarUint(def.fields.length);

    for (const field of def.fields) {
      writeNullString(buffer, field.name);
      buffer.writeVarInt(field.typeId);
      buffer.writeByte(field.isArray ? 1 : 0);
      buffer.writeVarUint(field.value);
    }
  }

  return buffer.toUint8Array();
}

// =============================================================================
// Fig File Builder
// =============================================================================

export class FigFileBuilder {
  private schema: KiwiSchema;
  private nodes: Record<string, unknown>[];
  private nextLocalID: number;
  private sessionID: number;

  constructor() {
    this.schema = createTextSchema();
    this.nodes = [];
    this.nextLocalID = 0;
    this.sessionID = 1;
  }

  /**
   * Get the next available local ID
   */
  getNextID(): number {
    return this.nextLocalID++;
  }

  /**
   * Add a DOCUMENT node
   */
  addDocument(name: string = "Document"): number {
    const localID = this.getNextID();
    this.nodes.push(this.createNodeChange({
      localID,
      parentID: -1,
      type: NODE_TYPE_VALUES.DOCUMENT,
      name,
    }));
    return localID;
  }

  /**
   * Add a CANVAS (page) node
   */
  addCanvas(parentID: number, name: string = "Page 1"): number {
    const localID = this.getNextID();
    this.nodes.push(this.createNodeChange({
      localID,
      parentID,
      type: NODE_TYPE_VALUES.CANVAS,
      name,
    }));
    return localID;
  }

  /**
   * Add a FRAME node (with AutoLayout support)
   */
  addFrame(data: FrameNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.FRAME,
      name: data.name,
      size: data.size,
      transform: data.transform,
      fillPaints: data.fillPaints,
      visible: data.visible,
      opacity: data.opacity,
      clipsContent: data.clipsContent,
      cornerRadius: data.cornerRadius,
      // AutoLayout - frame level
      stackMode: data.stackMode,
      stackSpacing: data.stackSpacing,
      stackPadding: data.stackPadding,
      stackPrimaryAlignItems: data.stackPrimaryAlignItems,
      stackCounterAlignItems: data.stackCounterAlignItems,
      stackPrimaryAlignContent: data.stackPrimaryAlignContent,
      stackWrap: data.stackWrap,
      stackCounterSpacing: data.stackCounterSpacing,
      itemReverseZIndex: data.itemReverseZIndex,
      // AutoLayout - child level
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a SYMBOL node (component definition, with AutoLayout support)
   */
  addSymbol(data: SymbolNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.SYMBOL,
      name: data.name,
      size: data.size,
      transform: data.transform,
      fillPaints: data.fillPaints,
      visible: data.visible,
      opacity: data.opacity,
      clipsContent: data.clipsContent,
      cornerRadius: data.cornerRadius,
      // AutoLayout - frame level
      stackMode: data.stackMode,
      stackSpacing: data.stackSpacing,
      stackPadding: data.stackPadding,
      stackPrimaryAlignItems: data.stackPrimaryAlignItems,
      stackCounterAlignItems: data.stackCounterAlignItems,
      stackPrimaryAlignContent: data.stackPrimaryAlignContent,
      stackWrap: data.stackWrap,
      stackCounterSpacing: data.stackCounterSpacing,
      itemReverseZIndex: data.itemReverseZIndex,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add an INSTANCE node (component instance)
   */
  addInstance(data: InstanceNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.INSTANCE,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      // Symbol reference
      symbolID: data.symbolID,
      componentPropertyReferences: data.componentPropertyReferences,
      // Child constraints
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a TEXT node
   */
  addTextNode(data: TextNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.TEXT,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fontSize: data.fontSize,
      fontName: data.fontName,
      textAlignHorizontal: data.textAlignHorizontal,
      textAlignVertical: data.textAlignVertical,
      textAutoResize: data.textAutoResize,
      textDecoration: data.textDecoration,
      textCase: data.textCase,
      lineHeight: data.lineHeight,
      letterSpacing: data.letterSpacing,
      textData: {
        characters: data.characters,
        characterStyleIDs: new Array(data.characters.length).fill(0),
      },
      fillPaints: data.fillPaints,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Create a NodeChange record
   */
  private createNodeChange(data: {
    localID: number;
    parentID: number;
    type: number;
    name: string;
    size?: { x: number; y: number };
    transform?: {
      m00: number;
      m01: number;
      m02: number;
      m10: number;
      m11: number;
      m12: number;
    };
    visible?: boolean;
    opacity?: number;
    // Text fields
    fontSize?: number;
    fontName?: { family: string; style: string; postscript: string };
    textAlignHorizontal?: { value: number; name: string };
    textAlignVertical?: { value: number; name: string };
    textAutoResize?: { value: number; name: string };
    textDecoration?: { value: number; name: string };
    textCase?: { value: number; name: string };
    lineHeight?: { value: number; units: { value: number; name: string } };
    letterSpacing?: { value: number; units: { value: number; name: string } };
    textData?: { characters: string; characterStyleIDs: number[] };
    // Paint fields
    fillPaints?: readonly {
      type: { value: number; name: string };
      color?: { r: number; g: number; b: number; a: number };
      opacity: number;
      visible: boolean;
      blendMode: { value: number; name: string };
    }[];
    // Frame fields
    clipsContent?: boolean;
    cornerRadius?: number;
    // AutoLayout - frame level
    stackMode?: { value: number; name: string };
    stackSpacing?: number;
    stackPadding?: StackPadding;
    stackPrimaryAlignItems?: { value: number; name: string };
    stackCounterAlignItems?: { value: number; name: string };
    stackPrimaryAlignContent?: { value: number; name: string };
    stackWrap?: boolean;
    stackCounterSpacing?: number;
    itemReverseZIndex?: boolean;
    // AutoLayout - child level
    stackPositioning?: { value: number; name: string };
    stackPrimarySizing?: { value: number; name: string };
    stackCounterSizing?: { value: number; name: string };
    horizontalConstraint?: { value: number; name: string };
    verticalConstraint?: { value: number; name: string };
    // Symbol/Instance fields
    symbolID?: { sessionID: number; localID: number };
    componentPropertyReferences?: readonly string[];
  }): Record<string, unknown> {
    const typeName = this.getTypeName(data.type);

    const node: Record<string, unknown> = {
      guid: { sessionID: this.sessionID, localID: data.localID },
      phase: { value: 0, name: "CREATED" },
      type: { value: data.type, name: typeName },
      name: data.name,
      visible: data.visible ?? true,
      opacity: data.opacity ?? 1,
      blendMode: { value: 1, name: "NORMAL" },
    };

    // Parent index
    if (data.parentID >= 0) {
      node.parentIndex = {
        guid: { sessionID: this.sessionID, localID: data.parentID },
        position: this.generatePosition(),
      };
    }

    // Size and transform
    if (data.size) {
      node.size = data.size;
    }
    if (data.transform) {
      node.transform = data.transform;
    }

    // Fill paints
    if (data.fillPaints) {
      node.fillPaints = data.fillPaints;
    }

    // Frame-specific
    if (data.clipsContent !== undefined) {
      node.clipsContent = data.clipsContent;
    }
    if (data.cornerRadius !== undefined) {
      node.cornerRadius = data.cornerRadius;
    }

    // AutoLayout - frame level (for FRAME and SYMBOL)
    if (data.stackMode) {
      node.stackMode = data.stackMode;
    }
    if (data.stackSpacing !== undefined) {
      node.stackSpacing = data.stackSpacing;
    }
    if (data.stackPadding) {
      node.stackPadding = data.stackPadding;
    }
    if (data.stackPrimaryAlignItems) {
      node.stackPrimaryAlignItems = data.stackPrimaryAlignItems;
    }
    if (data.stackCounterAlignItems) {
      node.stackCounterAlignItems = data.stackCounterAlignItems;
    }
    if (data.stackPrimaryAlignContent) {
      node.stackPrimaryAlignContent = data.stackPrimaryAlignContent;
    }
    if (data.stackWrap !== undefined) {
      node.stackWrap = data.stackWrap;
    }
    if (data.stackCounterSpacing !== undefined) {
      node.stackCounterSpacing = data.stackCounterSpacing;
    }
    if (data.itemReverseZIndex !== undefined) {
      node.itemReverseZIndex = data.itemReverseZIndex;
    }

    // AutoLayout - child level (for any node inside auto-layout)
    if (data.stackPositioning) {
      node.stackPositioning = data.stackPositioning;
    }
    if (data.stackPrimarySizing) {
      node.stackPrimarySizing = data.stackPrimarySizing;
    }
    if (data.stackCounterSizing) {
      node.stackCounterSizing = data.stackCounterSizing;
    }
    if (data.horizontalConstraint) {
      node.horizontalConstraint = data.horizontalConstraint;
    }
    if (data.verticalConstraint) {
      node.verticalConstraint = data.verticalConstraint;
    }

    // Symbol/Instance fields
    if (data.symbolID) {
      node.symbolID = data.symbolID;
    }
    if (data.componentPropertyReferences && data.componentPropertyReferences.length > 0) {
      node.componentPropertyReferences = data.componentPropertyReferences;
    }

    // Text-specific fields
    if (data.type === NODE_TYPE_VALUES.TEXT) {
      if (data.fontSize !== undefined) {
        node.fontSize = data.fontSize;
      }
      if (data.fontName) {
        node.fontName = data.fontName;
      }
      if (data.textAlignHorizontal) {
        node.textAlignHorizontal = data.textAlignHorizontal;
      }
      if (data.textAlignVertical) {
        node.textAlignVertical = data.textAlignVertical;
      }
      if (data.textAutoResize) {
        node.textAutoResize = data.textAutoResize;
      }
      if (data.textDecoration) {
        node.textDecoration = data.textDecoration;
      }
      if (data.textCase) {
        node.textCase = data.textCase;
      }
      if (data.lineHeight) {
        node.lineHeight = data.lineHeight;
      }
      if (data.letterSpacing) {
        node.letterSpacing = data.letterSpacing;
      }
      if (data.textData) {
        node.textData = data.textData;
      }
    }

    return node;
  }

  private positionCounter = 0;

  private generatePosition(): string {
    // Figma uses a fractional index system
    // We'll use a simple incrementing character
    return String.fromCharCode(33 + (this.positionCounter++ % 93));
  }

  private getTypeName(type: number): string {
    const names: Record<number, string> = {
      1: "DOCUMENT",
      2: "CANVAS",
      3: "FRAME",
      13: "TEXT",
      15: "SYMBOL",
      16: "INSTANCE",
    };
    return names[type] ?? "UNKNOWN";
  }

  /**
   * Build the raw fig-kiwi data (without ZIP wrapping)
   * Use this for internal testing or when you need the raw format.
   */
  buildRaw(): Uint8Array {
    // Encode schema
    const schemaData = encodeFigSchema(this.schema);
    const compressedSchema = deflateRaw(schemaData);

    // Encode message using streaming encoder
    const encoder = new StreamingFigEncoder({ schema: this.schema });

    encoder.writeHeader({
      type: { value: 1 },
      sessionID: this.sessionID,
      ackID: 0,
    });

    for (const node of this.nodes) {
      encoder.writeNodeChange(node);
    }

    const messageData = encoder.finalize();
    const compressedMessage = deflateRaw(messageData);

    // Build data chunk with 4-byte LE size prefix
    const dataChunk = new Uint8Array(4 + compressedMessage.length);
    const dataView = new DataView(dataChunk.buffer);
    dataView.setUint32(0, compressedMessage.length, true);
    dataChunk.set(compressedMessage, 4);

    // Build header
    const header = buildFigHeader(compressedSchema.length, "0");

    // Combine all parts
    const totalSize = header.length + compressedSchema.length + dataChunk.length;
    const result = new Uint8Array(totalSize);
    result.set(header, 0);
    result.set(compressedSchema, header.length);
    result.set(dataChunk, header.length + compressedSchema.length);

    return result;
  }

  /**
   * Build the complete .fig file (ZIP-wrapped format)
   * This is the format that Figma can open directly.
   *
   * @deprecated Use buildAsync() instead for ZIP-wrapped format
   */
  build(): Uint8Array {
    // For backwards compatibility, return raw format
    // Users should use buildAsync() for ZIP-wrapped format
    return this.buildRaw();
  }

  /**
   * Build the complete .fig file as ZIP-wrapped format (async)
   * This is the format that Figma can open directly.
   *
   * @param options - Optional build options
   */
  async buildAsync(options?: {
    fileName?: string;
  }): Promise<Uint8Array> {
    const rawData = this.buildRaw();

    // Create ZIP package with canvas.fig inside
    const zip = createEmptyZipPackage();
    zip.writeBinary("canvas.fig", rawData);

    // Add meta.json (required by Figma)
    const meta = {
      client_meta: {
        background_color: { r: 0.96, g: 0.96, b: 0.96, a: 1 },
        thumbnail_size: { width: 400, height: 300 },
        render_coordinates: { x: 0, y: 0, width: 800, height: 600 },
      },
      file_name: options?.fileName ?? "Generated",
      developer_related_links: [],
      exported_at: new Date().toISOString(),
    };
    zip.writeText("meta.json", JSON.stringify(meta));

    // Add empty images directory marker (create a placeholder)
    // ZIP doesn't support empty directories directly, so we skip this

    // Generate ZIP as ArrayBuffer and convert to Uint8Array
    const buffer = await zip.toArrayBuffer({ compressionLevel: 6 });
    return new Uint8Array(buffer);
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createFigFile(): FigFileBuilder {
  return new FigFileBuilder();
}
