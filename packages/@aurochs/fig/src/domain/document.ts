/**
 * @file High-level fig design document model
 *
 * Provides a structured, immutable view of a .fig file that is suitable
 * for editor state management and CRUD operations.
 *
 * The key differences from the raw FigNode tree:
 * - Branded IDs (FigNodeId, FigPageId) instead of raw FigGuid
 * - Typed properties instead of open index signature
 * - _raw field preserves unknown Kiwi fields for roundtrip fidelity
 *
 * These are domain types consumed by renderer, builder, and editor.
 */

import type {
  FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, FigStrokeWeight, FigFontName, KiwiEnumValue,
  FigDerivedBaseline, FigDerivedGlyph, FigDerivedDecoration, FigDerivedTextData,
  FigVectorPath, FigVectorData, FigStyleId, FigFillGeometry,
} from "../types";
import type { LoadedFigFile, FigImage, FigMetadata } from "../roundtrip";
import type { FigNodeId, FigPageId } from "./node-id";
import { guidToNodeId } from "./node-id";

// =============================================================================
// AutoLayout Types
// =============================================================================

/**
 * AutoLayout (Flex-like layout) properties for frame/symbol nodes.
 *
 * These map directly to Figma's auto-layout properties.
 * Enum values stored as KiwiEnumValue for binary compatibility.
 */
export type AutoLayoutProps = {
  readonly stackMode: KiwiEnumValue;
  readonly stackSpacing?: number;
  readonly stackPadding?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly stackPrimaryAlignItems?: KiwiEnumValue;
  readonly stackCounterAlignItems?: KiwiEnumValue;
  readonly stackPrimaryAlignContent?: KiwiEnumValue;
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;
};

/**
 * Constraint properties for a child node within an AutoLayout parent.
 */
export type LayoutConstraints = {
  readonly stackPositioning?: KiwiEnumValue;
  readonly stackPrimarySizing?: KiwiEnumValue;
  readonly stackCounterSizing?: KiwiEnumValue;
  readonly horizontalConstraint?: KiwiEnumValue;
  readonly verticalConstraint?: KiwiEnumValue;
  /** AutoLayout child cross-axis alignment override (STRETCH, etc.) */
  readonly stackChildAlignSelf?: KiwiEnumValue;
  /** AutoLayout child primary-axis grow factor (0 = fixed, 1 = fill) */
  readonly stackChildPrimaryGrow?: number;
};

// =============================================================================
// Text Data Types
// =============================================================================

/**
 * Text-specific data extracted from TEXT nodes.
 */
export type TextData = {
  readonly characters: string;
  readonly fontSize: number;
  readonly fontName: { readonly family: string; readonly style: string; readonly postscript?: string };
  readonly textAlignHorizontal?: KiwiEnumValue;
  readonly textAlignVertical?: KiwiEnumValue;
  readonly textAutoResize?: KiwiEnumValue;
  readonly textDecoration?: KiwiEnumValue;
  readonly textCase?: KiwiEnumValue;
  readonly lineHeight?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly letterSpacing?: { readonly value: number; readonly units: KiwiEnumValue };
  /**
   * Per-character style IDs.
   *
   * Each element corresponds to a character in `characters` and references
   * an entry in `styleOverrideTable` by its `styleID` field.
   * Characters with the same ID share the same style override.
   * ID 0 means "use the node's base style" (no override).
   *
   * This is a direct representation of Figma's Kiwi TextData.characterStyleIDs.
   * @see Kiwi schema: TextData.characterStyleIDs
   */
  readonly characterStyleIDs?: readonly number[];
  /**
   * Style override table.
   *
   * Each entry defines a set of style properties (fontSize, fontName,
   * fillPaints, etc.) that override the node's base style for characters
   * referencing this entry's `styleID` via `characterStyleIDs`.
   *
   * This is a direct representation of Figma's Kiwi TextData.styleOverrideTable.
   * The entries are sparse subsets of NodeChange — only style-related fields
   * are present.
   *
   * @see Kiwi schema: TextData.styleOverrideTable (array of NodeChange)
   */
  readonly styleOverrideTable?: readonly TextStyleOverride[];

  /**
   * Text truncation mode.
   * ENDING = truncate with ellipsis at the end.
   */
  readonly textTruncation?: KiwiEnumValue;

  /**
   * Leading (line spacing) trim mode.
   * CAP_HEIGHT = trim leading to cap height rather than full ascent.
   */
  readonly leadingTrim?: KiwiEnumValue;

  /**
   * Variable font axis values (e.g. weight, width).
   * Empty array when no variations are applied.
   */
  readonly fontVariations?: readonly { readonly axisTag: number; readonly axisValue: number }[];

  /**
   * Hyperlink URL attached to this text node.
   */
  readonly hyperlink?: { readonly url?: string };
};

/**
 * A style override entry for per-character text styling.
 *
 * In Figma's Kiwi format, this is a NodeChange with only style-related
 * fields populated. We model the relevant subset here.
 *
 * Each override is identified by `styleID`, which is referenced from
 * `characterStyleIDs`. The fields present in this override replace the
 * node's base style for the corresponding characters.
 */
export type TextStyleOverride = {
  /** Unique ID referenced by characterStyleIDs. 0 = base style (never in the table). */
  readonly styleID: number;
  readonly fontSize?: number;
  readonly fontName?: FigFontName;
  readonly fillPaints?: readonly FigPaint[];
  readonly textDecoration?: KiwiEnumValue;
  readonly textCase?: KiwiEnumValue;
  readonly lineHeight?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly letterSpacing?: { readonly value: number; readonly units: KiwiEnumValue };
  readonly fontWeight?: number;
  readonly textStyleId?: number;
};

// =============================================================================
// Blend Mode
// =============================================================================

/**
 * Blend mode string literals matching SVG/CSS mix-blend-mode values.
 * In Kiwi format, stored as KiwiEnumValue; in domain, normalized to string.
 */
export type BlendMode =
  | "PASS_THROUGH"
  | "NORMAL"
  | "DARKEN"
  | "MULTIPLY"
  | "LINEAR_BURN"
  | "COLOR_BURN"
  | "LIGHTEN"
  | "SCREEN"
  | "LINEAR_DODGE"
  | "COLOR_DODGE"
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  | "DIFFERENCE"
  | "EXCLUSION"
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";

// =============================================================================
// Derived Text Data (for high-fidelity text rendering)
// =============================================================================

/**
 * Domain aliases for Kiwi-level derived text data types.
 * SoT is in types.ts (FigDerived* types); these are re-exports for
 * backward compatibility with domain consumers.
 */
export type DerivedBaseline = FigDerivedBaseline;
export type DerivedGlyph = FigDerivedGlyph;
export type DerivedDecoration = FigDerivedDecoration;
export type DerivedTextData = FigDerivedTextData;

// =============================================================================
// Component/Instance Data Types
// =============================================================================

/**
 * Symbol override for an instance node.
 *
 * guidPath is the Kiwi FigGuidPath structure as-is — no conversion.
 * Each guid in the path identifies a target node in the symbol tree.
 * The remaining fields are the overridden properties (same structure
 * as FigNode fields: fillPaints, opacity, visible, transform, size, etc.).
 */
export type SymbolOverride = {
  readonly guidPath: { readonly guids: readonly { readonly sessionID: number; readonly localID: number }[] };
  readonly [key: string]: unknown;
};

/**
 * Mutable version of FigDesignNode for override application.
 *
 * After deep-cloning, overrides need to mutate specific fields.
 * This type makes all fields writable while preserving the field names
 * so that property access is type-safe (no `as Record<string, unknown>`).
 */
export type MutableFigDesignNode = { -readonly [K in keyof FigDesignNode]: FigDesignNode[K] };

/**
 * Check whether a SymbolOverride's guidPath is valid (non-null, non-empty).
 */
export function isValidOverridePath(override: SymbolOverride): boolean {
  const gp = override.guidPath;
  return gp != null && gp.guids != null && gp.guids.length > 0;
}

/**
 * Check whether a SymbolOverride targets a specific node (self-override).
 *
 * A self-override has exactly one guid in the path, matching the given ID.
 */
export function isSelfOverride(override: SymbolOverride, nodeId: string): boolean {
  const guids = override.guidPath?.guids;
  if (!guids || guids.length !== 1) { return false; }
  return `${guids[0].sessionID}:${guids[0].localID}` === nodeId;
}

/**
 * Convert a SymbolOverride's guidPath to an array of "sessionID:localID" strings.
 */
export function overridePathToIds(override: SymbolOverride): readonly string[] {
  return override.guidPath.guids.map((g) => `${g.sessionID}:${g.localID}`);
}

/**
 * Iterate over the property entries of a SymbolOverride, skipping guidPath.
 */
export function* overrideEntries(override: SymbolOverride): Generator<[string, unknown]> {
  for (const [key, value] of Object.entries(override)) {
    if (key === "guidPath") { continue; }
    yield [key, value];
  }
}

/**
 * Apply override properties to a mutable FigDesignNode.
 *
 * Maps raw FigNode field names to FigDesignNode field names
 * (fillPaints → fills, strokePaints → strokes) and applies
 * only known visual override properties.
 */
export function applyOverrideToNode(
  target: MutableFigDesignNode,
  override: SymbolOverride,
  options?: { skipDerivedTextData?: boolean },
): void {
  for (const [key, value] of overrideEntries(override)) {
    switch (key) {
      // Paint field name mapping (Kiwi → domain)
      case "fillPaints":
        target.fills = value as readonly FigPaint[];
        break;
      case "strokePaints":
        target.strokes = value as readonly FigPaint[];
        break;
      // Direct mappings — same name in Kiwi and domain
      case "visible":
        target.visible = value as boolean;
        break;
      case "opacity":
        target.opacity = value as number;
        break;
      case "effects":
        target.effects = value as readonly FigEffect[];
        break;
      case "cornerRadius":
        target.cornerRadius = value as number | undefined;
        break;
      case "rectangleCornerRadii":
        target.rectangleCornerRadii = value as readonly number[] | undefined;
        break;
      case "blendMode":
        target.blendMode = value as MutableFigDesignNode["blendMode"];
        break;
      case "strokeWeight":
        target.strokeWeight = value as FigStrokeWeight;
        break;
      case "strokeJoin":
        target.strokeJoin = value as KiwiEnumValue | undefined;
        break;
      case "strokeCap":
        target.strokeCap = value as KiwiEnumValue | undefined;
        break;
      case "clipsContent":
        target.clipsContent = value as boolean | undefined;
        break;
      case "cornerSmoothing":
        target.cornerSmoothing = value as number | undefined;
        break;
      // Layout fields (from derivedSymbolData)
      case "transform":
        target.transform = value as FigMatrix;
        break;
      case "size":
        target.size = value as FigVector;
        break;
      // Geometry (blob references — indices into document blobs array)
      case "fillGeometry":
        target.fillGeometry = value as readonly FigFillGeometry[] | undefined;
        break;
      case "strokeGeometry":
        target.strokeGeometry = value as readonly FigFillGeometry[] | undefined;
        break;
      case "derivedTextData":
        if (!options?.skipDerivedTextData) {
          target.derivedTextData = value as DerivedTextData | undefined;
        }
        break;

      // Style ID references — resolved to fills/strokes via style registry
      // (resolution happens in the builder after all overrides are applied)
      case "styleIdForFill":
        target.styleIdForFill = value as FigStyleId | undefined;
        break;
      case "styleIdForStrokeFill":
        target.styleIdForStrokeFill = value as FigStyleId | undefined;
        break;

      // Per-corner radius (Figma's individual corner fields)
      // These are combined into rectangleCornerRadii for rendering.
      case "rectangleTopLeftCornerRadius":
      case "rectangleTopRightCornerRadius":
      case "rectangleBottomLeftCornerRadius":
      case "rectangleBottomRightCornerRadius": {
        // Update the rectangleCornerRadii array with the individual value
        const radii = target.rectangleCornerRadii
          ? [...target.rectangleCornerRadii]
          : [target.cornerRadius ?? 0, target.cornerRadius ?? 0, target.cornerRadius ?? 0, target.cornerRadius ?? 0];
        const idx = key === "rectangleTopLeftCornerRadius" ? 0
          : key === "rectangleTopRightCornerRadius" ? 1
          : key === "rectangleBottomRightCornerRadius" ? 2
          : 3; // bottomLeft
        radii[idx] = value as number;
        target.rectangleCornerRadii = radii;
        break;
      }

      // Per-side stroke weights
      case "borderTopWeight":
      case "borderRightWeight":
      case "borderBottomWeight":
      case "borderLeftWeight": {
        const sw = target.individualStrokeWeights ?? { top: target.strokeWeight as number ?? 0, right: target.strokeWeight as number ?? 0, bottom: target.strokeWeight as number ?? 0, left: target.strokeWeight as number ?? 0 };
        const side = key === "borderTopWeight" ? "top"
          : key === "borderRightWeight" ? "right"
          : key === "borderBottomWeight" ? "bottom"
          : "left";
        target.individualStrokeWeights = { ...sw, [side]: value as number };
        break;
      }

      // Layout constraint override
      case "stackPositioning": {
        const lc = target.layoutConstraints ?? {};
        target.layoutConstraints = { ...lc, stackPositioning: value as KiwiEnumValue };
        break;
      }

      // Stroke dashes
      case "strokeDashes":
        target.strokeDashes = value as readonly number[] | undefined;
        break;

      // Name (metadata, not visual — but included for completeness)
      case "name":
        target.name = value as string;
        break;

      // Instance swap via override — changes the symbol this INSTANCE resolves to.
      // The value is a FigGuid { sessionID, localID } from the Kiwi binary.
      // Convert to FigNodeId using the domain's canonical conversion.
      case "overriddenSymbolID": {
        const guid = value as { readonly sessionID: number; readonly localID: number } | undefined;
        if (guid) {
          target.symbolId = guidToNodeId(guid);
        }
        break;
      }

      // Non-visual properties (editor state) — accepted but not rendered
      case "locked":
        break;
    }
  }
}

// =============================================================================
// Component Property Types
//
// Figma's component properties allow SYMBOL/COMPONENT authors to define
// named, typed slots (text, boolean, color, instance swap, etc.) that
// INSTANCE nodes can override.
//
// Data flow:
//   SYMBOL/COMPONENT node  →  componentPropertyDefs  (definitions)
//   Child nodes of SYMBOL  →  componentPropertyRefs  (bindings to defs)
//   INSTANCE node          →  componentPropertyAssignments  (overridden values)
// =============================================================================

/**
 * Component property type.
 *
 * Maps to Figma's ComponentPropType enum:
 *   BOOL=0, TEXT=1, COLOR=2, INSTANCE_SWAP=3, VARIANT=4, NUMBER=5, IMAGE=6, SLOT=7
 */
export type ComponentPropertyType =
  | "BOOL"
  | "TEXT"
  | "COLOR"
  | "INSTANCE_SWAP"
  | "VARIANT"
  | "NUMBER"
  | "IMAGE"
  | "SLOT";

/**
 * Component property value.
 *
 * Each field corresponds to a ComponentPropertyType:
 * - BOOL       → boolValue
 * - TEXT       → textValue
 * - INSTANCE_SWAP / VARIANT → referenceValue (FigNodeId of the target COMPONENT)
 * - NUMBER     → numberValue
 *
 * At runtime, exactly one field is populated based on the property type.
 * No index signature — all known value shapes are explicit.
 */
export type ComponentPropertyValue = {
  readonly boolValue?: boolean;
  readonly textValue?: {
    readonly characters: string;
  };
  /**
   * References a COMPONENT/SYMBOL node for INSTANCE_SWAP or VARIANT properties.
   * Converted from raw FigGuid to FigNodeId at domain construction time
   * via `guidToNodeId()`, ensuring type-safe lookup against `components` map.
   */
  readonly referenceValue?: FigNodeId;
  readonly numberValue?: number;
};

/**
 * A component property definition on a SYMBOL/COMPONENT node.
 *
 * Defines a named, typed slot that INSTANCE nodes can override.
 */
export type ComponentPropertyDef = {
  /** Unique identifier for this definition (GUID → FigNodeId for lookup) */
  readonly id: FigNodeId;
  /** Human-readable name (e.g., "Label", "Show Icon", "Variant") */
  readonly name: string;
  /** Property type */
  readonly type: ComponentPropertyType;
  /** Initial/default value */
  readonly initialValue?: ComponentPropertyValue;
  /** Sort order in Figma's property panel */
  readonly sortPosition?: string;
};

/**
 * What node field a component property reference binds to.
 *
 * Maps to Figma's ComponentPropNodeField enum:
 *   VISIBLE=0, TEXT_DATA=1, OVERRIDDEN_SYMBOL_ID=2, INHERIT_FILL_STYLE_ID=3, SLOT_CONTENT_ID=4
 */
export type ComponentPropertyNodeField =
  | "VISIBLE"
  | "TEXT_DATA"
  | "OVERRIDDEN_SYMBOL_ID"
  | "INHERIT_FILL_STYLE_ID"
  | "SLOT_CONTENT_ID";

/**
 * A component property reference on a child node of a SYMBOL/COMPONENT.
 *
 * Binds a specific node field to a property definition so the field
 * can be overridden by INSTANCE property assignments.
 */
export type ComponentPropertyRef = {
  /** References a ComponentPropertyDef.id */
  readonly defId: FigNodeId;
  /** Which node field this reference controls */
  readonly nodeField: ComponentPropertyNodeField;
};

/**
 * A component property assignment on an INSTANCE node.
 *
 * Overrides the value of a component property defined on the SYMBOL.
 */
export type ComponentPropertyAssignment = {
  /** References a ComponentPropertyDef.id */
  readonly defId: FigNodeId;
  /** The overridden value */
  readonly value: ComponentPropertyValue;
};

// =============================================================================
// Design Node
// =============================================================================

/**
 * A single node in the design document tree.
 *
 * This is the high-level representation of a Figma node,
 * carrying typed properties and branded IDs.
 *
 * The _raw field preserves the complete original FigNode data
 * (excluding children) for roundtrip export fidelity. Fields not
 * explicitly modeled here (e.g., advanced constraints, export settings,
 * derived data) are preserved through _raw.
 */
export type FigDesignNode = {
  readonly id: FigNodeId;
  readonly type: FigNodeType;
  readonly name: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly transform: FigMatrix;
  readonly size: FigVector;

  // Paint & stroke
  readonly fills: readonly FigPaint[];
  readonly strokes: readonly FigPaint[];
  readonly strokeWeight: FigStrokeWeight;
  readonly strokeAlign?: KiwiEnumValue;
  readonly strokeJoin?: KiwiEnumValue;
  readonly strokeCap?: KiwiEnumValue;

  /** Stroke dash pattern (e.g., [4, 2] for dashed stroke) */
  readonly strokeDashes?: readonly number[];

  /**
   * Per-side stroke weights for frames/rectangles.
   * When borderStrokeWeightsIndependent is true, each side may have
   * a different stroke width. SVG renders this as separate stroked
   * paths per side rather than a single stroke-width attribute.
   */
  readonly individualStrokeWeights?: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };

  /**
   * Style reference for fill paint (Kiwi schema field 332).
   *
   * When present, references a shared fill style whose GUID identifies
   * a style definition node in the document. The `fills` field may
   * contain stale cached paints — consumers should resolve via a
   * FigStyleRegistry when this field is present.
   *
   * At domain construction time (`treeToDocument`), fills are pre-resolved
   * from the registry so this field serves as provenance metadata.
   * At render time, vector per-path overrides may also carry styleIdForFill
   * which needs runtime resolution via the registry.
   */
  readonly styleIdForFill?: FigStyleId;

  /**
   * Style reference for stroke paint (Kiwi schema field 333).
   * Same semantics as styleIdForFill but for strokes.
   */
  readonly styleIdForStrokeFill?: FigStyleId;

  // Geometry
  /**
   * Fill geometry: blob references for decoded path commands.
   * Each entry's commandsBlob is an index into the document's blobs array.
   */
  readonly fillGeometry?: readonly FigFillGeometry[];
  /** Stroke geometry: pre-expanded stroke outlines as blob references. */
  readonly strokeGeometry?: readonly FigFillGeometry[];

  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];

  /** Whether this node is a mask for its siblings */
  readonly mask?: boolean;

  /**
   * Ellipse arc data for partial arcs and donuts.
   * When present, the ellipse is rendered as a path.
   */
  readonly arcData?: {
    readonly startingAngle?: number;
    readonly endingAngle?: number;
    readonly innerRadius?: number;
  };

  /**
   * Pre-decoded SVG path strings (vectorPaths from Kiwi binary).
   * Priority source for VECTOR/LINE/STAR/POLYGON geometry.
   */
  readonly vectorPaths?: readonly FigVectorPath[];

  /**
   * Vector data including per-path style override table.
   * Used for per-contour fill overrides on VECTOR nodes.
   */
  readonly vectorData?: FigVectorData;
  /** iOS-style corner smoothing (0 = none, 1 = full) */
  readonly cornerSmoothing?: number;

  // Visual compositing
  /**
   * Blend mode for compositing this node onto the canvas.
   * PASS_THROUGH means the node inherits the parent's blend mode.
   * Stored as KiwiEnumValue in .fig binary, normalized to string at domain level.
   */
  readonly blendMode?: BlendMode;

  // Effects
  readonly effects: readonly FigEffect[];

  // Hierarchy
  readonly children?: readonly FigDesignNode[];

  // Frame/container specifics
  readonly clipsContent?: boolean;
  readonly autoLayout?: AutoLayoutProps;
  readonly layoutConstraints?: LayoutConstraints;

  // Text specifics
  readonly textData?: TextData;
  /**
   * Pre-computed glyph outlines for high-fidelity text rendering.
   * Contains path blobs, baselines, and decorations from the .fig binary.
   * When present, renderers use this for exact Figma-parity output
   * instead of font measurement.
   */
  readonly derivedTextData?: DerivedTextData;

  // Component/instance specifics
  /**
   * Reference to the SYMBOL/COMPONENT this INSTANCE resolves to.
   *
   * Uses FigNodeId (branded "sessionID:localID" string) — the same type as
   * the keys of `FigDesignDocument.components`. This type-level guarantee
   * prevents accidental assignment of raw FigGuid structs or untyped strings.
   *
   * Must be produced via `guidToNodeId(getEffectiveSymbolID(raw))` — no
   * other construction path is valid.
   */
  readonly symbolId?: FigNodeId;
  readonly overrides?: readonly SymbolOverride[];

  /**
   * Figma's pre-computed layout data for resized INSTANCE children.
   *
   * When an INSTANCE has a different size than its SYMBOL, Figma computes
   * adjusted positions/sizes for each child based on constraints. This
   * pre-computed data is stored as override entries (same structure as
   * symbolOverrides) targeting child nodes with transform/size fields.
   *
   * Used by resolveInstance to adjust child layout. Falls back to
   * constraint resolution when absent.
   */
  readonly derivedSymbolData?: readonly SymbolOverride[];

  /**
   * Component property definitions (on SYMBOL/COMPONENT nodes).
   * Defines the named, typed slots that INSTANCE nodes can override.
   */
  readonly componentPropertyDefs?: readonly ComponentPropertyDef[];

  /**
   * Component property references (on child nodes within a SYMBOL/COMPONENT).
   * Binds a node field (e.g., text content, visibility) to a property definition.
   */
  readonly componentPropertyRefs?: readonly ComponentPropertyRef[];

  /**
   * Component property assignments (on INSTANCE nodes).
   * Contains the overridden values for properties defined on the referenced SYMBOL.
   */
  readonly componentPropertyAssignments?: readonly ComponentPropertyAssignment[];

  // Boolean operation specifics
  readonly booleanOperation?: KiwiEnumValue;

  // Star/polygon specifics
  readonly pointCount?: number;
  readonly starInnerRadius?: number;
  /** Star inner scale factor (0-1). Alternative to starInnerRadius for controlling inner vertex positions. */
  readonly starInnerScale?: number;

  /**
   * Raw Kiwi node data preserved for roundtrip fidelity.
   * Contains fields not explicitly modeled in this type.
   * Excluded: guid, parentIndex, children, type, name, visible, opacity,
   * transform, size, fillPaints, strokePaints (these are modeled above).
   */
  readonly _raw?: Record<string, unknown>;
};

// =============================================================================
// Page
// =============================================================================

/**
 * A page in the design document (corresponds to a CANVAS node in .fig).
 */
export type FigPage = {
  readonly id: FigPageId;
  readonly name: string;
  readonly backgroundColor: FigColor;
  readonly children: readonly FigDesignNode[];

  /** Raw CANVAS node data for roundtrip */
  readonly _raw?: Record<string, unknown>;
};

// =============================================================================
// Style Registry
// =============================================================================

/**
 * Maps style GUID strings to their resolved paint arrays.
 *
 * Built from (styleIdForFill, fillPaints) pairs found across all nodes
 * in a document. Used to resolve stale paint caches when nodes or
 * per-path overrides reference shared styles.
 */
export type FigStyleRegistry = {
  readonly fills: ReadonlyMap<string, readonly FigPaint[]>;
  readonly strokes: ReadonlyMap<string, readonly FigPaint[]>;
};

/** Empty style registry — no styles to resolve */
export const EMPTY_FIG_STYLE_REGISTRY: FigStyleRegistry = {
  fills: new Map(),
  strokes: new Map(),
};

// =============================================================================
// Design Document
// =============================================================================

/**
 * Default background color for new pages (Figma's default canvas background).
 */
export const DEFAULT_PAGE_BACKGROUND: FigColor = { r: 0.9607843, g: 0.9607843, b: 0.9607843, a: 1 };

/**
 * High-level representation of a complete .fig design file.
 *
 * Analogous to PresentationDocument in the PPTX pipeline.
 */
/**
 * Binary blob data for geometry decoding.
 *
 * Blobs are binary arrays containing encoded path commands, glyph outlines,
 * and other binary geometry data referenced by fillGeometry/strokeGeometry
 * indices on design nodes. Structurally identical to parser FigBlob —
 * defined separately to avoid domain → parser dependency.
 */
export type FigDesignBlob = {
  readonly bytes: readonly number[];
};

export type FigDesignDocument = {
  readonly pages: readonly FigPage[];
  /** Components (SYMBOL/COMPONENT nodes) indexed by their node ID */
  readonly components: ReadonlyMap<string, FigDesignNode>;
  /** Images extracted from the .fig ZIP */
  readonly images: ReadonlyMap<string, FigImage>;
  /**
   * Binary blobs for geometry decoding (fillGeometry/strokeGeometry,
   * derived text paths, etc.). Indexed by blob reference numbers on nodes.
   */
  readonly blobs: readonly FigDesignBlob[];
  /** File metadata (name, export date, etc.) */
  readonly metadata: FigMetadata | null;

  /**
   * Style registry mapping style GUIDs to resolved paint arrays.
   *
   * Built during domain conversion from (styleIdForFill, fillPaints) pairs
   * found across all nodes in the document. Consumers use this to resolve
   * per-path style overrides in vector data (vectorData.styleOverrideTable)
   * where an entry's `styleIdForFill` references a shared style.
   *
   * Node-level fills/strokes are pre-resolved during domain conversion,
   * so this registry is primarily needed for vector per-path overrides
   * that carry `styleIdForFill` references.
   */
  readonly styleRegistry: FigStyleRegistry;

  /**
   * Original loaded file data for roundtrip export.
   * Present only when the document was loaded from an existing .fig file.
   * Used by the export pipeline to preserve schema compatibility.
   */
  readonly _loaded?: LoadedFigFile;
};
