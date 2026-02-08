/**
 * @file Complete .fig file builder
 *
 * Builds .fig files from node definitions.
 * Outputs ZIP-wrapped format that Figma can open.
 */

import { deflateRaw } from "pako";
import { compressZstd } from "../../compression";
import type { KiwiSchema } from "../../types";
import { StreamingFigEncoder } from "../../kiwi/stream";
import figmaSchemaJson from "../figma-schema.json";
import type { TextNodeData } from "../text";
import type { FrameNodeData } from "../frame";
import type { StackPadding } from "../types";
import type { SymbolNodeData, InstanceNodeData } from "../symbol";
import type {
  EllipseNodeData,
  LineNodeData,
  StarNodeData,
  PolygonNodeData,
  VectorNodeData,
  RectangleNodeData,
  RoundedRectangleNodeData,
  Stroke,
  ArcData,
} from "../shape";
import type { EffectData } from "../effect/types";
import type { GroupNodeData } from "./group-builder";
import type { SectionNodeData } from "./section-builder";
import type { BooleanOperationNodeData } from "./boolean-builder";
import { SHAPE_NODE_TYPES, NODE_TYPE_VALUES } from "../../constants";
import { buildFigHeader } from "../header";
import { createEmptyZipPackage } from "@oxen/zip";
import { encodeFigSchema } from "./schema-encoder";
import {
  encodeRectangleBlob,
  encodeRoundedRectangleBlob,
  encodeEllipseBlob,
} from "../geometry";
import { resolveChildConstraints } from "../../symbols/resolve-child-constraints";
import { getEffectiveSymbolID } from "../../symbols/effective-symbol-id";

export class FigFileBuilder {
  private schema: KiwiSchema;
  private nodes: Record<string, unknown>[];
  private blobs: Array<{ bytes: number[] }>;
  private nextLocalID: number;
  private structuralSessionID: number;  // For DOCUMENT, CANVAS (always 0)
  private contentSessionID: number;     // For FRAME, shapes, etc. (always 1)
  private nodeSessionIDs: Map<number, number>;  // Track sessionID for each localID
  private childCountPerParent: Map<number, number>;  // Track child count per parent for position

  constructor() {
    // Use the actual Figma schema extracted from a working file
    this.schema = figmaSchemaJson as KiwiSchema;
    this.nodes = [];
    this.blobs = [];
    this.nextLocalID = 0;
    // Figma uses different sessionIDs for structural vs content nodes
    this.structuralSessionID = 0;  // DOCUMENT, CANVAS
    this.contentSessionID = 1;     // FRAME, shapes, text, etc.
    this.nodeSessionIDs = new Map();
    this.childCountPerParent = new Map();
  }

  /**
   * Add a blob and return its index
   */
  addBlob(blob: { bytes: number[] }): number {
    const index = this.blobs.length;
    this.blobs.push(blob);
    return index;
  }

  /**
   * Get the blobs array
   */
  getBlobs(): ReadonlyArray<{ bytes: number[] }> {
    return this.blobs;
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
    this.nodeSessionIDs.set(localID, this.structuralSessionID);
    const node = this.createStructuralNodeChange({
      localID,
      parentID: -1,
      type: NODE_TYPE_VALUES.DOCUMENT,
      name,
    });
    // Add required Document fields for Figma compatibility
    node.transform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
    node.strokeWeight = 0;
    node.strokeAlign = { value: 0, name: "CENTER" };
    node.strokeJoin = { value: 1, name: "BEVEL" };
    node.documentColorProfile = { value: 1, name: "SRGB" };
    this.nodes.push(node);
    return localID;
  }

  /**
   * Add a CANVAS (page) node
   */
  addCanvas(parentID: number, name: string = "Page 1"): number {
    const localID = this.getNextID();
    this.nodeSessionIDs.set(localID, this.structuralSessionID);
    const node = this.createStructuralNodeChange({
      localID,
      parentID,
      type: NODE_TYPE_VALUES.CANVAS,
      name,
    });
    // Add Canvas-specific fields for Figma compatibility
    node.transform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
    node.backgroundOpacity = 1;
    node.strokeWeight = 0;
    node.strokeAlign = { value: 0, name: "CENTER" };
    node.strokeJoin = { value: 1, name: "BEVEL" };
    node.backgroundColor = { r: 0.9607843160629272, g: 0.9607843160629272, b: 0.9607843160629272, a: 1 };
    node.backgroundEnabled = true;
    this.nodes.push(node);
    return localID;
  }

  /**
   * Add an Internal Only Canvas (required for Figma compatibility)
   * This is a hidden canvas that Figma uses internally.
   */
  addInternalCanvas(parentID: number): number {
    const localID = this.getNextID();
    this.nodeSessionIDs.set(localID, this.structuralSessionID);
    const node: Record<string, unknown> = {
      guid: { sessionID: this.structuralSessionID, localID },
      phase: { value: 0, name: "CREATED" },
      parentIndex: {
        guid: { sessionID: this.structuralSessionID, localID: parentID },
        position: "~", // Fixed position at end
      },
      type: { value: NODE_TYPE_VALUES.CANVAS, name: "CANVAS" },
      name: "Internal Only Canvas",
      visible: false,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      strokeWeight: 0,
      strokeAlign: { value: 0, name: "CENTER" },
      strokeJoin: { value: 1, name: "BEVEL" },
      internalOnly: true,
    };
    this.nodes.push(node);
    return localID;
  }

  /**
   * Add a FRAME node (with AutoLayout support)
   */
  addFrame(data: FrameNodeData): number {
    // Content nodes reuse localID from data (user provides it)
    // Register the node's sessionID
    this.nodeSessionIDs.set(data.localID, this.contentSessionID);

    // Generate fill geometry blob for the frame
    const blobBytes = encodeRectangleBlob(data.size?.x ?? 100, data.size?.y ?? 100);
    const blobIndex = this.addBlob({ bytes: blobBytes });

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
    // Add required FRAME fields for Figma compatibility
    node.strokeWeight = 1;
    node.strokeAlign = { value: 1, name: "INSIDE" };
    node.strokeJoin = { value: 0, name: "MITER" };
    node.frameMaskDisabled = false;
    // Add fill geometry (required for rendering)
    node.fillGeometry = [{
      windingRule: { value: 0, name: "NONZERO" },
      commandsBlob: blobIndex,
      styleID: 0,
    }];
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
      overriddenSymbolID: data.overriddenSymbolID,
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

  // ===========================================================================
  // Container Nodes
  // ===========================================================================

  /**
   * Add a GROUP node
   */
  addGroup(data: GroupNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.GROUP,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a SECTION node
   *
   * Sections require FRAME-like fields: strokeWeight, strokeAlign, strokeJoin,
   * fillPaints, strokePaints, fillGeometry, cornerRadius, frameMaskDisabled.
   * Without these, Figma import fails with "Internal error during import".
   */
  addSection(data: SectionNodeData): number {
    // Section needs a fill geometry blob (like FRAME)
    const w = data.size.x;
    const h = data.size.y;
    const blobBytes = encodeRoundedRectangleBlob(w, h, 2);
    const blobIndex = this.addBlob({ bytes: blobBytes });

    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.SECTION,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: [{
        type: { value: 0, name: "SOLID" },
        color: { r: 1, g: 1, b: 1, a: 1 },
        opacity: 1,
        visible: true,
        blendMode: { value: 1, name: "NORMAL" },
      }],
    });

    // Section requires FRAME-like fields
    node.strokeWeight = 1;
    node.strokeAlign = { value: 1, name: "INSIDE" };
    node.strokeJoin = { value: 0, name: "MITER" };
    node.cornerRadius = 2;
    node.frameMaskDisabled = true;
    node.stackPrimarySizing = { value: 0, name: "FIXED" };
    node.strokePaints = [{
      type: { value: 0, name: "SOLID" },
      color: { r: 0, g: 0, b: 0, a: 1 },
      opacity: 0.1,
      visible: true,
      blendMode: { value: 1, name: "NORMAL" },
    }];
    node.fillGeometry = [{
      windingRule: { value: 0, name: "NONZERO" },
      commandsBlob: blobIndex,
      styleID: 0,
    }];

    // Section-specific field
    if (data.sectionContentsHidden) {
      node.sectionContentsHidden = data.sectionContentsHidden;
    }
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a BOOLEAN_OPERATION node
   */
  addBooleanOperation(data: BooleanOperationNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: NODE_TYPE_VALUES.BOOLEAN_OPERATION,
      name: data.name,
      size: data.size,
      transform: data.transform,
      fillPaints: data.fillPaints,
      visible: data.visible,
      opacity: data.opacity,
    });
    // Add boolean operation specific field
    (node as Record<string, unknown>).booleanOperation = data.booleanOperation;
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
    if (data.derivedTextData) {
      (node as Record<string, unknown>).derivedTextData = data.derivedTextData;
    }
    this.nodes.push(node);
    return data.localID;
  }

  // ===========================================================================
  // Shape Nodes
  // ===========================================================================

  /**
   * Add an ELLIPSE node
   */
  addEllipse(data: EllipseNodeData): number {
    // Generate fill geometry blob
    const width = data.size?.x ?? 100;
    const height = data.size?.y ?? 100;
    const blobBytes = encodeEllipseBlob(width, height);
    const blobIndex = this.addBlob({ bytes: blobBytes });

    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.ELLIPSE,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      arcData: data.arcData,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    // Add fill geometry (required for rendering)
    node.fillGeometry = [{
      windingRule: { value: 0, name: "NONZERO" },
      commandsBlob: blobIndex,
      styleID: 0,
    }];
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a LINE node
   */
  addLine(data: LineNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.LINE,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a STAR node
   */
  addStar(data: StarNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.STAR,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      pointCount: data.pointCount,
      starInnerRadius: data.starInnerRadius,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a REGULAR_POLYGON node
   */
  addPolygon(data: PolygonNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.REGULAR_POLYGON,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      pointCount: data.pointCount,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a VECTOR node
   */
  addVector(data: VectorNodeData): number {
    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.VECTOR,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      vectorData: data.vectorData,
      handleMirroring: data.handleMirroring,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a RECTANGLE node (basic rectangle without corner radius)
   */
  addRectangle(data: RectangleNodeData): number {
    // Generate fill geometry blob
    const width = data.size?.x ?? 100;
    const height = data.size?.y ?? 100;
    const blobBytes = encodeRectangleBlob(width, height);
    const blobIndex = this.addBlob({ bytes: blobBytes });

    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.RECTANGLE,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    // Add fill geometry (required for rendering)
    node.fillGeometry = [{
      windingRule: { value: 0, name: "NONZERO" },
      commandsBlob: blobIndex,
      styleID: 0,
    }];
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Add a ROUNDED_RECTANGLE node
   */
  addRoundedRectangle(data: RoundedRectangleNodeData): number {
    // Generate fill geometry blob
    const width = data.size?.x ?? 100;
    const height = data.size?.y ?? 100;
    const radius = data.cornerRadius ?? 0;
    const blobBytes = encodeRoundedRectangleBlob(width, height, radius);
    const blobIndex = this.addBlob({ bytes: blobBytes });

    const node = this.createNodeChange({
      localID: data.localID,
      parentID: data.parentID,
      type: SHAPE_NODE_TYPES.ROUNDED_RECTANGLE,
      name: data.name,
      size: data.size,
      transform: data.transform,
      visible: data.visible,
      opacity: data.opacity,
      fillPaints: data.fillPaints,
      strokePaints: data.strokePaints,
      strokeWeight: data.strokeWeight,
      strokeCap: data.strokeCap,
      strokeJoin: data.strokeJoin,
      strokeAlign: data.strokeAlign,
      dashPattern: data.dashPattern,
      cornerRadius: data.cornerRadius,
      rectangleCornerRadii: data.rectangleCornerRadii,
      stackPositioning: data.stackPositioning,
      stackPrimarySizing: data.stackPrimarySizing,
      stackCounterSizing: data.stackCounterSizing,
      horizontalConstraint: data.horizontalConstraint,
      verticalConstraint: data.verticalConstraint,
      effects: data.effects,
    });
    // Add fill geometry (required for rendering)
    node.fillGeometry = [{
      windingRule: { value: 0, name: "NONZERO" },
      commandsBlob: blobIndex,
      styleID: 0,
    }];
    this.nodes.push(node);
    return data.localID;
  }

  /**
   * Create a NodeChange record for structural nodes (DOCUMENT, CANVAS)
   * These use structuralSessionID (0) for both guid and parentIndex
   */
  private createStructuralNodeChange(data: {
    localID: number;
    parentID: number;
    type: number;
    name: string;
  }): Record<string, unknown> {
    const typeName = this.getTypeName(data.type);

    const node: Record<string, unknown> = {
      guid: { sessionID: this.structuralSessionID, localID: data.localID },
      phase: { value: 0, name: "CREATED" },
      type: { value: data.type, name: typeName },
      name: data.name,
      visible: true,
      opacity: 1,
    };

    // Parent index (also uses structuralSessionID)
    if (data.parentID >= 0) {
      node.parentIndex = {
        guid: { sessionID: this.structuralSessionID, localID: data.parentID },
        position: this.generatePosition(data.parentID),
      };
    }

    return node;
  }

  /**
   * Create a NodeChange record for content nodes (FRAME, shapes, text, etc.)
   * These use contentSessionID (1) for guid, structuralSessionID (0) for parent reference
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
    overriddenSymbolID?: { sessionID: number; localID: number };
    componentPropertyReferences?: readonly string[];
    // Shape stroke fields
    strokePaints?: readonly Stroke[];
    strokeWeight?: number;
    strokeCap?: { value: number; name: string };
    strokeJoin?: { value: number; name: string };
    strokeAlign?: { value: number; name: string };
    dashPattern?: readonly number[];
    // Ellipse fields
    arcData?: ArcData;
    // Star/Polygon fields
    pointCount?: number;
    starInnerRadius?: number;
    // Vector fields
    vectorData?: {
      readonly vectorNetworkBlob?: number;
      readonly normalizedSize?: { x: number; y: number };
    };
    handleMirroring?: { value: number; name: string };
    // Rectangle fields
    rectangleCornerRadii?: readonly [number, number, number, number];
    // Effects
    effects?: readonly EffectData[];
  }): Record<string, unknown> {
    const typeName = this.getTypeName(data.type);

    // Register this content node with contentSessionID
    this.nodeSessionIDs.set(data.localID, this.contentSessionID);

    // Content nodes use contentSessionID (1) for their own guid
    const node: Record<string, unknown> = {
      guid: { sessionID: this.contentSessionID, localID: data.localID },
      phase: { value: 0, name: "CREATED" },
      type: { value: data.type, name: typeName },
      name: data.name,
      visible: data.visible ?? true,
      opacity: data.opacity ?? 1,
    };

    // Parent index - look up the parent's actual sessionID
    if (data.parentID >= 0) {
      const parentSessionID = this.nodeSessionIDs.get(data.parentID) ?? this.structuralSessionID;
      node.parentIndex = {
        guid: { sessionID: parentSessionID, localID: data.parentID },
        position: this.generatePosition(data.parentID),
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

    // Frame-specific — Kiwi schema uses frameMaskDisabled (inverted clipsContent)
    if (data.clipsContent !== undefined) {
      node.frameMaskDisabled = !data.clipsContent;
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

    // Symbol/Instance fields — symbolID must be wrapped in symbolData
    // (NodeChange schema has symbolData: SymbolData, not a direct symbolID field)
    if (data.symbolID) {
      const symbolDataObj: Record<string, unknown> = { symbolID: data.symbolID };
      if (data.overriddenSymbolID) {
        symbolDataObj.overriddenSymbolID = data.overriddenSymbolID;
      }
      node.symbolData = symbolDataObj;
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

    // Shape stroke fields (for all shape types)
    if (data.strokePaints) {
      node.strokePaints = data.strokePaints;
    }
    if (data.strokeWeight !== undefined) {
      node.strokeWeight = data.strokeWeight;
    }
    if (data.strokeCap) {
      node.strokeCap = data.strokeCap;
    }
    if (data.strokeJoin) {
      node.strokeJoin = data.strokeJoin;
    }
    if (data.strokeAlign) {
      node.strokeAlign = data.strokeAlign;
    }
    if (data.dashPattern) {
      node.dashPattern = data.dashPattern;
    }

    // Ellipse-specific fields
    if (data.arcData) {
      node.arcData = data.arcData;
    }

    // Star/Polygon-specific fields
    if (data.pointCount !== undefined) {
      node.pointCount = data.pointCount;
    }
    if (data.starInnerRadius !== undefined) {
      node.starInnerRadius = data.starInnerRadius;
    }

    // Vector-specific fields
    if (data.vectorData) {
      node.vectorData = data.vectorData;
    }
    if (data.handleMirroring) {
      node.handleMirroring = data.handleMirroring;
    }

    // Rectangle-specific fields
    if (data.rectangleCornerRadii) {
      node.rectangleCornerRadii = data.rectangleCornerRadii;
    }

    // Effects (drop shadow, inner shadow, blur, etc.)
    if (data.effects && data.effects.length > 0) {
      node.effects = data.effects;
    }

    return node;
  }

  private generatePosition(parentID: number): string {
    // Figma uses a fractional index system per parent
    // "!" for first child, then ASCII incrementing ("\"", "#", "$", etc.)
    const count = this.childCountPerParent.get(parentID) ?? 0;
    this.childCountPerParent.set(parentID, count + 1);
    const base = 33; // ASCII '!'
    return String.fromCharCode(base + (count % 93));
  }

  private getTypeName(type: number): string {
    // Reverse lookup from NODE_TYPE_VALUES
    for (const [name, value] of Object.entries(NODE_TYPE_VALUES)) {
      if (value === type) {
        return name;
      }
    }
    return "UNKNOWN";
  }

  /**
   * Compute derivedSymbolData for INSTANCE nodes whose size differs from their SYMBOL.
   * This pre-computes constraint-resolved child positions so both Figma and our renderer
   * can correctly render resized instances.
   *
   * Recursively handles nested instances: when a child INSTANCE is resized by constraints,
   * its referenced symbol's children are also resolved, emitting multi-level guidPath entries.
   *
   * Called automatically by buildRaw/buildRawAsync before serialization.
   */
  private computeDerivedSymbolData(): void {
    // Index: localID → node
    const nodeByLocalID = new Map<number, Record<string, unknown>>();
    for (const node of this.nodes) {
      const guid = node.guid as { sessionID: number; localID: number } | undefined;
      if (guid) {
        nodeByLocalID.set(guid.localID, node);
      }
    }

    // Index: parentLocalID → child nodes
    const childrenByParent = new Map<number, Record<string, unknown>[]>();
    for (const node of this.nodes) {
      const pi = node.parentIndex as { guid: { localID: number } } | undefined;
      if (pi) {
        const parentID = pi.guid.localID;
        let list = childrenByParent.get(parentID);
        if (!list) {
          list = [];
          childrenByParent.set(parentID, list);
        }
        list.push(node);
      }
    }

    for (const node of this.nodes) {
      const nodeType = node.type as { value: number } | undefined;
      if (nodeType?.value !== NODE_TYPE_VALUES.INSTANCE) continue;

      const effectiveID = getEffectiveSymbolID(node);
      if (!effectiveID) continue;

      const symNode = nodeByLocalID.get(effectiveID.localID);
      if (!symNode) continue;

      const instSize = node.size as { x: number; y: number } | undefined;
      const symSize = symNode.size as { x: number; y: number } | undefined;
      if (!instSize || !symSize) continue;
      if (instSize.x === symSize.x && instSize.y === symSize.y) continue;

      const derived: Record<string, unknown>[] = [];
      this.computeDerivedRecursive(
        effectiveID.localID, symSize, instSize,
        [], derived, nodeByLocalID, childrenByParent, 0,
      );

      if (derived.length > 0) {
        node.derivedSymbolData = derived;
      }
    }
  }

  /**
   * Recursively compute constraint-resolved entries for a symbol's children.
   * When a child INSTANCE is resized, recurse into its referenced symbol to
   * generate multi-level guidPath entries.
   */
  private computeDerivedRecursive(
    symbolLocalID: number,
    symSize: { x: number; y: number },
    instSize: { x: number; y: number },
    guidPrefix: { sessionID: number; localID: number }[],
    derived: Record<string, unknown>[],
    nodeByLocalID: Map<number, Record<string, unknown>>,
    childrenByParent: Map<number, Record<string, unknown>[]>,
    depth: number,
  ): void {
    if (depth > 8) return; // prevent infinite recursion

    const symChildren = childrenByParent.get(symbolLocalID) ?? [];

    for (const child of symChildren) {
      const childGuid = child.guid as { sessionID: number; localID: number } | undefined;
      if (!childGuid) continue;

      const resolution = resolveChildConstraints(child, symSize, instSize);
      if (!resolution) continue;

      if (resolution.posChanged || resolution.sizeChanged) {
        const childTransform = child.transform as { m00: number; m01: number; m02: number; m10: number; m11: number; m12: number };
        derived.push({
          guidPath: { guids: [...guidPrefix, childGuid] },
          transform: {
            m00: childTransform.m00,
            m01: childTransform.m01,
            m02: resolution.posX,
            m10: childTransform.m10,
            m11: childTransform.m11,
            m12: resolution.posY,
          },
          size: { x: resolution.dimX, y: resolution.dimY },
        });
      }

      // If this child is an INSTANCE that got resized, recurse into its symbol
      const childType = child.type as { value: number } | undefined;
      if (childType?.value === NODE_TYPE_VALUES.INSTANCE && resolution.sizeChanged) {
        const childSymID = getEffectiveSymbolID(child);
        if (childSymID) {
          const childSymNode = nodeByLocalID.get(childSymID.localID);
          if (childSymNode) {
            const childSymSize = childSymNode.size as { x: number; y: number } | undefined;
            if (childSymSize) {
              this.computeDerivedRecursive(
                childSymID.localID,
                childSymSize,
                { x: resolution.dimX, y: resolution.dimY },
                [...guidPrefix, childGuid],
                derived, nodeByLocalID, childrenByParent,
                depth + 1,
              );
            }
          }
        }
      }
    }
  }

  /**
   * Build the raw fig-kiwi data (without ZIP wrapping)
   * Use this for internal testing or when you need the raw format.
   * Note: This uses deflate-raw compression. For Figma compatibility,
   * use buildRawAsync() which uses zstd compression.
   */
  buildRaw(): Uint8Array {
    this.computeDerivedSymbolData();
    // Encode schema
    const schemaData = encodeFigSchema(this.schema);
    const compressedSchema = deflateRaw(schemaData);

    // Encode message using streaming encoder
    const encoder = new StreamingFigEncoder({ schema: this.schema });

    encoder.writeHeader({
      type: { value: 1 },
      sessionID: this.structuralSessionID,
      ackID: 0,
      blobs: this.blobs,
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
    const header = buildFigHeader(compressedSchema.length, "e");

    // Combine all parts
    const totalSize = header.length + compressedSchema.length + dataChunk.length;
    const result = new Uint8Array(totalSize);
    result.set(header, 0);
    result.set(compressedSchema, header.length);
    result.set(dataChunk, header.length + compressedSchema.length);

    return result;
  }

  /**
   * Build the raw fig-kiwi data with zstd compression (async).
   * This is the format that Figma expects.
   */
  async buildRawAsync(): Promise<Uint8Array> {
    this.computeDerivedSymbolData();

    // Encode schema
    const schemaData = encodeFigSchema(this.schema);
    const compressedSchema = deflateRaw(schemaData);

    // Encode message using streaming encoder
    const encoder = new StreamingFigEncoder({ schema: this.schema });

    encoder.writeHeader({
      type: { value: 1 },
      sessionID: this.structuralSessionID,
      ackID: 0,
      blobs: this.blobs,
    });

    for (const node of this.nodes) {
      encoder.writeNodeChange(node);
    }

    const messageData = encoder.finalize();
    // Use zstd compression for message data (Figma's expected format)
    const compressedMessage = await compressZstd(messageData, 3);

    // Build data chunk with 4-byte LE size prefix
    const dataChunk = new Uint8Array(4 + compressedMessage.length);
    const dataView = new DataView(dataChunk.buffer);
    dataView.setUint32(0, compressedMessage.length, true);
    dataChunk.set(compressedMessage, 4);

    // Build header
    const header = buildFigHeader(compressedSchema.length, "e");

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
   * @param options.fileName - File name for meta.json
   */
  async buildAsync(options?: {
    fileName?: string;
  }): Promise<Uint8Array> {
    const rawData = await this.buildRawAsync();

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

    // Always add thumbnail (required by Figma for import)
    const thumbnail = generatePlaceholderThumbnail();
    zip.writeBinary("thumbnail.png", thumbnail);

    // Generate ZIP as ArrayBuffer and convert to Uint8Array
    const buffer = await zip.toArrayBuffer({ compressionLevel: 6 });
    return new Uint8Array(buffer);
  }
}

/**
 * Generate a minimal placeholder thumbnail PNG (1x1 gray pixel)
 * This is a valid PNG file that Figma accepts.
 */
function generatePlaceholderThumbnail(): Uint8Array {
  // Minimal 1x1 gray PNG (pre-computed bytes)
  // PNG header + IHDR + IDAT + IEND
  // Color: #F5F5F5 (light gray, matches default canvas background)
  return new Uint8Array([
    // PNG signature
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    // IHDR chunk (1x1, 8-bit RGB)
    0x00, 0x00, 0x00, 0x0d, // length
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, // bit depth: 8, color type: RGB
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x90, 0x77, 0x53, 0xde, // CRC
    // IDAT chunk (compressed pixel data: #F5F5F5)
    0x00, 0x00, 0x00, 0x0c, // length
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    0x08, 0xd7, 0x63, 0x78, 0xf6, 0xf6, 0x06, 0x00, 0x02, 0x3b, 0x01, 0x1e,
    0xd6, 0xcc, 0x05, 0x0e, // CRC
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82, // CRC
  ]);
}

/**
 * Create a new FigFileBuilder instance
 */
export function createFigFile(): FigFileBuilder {
  return new FigFileBuilder();
}
