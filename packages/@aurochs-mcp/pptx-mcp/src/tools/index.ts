/**
 * @file Tool registration - thin wrapper over CLI core
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Pre-read blank template at module init — the only file I/O this module performs. */
const BLANK_TEMPLATE = new Uint8Array(readFileSync(join(__dirname, "..", "..", "templates", "blank.pptx")));
import type {
  PresentationSession,
  ShapeSpec,
  SlideModInput,
  TableUpdateSpec,
  SlideTransitionSpec,
  AnimationSpec,
  CommentSpec,
  NotesSpec,
} from "@aurochs-cli/pptx-cli/core";

// =============================================================================
// Zod Schemas
// =============================================================================

const createPresentationSchema = z.object({
  title: z.string().optional().describe("Presentation title."),
});

const addSlideSchema = z.object({
  layout: z.string().optional().describe("Layout path."),
  position: z.number().int().min(1).optional().describe("1-based position."),
});

const removeSlideSchema = z.object({
  slide_number: z.number().int().min(1).describe("1-based slide number to remove."),
});

const reorderSlideSchema = z.object({
  from_position: z.number().int().min(1).describe("Current 1-based position."),
  to_position: z.number().int().min(1).describe("Target 1-based position."),
});

const duplicateSlideSchema = z.object({
  source_slide_number: z.number().int().min(1).describe("1-based slide number to duplicate."),
  insert_at: z.number().int().min(1).optional().describe("1-based position to insert."),
});

const fillSchema = z.union([
  z.string(),
  z.object({
    type: z.literal("solid"),
    color: z.string(),
  }),
  z.object({
    type: z.literal("gradient"),
    stops: z.array(
      z.object({
        position: z.number(),
        color: z.string(),
      }),
    ),
    angle: z.number().optional(),
  }),
]);

const textRunSchema = z.object({
  text: z.string().describe("Text content of this run."),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fontSize: z.number().optional().describe("Font size in points."),
  fontFamily: z.string().optional(),
  color: z.string().optional().describe("Hex color (e.g. 'FF0000' or '#FF0000')."),
  underline: z.string().optional(),
  strikethrough: z.string().optional(),
});

const textParagraphSchema = z.object({
  runs: z.array(textRunSchema).describe("Text runs within this paragraph."),
  alignment: z.enum(["left", "center", "right", "justify"]).optional(),
  level: z.number().int().min(0).max(8).optional().describe("Indent level (0-8)."),
});

const textSchema = z
  .union([
    z.string().describe("Simple text string."),
    z.array(textParagraphSchema).describe("Rich text as array of paragraphs, each containing runs."),
    z.array(textRunSchema).describe("Shorthand: array of text runs. Each item becomes a paragraph with one run."),
  ])
  .describe(
    "Text content: string, or [{ runs: [{ text, bold?, fontSize?, color? }], alignment? }], or shorthand [{ text, bold?, fontSize? }].",
  );

const shapeSpecSchema = z.object({
  type: z.string().describe("Shape type: rect, ellipse, roundRect, triangle, etc."),
  x: z.number().describe("X position in pixels"),
  y: z.number().describe("Y position in pixels"),
  width: z.number().describe("Width in pixels"),
  height: z.number().describe("Height in pixels"),
  text: textSchema.optional(),
  fill: fillSchema
    .optional()
    .describe("Fill: hex string (e.g. '#FF0000') or { type: 'solid', color } or { type: 'gradient', stops, angle }"),
  lineColor: z.string().optional().describe("Line color as hex (e.g. '#000000')."),
  lineWidth: z.number().optional().describe("Line width in pixels."),
  rotation: z.number().optional().describe("Rotation in degrees (0-360)."),
});

const addShapeSchema = z.object({
  slide_number: z.number().int().min(1).describe("1-based slide number"),
  shape: shapeSpecSchema,
});

const addTextBoxSchema = z.object({
  slide_number: z.number().int().min(1).describe("1-based slide number"),
  text: z.string().describe("Text content"),
  x: z.number().describe("X position"),
  y: z.number().describe("Y position"),
  width: z.number().describe("Width"),
  height: z.number().describe("Height"),
});

const addImageSchema = z.object({
  slide_number: z.number().int().min(1),
  image: z.object({
    data: z.string().describe("Base64-encoded image data."),
    mime_type: z.string().describe("MIME type (e.g. 'image/png', 'image/jpeg')."),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    effects: z.record(z.any()).optional().describe("Image effects"),
  }),
});

const addConnectorSchema = z.object({
  slide_number: z.number().int().min(1),
  connector: z.object({
    preset: z.enum(["straightConnector1", "bentConnector3", "curvedConnector3"]).optional(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    start_shape_id: z.string().optional(),
    start_site_index: z.number().optional(),
    end_shape_id: z.string().optional(),
    end_site_index: z.number().optional(),
    line_color: z.string().optional(),
    line_width: z.number().optional(),
  }),
});

const tableCellSchema = z.object({
  text: z.string(),
});

const addTableSchema = z.object({
  slide_number: z.number().int().min(1),
  table: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rows: z.array(z.array(tableCellSchema)),
  }),
});

const addGroupSchema = z.object({
  slide_number: z.number().int().min(1),
  group: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    children: z.array(shapeSpecSchema),
    fill: z.string().optional(),
  }),
});

const updateTableSchema = z.object({
  slide_number: z.number().int().min(1),
  update: z.object({
    shape_id: z.string().describe("Shape ID of the table."),
    update_cells: z
      .array(
        z.object({
          row: z.number(),
          col: z.number(),
          content: z.string(),
        }),
      )
      .optional(),
    add_rows: z.array(z.any()).optional(),
    remove_rows: z.array(z.number()).optional(),
    add_columns: z.array(z.any()).optional(),
    remove_columns: z.array(z.number()).optional(),
  }),
});

const setTransitionSchema = z.object({
  slide_number: z.number().int().min(1),
  transition: z.object({
    type: z.string().describe("Transition type (fade, push, wipe, etc.)."),
    duration: z.number().optional().describe("Duration in milliseconds."),
    advance_on_click: z.boolean().optional(),
    advance_after: z.number().optional().describe("Auto-advance time in milliseconds."),
    direction: z.enum(["l", "r", "u", "d", "ld", "lu", "rd", "ru"]).optional(),
  }),
});

const addAnimationsSchema = z.object({
  slide_number: z.number().int().min(1),
  animations: z.array(
    z.object({
      shape_id: z.string().describe("Target shape ID."),
      class: z.enum(["entrance", "exit", "emphasis", "motion"]),
      effect: z.string().describe("Effect type (fade, fly, wipe, zoom, pulse, spin, etc.)."),
      trigger: z.string().optional(),
      duration: z.number().optional(),
      delay: z.number().optional(),
      direction: z.string().optional(),
    }),
  ),
});

const addCommentsSchema = z.object({
  slide_number: z.number().int().min(1),
  comments: z.array(
    z.object({
      author_name: z.string(),
      author_initials: z.string().optional(),
      text: z.string(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
  ),
});

const setSpeakerNotesSchema = z.object({
  slide_number: z.number().int().min(1),
  notes: z.object({
    text: z.string().describe("Speaker notes text."),
  }),
});

const modifySlideSchema = z.object({
  slide_number: z.number().int().min(1),
  background: z.union([z.string(), z.record(z.any())]).optional(),
  add_shapes: z.array(shapeSpecSchema).optional(),
  add_images: z.array(z.any()).optional(),
  add_tables: z.array(z.any()).optional(),
});

const buildSchema = z.object({});

const getInfoSchema = z.object({});

const renderSlideSchema = z.object({
  slide_number: z.number().int().min(1),
});

// =============================================================================
// Shared UI Metadata
// =============================================================================

/** Tool _meta for associating the preview UI with each tool. Both formats for host compat. */
const UI_META = {
  ui: { resourceUri: "ui://pptx/preview" },
  "ui/resourceUri": "ui://pptx/preview",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert shorthand TextRunSpec[] to TextParagraphSpec[].
 * The schema explicitly accepts both formats; this coerces the shorthand.
 */
export function coerceTextSpec(text: unknown): unknown {
  if (!Array.isArray(text) || text.length === 0) return text;
  // Already has `runs` → TextParagraphSpec[], pass through
  if (text[0].runs !== undefined) return text;
  // Shorthand TextRunSpec[] → wrap each item as a paragraph
  return text.map((item: Record<string, unknown>) => {
    if (typeof item === "string") return { runs: [{ text: item }] };
    const { align, alignment, ...runProps } = item;
    return { runs: [runProps], ...(align || alignment ? { alignment: align ?? alignment } : {}) };
  });
}

export function coerceShapeSpec(shape: Record<string, unknown>): Record<string, unknown> {
  if (shape.text !== undefined && typeof shape.text !== "string") {
    return { ...shape, text: coerceTextSpec(shape.text) };
  }
  return shape;
}

/** Build full presentation metadata for UI _meta. */
function presentationMeta(session: PresentationSession): { slideCount: number; width: number; height: number } {
  const info = session.getInfo()!;
  return { slideCount: info.slideCount, width: info.width, height: info.height };
}

// =============================================================================
// Tool Registration
// =============================================================================

/** Register PPTX tools */
export function registerTools(server: McpServer, session: PresentationSession): void {
  server.registerTool(
    "pptx_create_presentation",
    {
      title: "Create Presentation",
      description: "Create a new presentation.",
      inputSchema: createPresentationSchema,
      _meta: UI_META,
    },
    async (args) => {
      const { title } = args;
      try {
        const info = await session.loadFromBuffer(BLANK_TEMPLATE.buffer.slice(0), undefined, title);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slide_count: info.slideCount,
                size: { width: info.width, height: info.height },
              }),
            },
          ],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: { slideCount: info.slideCount, width: info.width, height: info.height },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_slide",
    { title: "Add Slide", description: "Add a slide.", inputSchema: addSlideSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { layout, position } = args;
      try {
        const result = await session.addSlide(layout, position);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                slide_number: result.slideNumber,
                total_slides: session.getSlideCount(),
              }),
            },
          ],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_remove_slide",
    { title: "Remove Slide", description: "Remove a slide.", inputSchema: removeSlideSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number } = args;
      try {
        const result = await session.removeSlide(slide_number);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                removed_slide: result.removedSlideNumber,
                total_slides: result.newSlideCount,
              }),
            },
          ],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_reorder_slide",
    {
      title: "Reorder Slide",
      description: "Move a slide to a different position.",
      inputSchema: reorderSlideSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { from_position, to_position } = args;
      try {
        const result = await session.reorderSlide(from_position, to_position);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, from: result.fromPosition, to: result.toPosition }),
            },
          ],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_duplicate_slide",
    {
      title: "Duplicate Slide",
      description: "Clone an existing slide.",
      inputSchema: duplicateSlideSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { source_slide_number, insert_at } = args;
      try {
        const result = await session.duplicateSlide(source_slide_number, insert_at);
        const svg = session.renderSlide(result.newSlideNumber);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                source: result.sourceSlideNumber,
                new_slide: result.newSlideNumber,
                total_slides: session.getSlideCount(),
              }),
            },
          ],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: result.newSlideNumber, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_shape",
    { title: "Add Shape", description: "Add a shape.", inputSchema: addShapeSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, shape } = args;
      try {
        const result = await session.addShape(
          slide_number,
          coerceShapeSpec(shape as Record<string, unknown>) as ShapeSpec,
        );
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, shape_id: result.shapeId }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_text_box",
    { title: "Add Text Box", description: "Add a text box.", inputSchema: addTextBoxSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, text, x, y, width, height } = args;
      try {
        const result = await session.addShape(slide_number, { type: "rect", x, y, width, height, text });
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, shape_id: result.shapeId }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_image",
    { title: "Add Image", description: "Add an image to a slide.", inputSchema: addImageSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, image } = args;
      try {
        const bytes = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));
        const spec = {
          data: bytes,
          mimeType: image.mime_type,
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.height,
        };
        const result = await session.addImage(slide_number, spec);
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, image_id: result.imageId }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_connector",
    { title: "Add Connector", description: "Add a connector line.", inputSchema: addConnectorSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, connector } = args;
      try {
        const spec = {
          preset: connector.preset,
          x: connector.x,
          y: connector.y,
          width: connector.width,
          height: connector.height,
          startShapeId: connector.start_shape_id,
          startSiteIndex: connector.start_site_index,
          endShapeId: connector.end_shape_id,
          endSiteIndex: connector.end_site_index,
          lineColor: connector.line_color,
          lineWidth: connector.line_width,
        };
        const result = await session.addConnector(slide_number, spec);
        const svg = session.renderSlide(slide_number);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, connector_id: result.connectorId }) },
          ],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_table",
    { title: "Add Table", description: "Add a table to a slide.", inputSchema: addTableSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, table } = args;
      try {
        const result = await session.addTable(slide_number, table);
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, table_id: result.tableId }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_group",
    { title: "Add Group", description: "Add a group of shapes.", inputSchema: addGroupSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, group } = args;
      try {
        const g = group as Record<string, unknown>;
        if (Array.isArray(g.children)) {
          g.children = (g.children as Record<string, unknown>[]).map(coerceShapeSpec);
        }
        const result = await session.addGroup(
          slide_number,
          g as { x: number; y: number; width: number; height: number; children: ShapeSpec[] },
        );
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, group_id: result.groupId }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_update_table",
    { title: "Update Table", description: "Update an existing table.", inputSchema: updateTableSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, update } = args;
      try {
        const spec: TableUpdateSpec = { shapeId: update.shape_id };
        const result = await session.updateTable(slide_number, spec);
        const svg = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, updated: result.updated }) }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_set_transition",
    {
      title: "Set Transition",
      description: "Set slide transition effect.",
      inputSchema: setTransitionSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, transition } = args;
      try {
        const spec: SlideTransitionSpec = {
          type: transition.type as SlideTransitionSpec["type"],
          duration: transition.duration,
          advanceOnClick: transition.advance_on_click,
          advanceAfter: transition.advance_after,
          direction: transition.direction as SlideTransitionSpec["direction"],
        };
        const result = await session.setTransition(slide_number, spec);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, applied: result.applied }) }],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_animations",
    {
      title: "Add Animations",
      description: "Add animations to shapes on a slide.",
      inputSchema: addAnimationsSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, animations } = args;
      try {
        const specs: readonly AnimationSpec[] = animations.map((a) => ({
          shapeId: a.shape_id,
          class: a.class as AnimationSpec["class"],
          effect: a.effect,
          trigger: a.trigger as AnimationSpec["trigger"],
          duration: a.duration,
          delay: a.delay,
          direction: a.direction as AnimationSpec["direction"],
        }));
        const result = await session.addAnimations(slide_number, specs);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, animations_added: result.animationsAdded }),
            },
          ],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_add_comments",
    { title: "Add Comments", description: "Add comments to a slide.", inputSchema: addCommentsSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, comments } = args;
      try {
        const specs: readonly CommentSpec[] = comments.map((c) => ({
          authorName: c.author_name,
          authorInitials: c.author_initials,
          text: c.text,
          x: c.x,
          y: c.y,
        }));
        const result = await session.addComments(slide_number, specs);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, comments_added: result.commentsAdded }) },
          ],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_set_speaker_notes",
    {
      title: "Set Speaker Notes",
      description: "Set speaker notes for a slide.",
      inputSchema: setSpeakerNotesSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, notes } = args;
      try {
        const spec: NotesSpec = { text: notes.text };
        const result = await session.setSpeakerNotes(slide_number, spec);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, applied: result.applied }) }],
          _meta: { ui: { resourceUri: "ui://pptx/preview" }, presentation: presentationMeta(session) },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_modify_slide",
    { title: "Modify Slide", description: "Modify a slide.", inputSchema: modifySlideSchema, _meta: UI_META },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number, background, add_shapes, add_images, add_tables } = args;
      try {
        const input: SlideModInput = {
          slideNumber: slide_number,
          background: background as SlideModInput["background"],
          addShapes: (Array.isArray(add_shapes)
            ? add_shapes.map((s: Record<string, unknown>) => coerceShapeSpec(s))
            : add_shapes) as SlideModInput["addShapes"],
          addImages: add_images as SlideModInput["addImages"],
          addTables: add_tables as SlideModInput["addTables"],
        };
        const result = await session.modifySlide(input);
        const svg = session.renderSlide(slide_number);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, elements_added: result.elementsAdded }) },
          ],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: svg.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_build",
    {
      title: "Build",
      description: "Build the presentation and return the PPTX as a base64 blob.",
      inputSchema: buildSchema,
      _meta: UI_META,
    },
    async () => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      try {
        const buffer = await session.exportBuffer();
        const bytes = new Uint8Array(buffer);
        const blob = btoa(String.fromCharCode(...bytes));
        return {
          content: [
            {
              type: "resource" as const,
              resource: {
                uri: "pptx://presentation/export",
                mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                blob,
              },
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );

  server.registerTool(
    "pptx_get_info",
    { title: "Get Info", description: "Get presentation info.", inputSchema: getInfoSchema, _meta: UI_META },
    async () => {
      const info = session.getInfo();
      if (!info) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ slide_count: info.slideCount, size: { width: info.width, height: info.height } }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "pptx_render_slide",
    {
      title: "Render Slide",
      description: "Render slide to SVG. Returns the SVG markup in the response.",
      inputSchema: renderSlideSchema,
      _meta: UI_META,
    },
    async (args) => {
      if (!session.isActive()) {
        return { content: [{ type: "text" as const, text: "No active presentation." }], isError: true };
      }
      const { slide_number } = args;
      try {
        const result = session.renderSlide(slide_number);
        return {
          content: [{ type: "text" as const, text: result.svg }],
          _meta: {
            ui: { resourceUri: "ui://pptx/preview" },
            presentation: presentationMeta(session),
            slideData: { number: slide_number, svg: result.svg },
          },
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: (err as Error).message }], isError: true };
      }
    },
  );
}
