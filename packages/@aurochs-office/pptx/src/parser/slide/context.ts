/**
 * @file Slide context hierarchy
 *
 * Hierarchical accessor structure for slide data access:
 * - SlideContext: Slide-level (shared data, inheritance chain)
 * - ShapeContext: Shape-level (type, idx determined)
 * - ParagraphContext: Paragraph-level (lvl determined)
 *
 * Each accessor provides methods scoped to its level.
 * All accessors are created via factory functions (no classes).
 *
 * This module belongs to the parser layer as it handles XML access
 * and inheritance resolution (slide → layout → master → theme).
 *
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */

import type { XmlElement } from "@aurochs/xml";
import { getChild, getByPath } from "@aurochs/xml";
import type { RenderOptions } from "@aurochs-renderer/pptx";

// Import domain types from canonical sources
import type { PlaceholderTable, Theme, ResolvedBlipResource, Background, Shape, ArchiveAccess } from "../../domain/index";
import type { FileReader } from "./external-content-loader";
import type { MasterTextStyles, TextStyleLevels } from "../../domain/text-style";
import type { ZipFile, ResourceMap } from "@aurochs-office/opc";
import type { TableStyleList } from "../table/style-parser";
import type { ColorMap, ColorResolveContext, ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { SCHEME_COLOR_NAMES } from "@aurochs-office/drawing-ml/domain/color";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceResolver } from "../../domain/resource-resolver";
import type { ResourceStore } from "../../domain/resource-store";
import { DEFAULT_COLOR_MAPPING } from "../../domain/color/types";
import { getMimeType, getMimeTypeFromPath } from "@aurochs/files";

// =============================================================================
// Params (immutable data)
// =============================================================================

export type SlideMasterParams = {
  textStyles: MasterTextStyles;
  placeholders: PlaceholderTable;
  colorMap: ColorMap;
  resources: ResourceMap;
  /** Master background — parsed domain type (SoT via parseSlideMaster). */
  background?: Background;
};

export type SlideLayoutParams = {
  placeholders: PlaceholderTable;
  resources: ResourceMap;
  /** Layout content element (p:sldLayout) for background lookup */
  content?: XmlElement;
};

export type SlideParams = {
  content: XmlElement;
  resources: ResourceMap;
  colorMapOverride?: ColorMap;
};

export type PresentationContext = {
  theme: Theme;
  defaultTextStyle: TextStyleLevels | null;
  zip: ZipFile;
  renderOptions: RenderOptions;
  /**
   * Theme's resource map for resolving images in bgFillStyleLst.
   *
   * Per ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst):
   * Background fill styles may contain a:blipFill elements with r:embed
   * references. These references are relative to the theme's relationships,
   * not the slide's relationships.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7
   */
  themeResources?: ResourceMap;
  /**
   * Table styles from ppt/tableStyles.xml.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.2 (a:tblStyleLst)
   */
  tableStyles?: TableStyleList;
};

// =============================================================================
// Type to Master Style Mapping
// =============================================================================

// =============================================================================
// ParagraphContext
// =============================================================================

export type ParagraphContext = {
  readonly lvl: number;
  readonly type: string;
  /** Placeholder index (xsd:unsignedInt per ECMA-376) */
  readonly idx: number | undefined;
  readonly shape: ShapeContext;

  getDefRPr(lstStyle?: XmlElement): XmlElement | undefined;
  getDefPPr(lstStyle?: XmlElement): XmlElement | undefined;
  resolveThemeFont(typeface: string): string | undefined;
  resolveSchemeColor(schemeColor: string): string | undefined;
};

/**
 * Create paragraph context for text style resolution.
 *
 * @param shape - Shape context
 * @param lvl - Paragraph level (1-9)
 */
export function createParagraphContext(shape: ShapeContext, lvl: number): ParagraphContext {
  const lvlpPr = `a:lvl${lvl}pPr`;
  return {
    lvl,
    type: shape.type,
    idx: shape.idx,
    shape,

    getDefRPr(lstStyle?: XmlElement): XmlElement | undefined {
      // 1. Local list style
      if (lstStyle !== undefined) {
        const defRPr = getByPath(lstStyle, [lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 2. Layout placeholder
      const layoutPh = shape.slide.layout.placeholders.byType[shape.type];
      if (layoutPh !== undefined) {
        const defRPr = getByPath(layoutPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 3. Master placeholder
      const masterPh = shape.slide.master.placeholders.byType[shape.type];
      if (masterPh !== undefined) {
        const defRPr = getByPath(masterPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 4. Master text styles (domain type — skipped for XML return type)
      // master.textStyles is now MasterTextStyles (domain typed). The resolved
      // RunProperties is accessible via masterStyle[levelKey]?.defaultRunProperties
      // but cannot be returned as XmlElement. This step is currently unreachable
      // in production (ParagraphContext is only used in tests).

      // 5. Default text style is now domain-typed (TextStyleLevels).
      // Resolution happens in individual resolvers (font-size, color, etc.).

      return undefined;
    },

    getDefPPr(lstStyle?: XmlElement): XmlElement | undefined {
      // 1. Local list style
      if (lstStyle !== undefined) {
        const pPr = getChild(lstStyle, lvlpPr);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 2. Layout placeholder
      const layoutPh = shape.slide.layout.placeholders.byType[shape.type];
      if (layoutPh !== undefined) {
        const pPr = getByPath(layoutPh, ["p:txBody", "a:lstStyle", lvlpPr]);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 3. Master placeholder
      const masterPh = shape.slide.master.placeholders.byType[shape.type];
      if (masterPh !== undefined) {
        const pPr = getByPath(masterPh, ["p:txBody", "a:lstStyle", lvlpPr]);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 4. Master text styles (domain type — skipped for XML return type)
      // See getDefRPr step 4 comment above.

      // 5. Default text style is now domain-typed (TextStyleLevels).
      // Resolution happens in individual resolvers (alignment, spacing, etc.).

      return undefined;
    },

    resolveThemeFont(typeface: string): string | undefined {
      const fontScheme = shape.slide.presentation.theme.fontScheme;

      if (typeface === "+mj-lt" || typeface === "+mj-ea") {
        return fontScheme.majorFont.latin ?? fontScheme.majorFont.eastAsian;
      }
      if (typeface === "+mn-lt" || typeface === "+mn-ea") {
        return fontScheme.minorFont.latin ?? fontScheme.minorFont.eastAsian;
      }

      return typeface;
    },

    resolveSchemeColor(schemeColor: string): string | undefined {
      const slideCtx = shape.slide;

      // Check slide color map override first
      const slideOverride = slideCtx.slide.colorMapOverride;
      if (slideOverride !== undefined) {
        const mapped = slideOverride[schemeColor];
        if (mapped !== undefined) {
          return slideCtx.presentation.theme.colorScheme[mapped];
        }
      }

      // Fall back to master color map
      const mapped = slideCtx.master.colorMap[schemeColor];
      if (mapped !== undefined) {
        return slideCtx.presentation.theme.colorScheme[mapped];
      }

      // Try direct lookup in color scheme
      return slideCtx.presentation.theme.colorScheme[schemeColor];
    },
  };
}

// =============================================================================
// ShapeContext
// =============================================================================

export type ShapeContext = {
  readonly slide: SlideContext;
  readonly type: string;
  /** Placeholder index (xsd:unsignedInt per ECMA-376) */
  readonly idx: number | undefined;

  forParagraph(lvl: number): ParagraphContext;
  getLayoutPlaceholder(): XmlElement | undefined;
  getMasterPlaceholder(): XmlElement | undefined;
};

/**
 * Create shape context for placeholder resolution.
 *
 * @param slide - Slide render context
 * @param type - Placeholder type (ST_PlaceholderType)
 * @param idx - Placeholder index (xsd:unsignedInt per ECMA-376)
 */
export function createShapeContext(slide: SlideContext, type: string, idx: number | undefined): ShapeContext {
  const self: ShapeContext = {
    slide,
    type,
    idx,

    forParagraph(lvl: number): ParagraphContext {
      return createParagraphContext(self, lvl);
    },

    getLayoutPlaceholder(): XmlElement | undefined {
      if (idx !== undefined) {
        const byIdx = slide.layout.placeholders.byIdx.get(idx);
        if (byIdx !== undefined) {
          return byIdx;
        }
      }
      return slide.layout.placeholders.byType[type];
    },

    getMasterPlaceholder(): XmlElement | undefined {
      if (idx !== undefined) {
        const byIdx = slide.master.placeholders.byIdx.get(idx);
        if (byIdx !== undefined) {
          return byIdx;
        }
      }
      return slide.master.placeholders.byType[type];
    },
  };

  return self;
}

// =============================================================================
// SlideRenderContext
// =============================================================================

export type SlideContext = {
  readonly slide: SlideParams;
  readonly layout: SlideLayoutParams;
  readonly master: SlideMasterParams;
  readonly presentation: PresentationContext;

  forShape(type: string, idx?: number): ShapeContext;
  readFile(path: string): ArrayBuffer | null;
  resolveResource(rId: string): string | undefined;

  // Scoped context derivation methods
  toColorContext(): ColorResolveContext;
  toPlaceholderContext(): PlaceholderContext;
  toResourceContext(): ResourceContext;
  toTextStyleContext(): TextStyleContext;
  /**
   * Get resource context for theme resources.
   *
   * Used when resolving images from theme's bgFillStyleLst/fillStyleLst.
   * These styles may contain a:blipFill with r:embed references that are
   * relative to the theme's relationships, not the slide's.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  toThemeResourceContext(): ResourceContext;
  /**
   * Create FileReader for external content loading.
   *
   * @param scope - "slide" (default) resolves via slide → layout → master chain,
   *                "layout" resolves via layout → master (for layout-scoped shapes).
   */
  toFileReader(scope?: "slide" | "layout"): FileReader;
  /**
   * Build resolved ColorContext (scheme colors + flat color map with overrides applied).
   * @see ECMA-376 Part 1, Section 20.1.4.1.10 (a:clrScheme)
   */
  toRendererColorContext(): ColorContext;
  /**
   * Build ResourceResolver backed by ResourceStore.
   * @see ECMA-376 Part 2 (Open Packaging Conventions)
   */
  toResourceResolver(resourceStore: ResourceStore): ResourceResolver;
  /**
   * Build FontScheme from theme data.
   * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
   */
  toFontScheme(): FontScheme;
};

/**
 * Create slide render context from slide parameters.
 *
 * @param slide - Slide parameters
 * @param layout - Layout parameters
 * @param master - Master parameters
 * @param presentation - Presentation context
 */
export function createSlideContext({
  slide,
  layout,
  master,
  presentation,
}: {
  readonly slide: SlideParams;
  readonly layout: SlideLayoutParams;
  readonly master: SlideMasterParams;
  readonly presentation: PresentationContext;
}): SlideContext {
  const self: SlideContext = {
    slide,
    layout,
    master,
    presentation,

    forShape(type: string, idx?: number): ShapeContext {
      return createShapeContext(self, type, idx);
    },

    readFile(path: string): ArrayBuffer | null {
      const entry = presentation.zip.file(path);
      if (entry === null) {
        return null;
      }
      return entry.asArrayBuffer();
    },

    resolveResource(rId: string): string | undefined {
      // Try slide resources first
      const slideTarget = slide.resources.getTarget(rId);
      if (slideTarget !== undefined) {
        return slideTarget;
      }

      // Fall back to layout resources
      const layoutTarget = layout.resources.getTarget(rId);
      if (layoutTarget !== undefined) {
        return layoutTarget;
      }

      // Fall back to master resources
      return master.resources.getTarget(rId);
    },

    toColorContext(): ColorResolveContext {
      return {
        colorMap: master.colorMap,
        colorMapOverride: slide.colorMapOverride,
        colorScheme: presentation.theme.colorScheme,
      };
    },

    toPlaceholderContext(): PlaceholderContext {
      return {
        layoutPlaceholders: layout.placeholders,
        masterPlaceholders: master.placeholders,
      };
    },

    toResourceContext(): ResourceContext {
      return createResourceContextImpl(self.resolveResource.bind(self), self.readFile.bind(self));
    },

    toTextStyleContext(): TextStyleContext {
      return {
        masterTextStyles: master.textStyles,
        defaultTextStyle: presentation.defaultTextStyle,
        placeholders: self.toPlaceholderContext(),
      };
    },

    toThemeResourceContext(): ResourceContext {
      return createResourceContextImpl(
        (rId: string) => presentation.themeResources?.getTarget(rId),
        self.readFile.bind(self),
      );
    },

    toFileReader(scope: "slide" | "layout" = "slide"): FileReader {
      if (scope === "layout") {
        return {
          readFile: self.readFile.bind(self),
          resolveResource: (rId: string) =>
            layout.resources.getTarget(rId) ?? master.resources.getTarget(rId),
          getResourceByType: (relType: string) =>
            layout.resources.getTargetByType(relType) ?? master.resources.getTargetByType(relType),
        };
      }
      return {
        readFile: self.readFile.bind(self),
        resolveResource: self.resolveResource.bind(self),
        getResourceByType: (relType: string) => slide.resources.getTargetByType(relType),
      };
    },

    toRendererColorContext(): ColorContext {
      const scheme = presentation.theme.colorScheme;
      const masterMap = master.colorMap;
      const overrideMap = slide.colorMapOverride;

      const colorScheme: Record<string, string> = {};
      for (const name of SCHEME_COLOR_NAMES) {
        const value = scheme[name];
        if (value !== undefined) {
          colorScheme[name] = value;
        }
      }

      const colorMap: Record<string, string> = {};
      const colorMappingKeys = Object.keys(DEFAULT_COLOR_MAPPING);
      for (const name of colorMappingKeys) {
        if (overrideMap !== undefined) {
          const ov = overrideMap[name];
          if (ov !== undefined) {
            colorMap[name] = ov;
            continue;
          }
        }
        const val = masterMap[name];
        if (val !== undefined) {
          colorMap[name] = val;
        }
      }

      return { colorScheme, colorMap };
    },

    toResourceResolver(resourceStore: ResourceStore): ResourceResolver {
      return {
        getTarget: (id: string) => slide.resources.getTarget(id),
        getType: (id: string) => slide.resources.getType(id),
        resolve: (id: string) => resourceStore.toDataUrl(id),
        getMimeType: (id: string) => {
          const entry = resourceStore.get(id);
          if (entry?.mimeType !== undefined) {
            return entry.mimeType;
          }
          const target = self.resolveResource(id);
          if (target === undefined) {
            return undefined;
          }
          return getMimeTypeFromPath(target);
        },
        getFilePath: (id: string) => {
          const entry = resourceStore.get(id);
          if (entry?.path !== undefined) {
            return entry.path;
          }
          return self.resolveResource(id);
        },
        readFile: (path: string) => {
          const data = self.readFile(path);
          if (data === null) {
            return null;
          }
          return new Uint8Array(data);
        },
        getResourceByType: (relType: string) => {
          return slide.resources.getTargetByType(relType);
        },
      };
    },

    toFontScheme(): FontScheme {
      const fs = presentation.theme.fontScheme;
      return {
        majorFont: {
          latin: fs.majorFont.latin,
          eastAsian: fs.majorFont.eastAsian,
          complexScript: fs.majorFont.complexScript,
        },
        minorFont: {
          latin: fs.minorFont.latin,
          eastAsian: fs.minorFont.eastAsian,
          complexScript: fs.minorFont.complexScript,
        },
      };
    },
  };

  return self;
}

// =============================================================================
// Scoped Context Types
// =============================================================================

/**
 * Context for placeholder resolution.
 *
 * Provides access to layout and master placeholders for style inheritance.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph - Placeholder Shape)
 */
export type PlaceholderContext = {
  readonly layoutPlaceholders: PlaceholderTable;
  readonly masterPlaceholders: PlaceholderTable;
};

/**
 * Context for resource access.
 *
 * Extends ArchiveAccess with blipFill image resolution for parse-time use.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */
export type ResourceContext = ArchiveAccess & {
  /**
   * Resolve a blipFill resource ID to raw image data.
   * This is the unified method for resolving image resources at parse time.
   * Conversion to Data URL or Blob URL is done by the render layer.
   *
   * @param rId - Relationship ID (e.g., "rId2")
   * @returns ResolvedBlipResource containing raw image data, or undefined if not found
   */
  readonly resolveBlipFill: (rId: string) => ResolvedBlipResource | undefined;
};

/**
 * Background source extracted from slide/layout/master.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.1 (p:bg - Slide Background)
 */
export type BackgroundSource = {
  /** Background properties element (p:bgPr) */
  readonly bgPr?: XmlElement;
  /** Background reference element (p:bgRef) */
  readonly bgRef?: XmlElement;
};

/**
 * Context for background processing.
 *
 * Extends ArchiveAccess with pre-extracted background elements from
 * the slide hierarchy, avoiding the need to traverse XML during rendering.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.1 (p:bg)
 */
export type BackgroundContext = ArchiveAccess & {
  /**
   * Background sources in priority order [slide, layout, master].
   * The first non-empty source should be used.
   */
  readonly sources: readonly BackgroundSource[];
  /** Color resolution context */
  readonly colorCtx: ColorResolveContext;
};

/**
 * Context for text style resolution.
 *
 * Provides access to master text styles and default text style
 * for text formatting inheritance.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.46 (p:txStyles)
 * @see ECMA-376 Part 1, Section 19.2.1.8 (p:defaultTextStyle)
 */
export type TextStyleContext = {
  readonly masterTextStyles: MasterTextStyles;
  readonly defaultTextStyle: TextStyleLevels | null;
  readonly placeholders: PlaceholderContext;
};

// =============================================================================
// ResourceContext Factory
// =============================================================================

/**
 * Create a ResourceContext implementation with resolveBlipFill.
 *
 * This is the canonical factory for creating ResourceContext instances.
 * The resolveBlipFill method provides unified image resource resolution,
 * separating resolution (here) from conversion (in render layer).
 *
 * @param resolveResource - Function to resolve rId to file path
 * @param readFile - Function to read file contents from the package
 */
export function createResourceContextImpl(
  resolveResource: (rId: string) => string | undefined,
  readFile: (path: string) => ArrayBuffer | null,
): ResourceContext {
  return {
    resolveResource,
    readFile,
    resolveBlipFill(rId: string): ResolvedBlipResource | undefined {
      const path = resolveResource(rId);
      if (path === undefined) {
        return undefined;
      }

      // Skip non-image files (e.g., XML relationships)
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (ext === "xml" || ext === "rels") {
        return undefined;
      }

      const data = readFile(path);
      if (data === null) {
        return undefined;
      }

      return {
        data,
        mimeType: getMimeType(ext),
        path,
      };
    },
  };
}

// =============================================================================
// Context Derivation Functions
// =============================================================================

/**
 * Derive ColorResolveContext from SlideRenderContext.
 */
export function toColorResolveContext(ctx: SlideContext): ColorResolveContext {
  return {
    colorMap: ctx.master.colorMap,
    colorMapOverride: ctx.slide.colorMapOverride,
    colorScheme: ctx.presentation.theme.colorScheme,
  };
}

/**
 * Derive PlaceholderContext from SlideContext.
 */
export function toPlaceholderContext(ctx: SlideContext): PlaceholderContext {
  return {
    layoutPlaceholders: ctx.layout.placeholders,
    masterPlaceholders: ctx.master.placeholders,
  };
}

/**
 * Derive ResourceContext from SlideRenderContext.
 */
export function toResourceContext(ctx: SlideContext): ResourceContext {
  return createResourceContextImpl(ctx.resolveResource.bind(ctx), ctx.readFile.bind(ctx));
}

/**
 * Derive TextStyleContext from SlideRenderContext.
 */
export function toTextStyleContext(ctx: SlideContext): TextStyleContext {
  return {
    masterTextStyles: ctx.master.textStyles,
    defaultTextStyle: ctx.presentation.defaultTextStyle,
    placeholders: toPlaceholderContext(ctx),
  };
}

// =============================================================================
// API Slide → SlideContext Factory
// =============================================================================

import type { Slide as ApiSlide } from "../../app/types";
import type { XmlDocument } from "@aurochs/xml";
import { parseTheme } from "../theme/theme-parser";
import { parseSlideMaster } from "./slide-parser";
import { createPlaceholderTable, createColorMap } from "./resource-adapters";
import { parseShapeTree } from "../shape-parser/parse-element";
import { getNonPlaceholderShapes } from "../../domain/shape-utils";

/**
 * Create SlideContext from an API Slide object.
 *
 * SoT for converting API-level slide data (XML documents + relationship maps)
 * into the parser-layer SlideContext. All XML decomposition happens here,
 * not in the renderer layer.
 *
 * @param apiSlide - API slide containing XML documents and relationship maps
 * @param renderOptions - Render options for dialect-specific behavior
 */
export function createSlideContextFromApiSlide(
  apiSlide: ApiSlide,
  renderOptions?: RenderOptions,
): SlideContext {
  const slideClrMapOvr = getByPath(apiSlide.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);
  const slideContent = getByPath(apiSlide.content, ["p:sld"]);

  const slide: SlideParams = {
    content: slideContent as XmlElement,
    resources: apiSlide.relationships,
    colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr) : undefined,
  };

  const layoutContent = getByPath(apiSlide.layout, ["p:sldLayout"]);

  const layout: SlideLayoutParams = {
    placeholders: createPlaceholderTable(apiSlide.layoutTables),
    resources: apiSlide.layoutRelationships,
    content: layoutContent as XmlElement | undefined,
  };

  const parsedMaster = parseSlideMaster(apiSlide.master ?? undefined);

  const master: SlideMasterParams = {
    textStyles: parsedMaster?.textStyles ?? { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
    placeholders: createPlaceholderTable(apiSlide.masterTables),
    colorMap: parsedMaster?.colorMap ?? {},
    resources: apiSlide.masterRelationships,
    background: parsedMaster?.background,
  };

  const theme = parseTheme(apiSlide.theme as XmlDocument, undefined);

  const presentation: PresentationContext = {
    theme,
    defaultTextStyle: apiSlide.defaultTextStyle,
    zip: apiSlide.zip,
    renderOptions: renderOptions ?? apiSlide.renderOptions,
    themeResources: apiSlide.themeRelationships,
    tableStyles: apiSlide.tableStyles ?? undefined,
  };

  return createSlideContext({ slide, layout, master, presentation });
}

/**
 * Get non-placeholder shapes from slide layout.
 *
 * SoT for layout shape extraction from SlideContext.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export function getLayoutNonPlaceholderShapes(ctx: SlideContext): readonly Shape[] {
  const layoutContent = ctx.layout.content;
  if (layoutContent === undefined) {
    return [];
  }

  const cSld = getChild(layoutContent, "p:cSld");
  if (cSld === undefined) {
    return [];
  }

  const spTree = getChild(cSld, "p:spTree");
  if (spTree === undefined) {
    return [];
  }

  return getNonPlaceholderShapes(parseShapeTree({ spTree }));
}
