/**
 * @file Property panel component
 *
 * Displays property editors for selected shapes.
 * Integrates Phase 1 editors based on shape type.
 */

import { useCallback, type CSSProperties } from "react";
import type { Shape, SpShape, PicShape, CxnShape, GrpShape, GraphicFrame } from "../../pptx/domain";
import type { Table } from "../../pptx/domain/table";
import type { Chart } from "../../pptx/domain/chart";
import { useSlideEditor } from "../context/SlideEditorContext";
import { useSlideState } from "./hooks/useSlideState";
import { Accordion } from "../ui/layout/Accordion";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  TextBodyEditor,
  TableEditor,
  ChartEditor,
  LineEditor,
  FillEditor,
  EffectsEditor,
  GeometryEditor,
  PercentEditor,
  DiagramEditor,
  OleObjectEditor,
  BackgroundEditor,
  TransitionEditor,
} from "../editors";
import type { DiagramDataModel } from "../../pptx/domain/diagram";
import type { OleReference } from "../../pptx/domain/shape";
import type { Background, SlideTransition } from "../../pptx/domain/slide";
import { FieldGroup, FieldRow } from "../ui/layout";
import { Toggle } from "../ui/primitives";

// =============================================================================
// Types
// =============================================================================

export type PropertyPanelProps = {
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Slide properties panel when no shape is selected
 */
function SlidePropertiesPanel({
  background,
  transition,
  onBackgroundChange,
  onTransitionChange,
}: {
  readonly background?: Background;
  readonly transition?: SlideTransition;
  readonly onBackgroundChange: (bg: Background | undefined) => void;
  readonly onTransitionChange: (tr: SlideTransition | undefined) => void;
}) {
  return (
    <>
      <Accordion title="Slide Background" defaultExpanded>
        {background ? (
          <BackgroundEditor
            value={background}
            onChange={onBackgroundChange}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            No background set
          </div>
        )}
      </Accordion>

      <Accordion title="Slide Transition" defaultExpanded={false}>
        <TransitionEditor
          value={transition}
          onChange={onTransitionChange}
        />
      </Accordion>
    </>
  );
}

/**
 * Multiple selection state
 */
function MultiSelectState({ count }: { count: number }) {
  return (
    <div
      style={{
        padding: "24px 16px",
        textAlign: "center",
        color: "var(--editor-text-secondary, #888)",
        fontSize: "13px",
      }}
    >
      {count} shapes selected
      <br />
      <span style={{ fontSize: "12px" }}>
        Select a single shape to edit properties
      </span>
    </div>
  );
}

/**
 * SpShape editor panel
 */
function SpShapePanel({
  shape,
  onChange,
}: {
  readonly shape: SpShape;
  readonly onChange: (shape: SpShape) => void;
}) {
  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.properties.transform && (
          <TransformEditor
            value={shape.properties.transform}
            onChange={(transform) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, transform },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Geometry" defaultExpanded={false}>
        {shape.properties.geometry && (
          <GeometryEditor
            value={shape.properties.geometry}
            onChange={(geometry) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, geometry },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Fill" defaultExpanded={false}>
        {shape.properties.fill && (
          <FillEditor
            value={shape.properties.fill}
            onChange={(fill) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, fill },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Line" defaultExpanded={false}>
        {shape.properties.line && (
          <LineEditor
            value={shape.properties.line}
            onChange={(line) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, line },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Effects" defaultExpanded={false}>
        {shape.properties.effects && (
          <EffectsEditor
            value={shape.properties.effects}
            onChange={(effects) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, effects },
              })
            }
          />
        )}
      </Accordion>

      {shape.textBody && (
        <Accordion title="Text" defaultExpanded={false}>
          <TextBodyEditor
            value={shape.textBody}
            onChange={(textBody) => onChange({ ...shape, textBody })}
          />
        </Accordion>
      )}
    </>
  );
}

/**
 * PicShape editor panel
 */
function PicShapePanel({
  shape,
  onChange,
}: {
  readonly shape: PicShape;
  readonly onChange: (shape: PicShape) => void;
}) {
  const handleSourceRectChange = (
    field: "left" | "top" | "right" | "bottom",
    value: number
  ) => {
    const currentRect = shape.blipFill.sourceRect ?? {
      left: 0 as import("../../pptx/domain/types").Percent,
      top: 0 as import("../../pptx/domain/types").Percent,
      right: 0 as import("../../pptx/domain/types").Percent,
      bottom: 0 as import("../../pptx/domain/types").Percent,
    };
    onChange({
      ...shape,
      blipFill: {
        ...shape.blipFill,
        sourceRect: {
          ...currentRect,
          [field]: value as import("../../pptx/domain/types").Percent,
        },
      },
    });
  };

  // Get media type label
  const getMediaTypeLabel = () => {
    if (shape.mediaType === "video") return "Video";
    if (shape.mediaType === "audio") return "Audio";
    return "Image";
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      {/* Media Info */}
      {(shape.mediaType || shape.media || shape.blipFill.compressionState) && (
        <Accordion title="Media Info" defaultExpanded={false}>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-tertiary, #111111)",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              color: "var(--text-secondary, #a1a1a1)",
            }}
          >
            <div>
              <span style={{ color: "var(--text-tertiary, #737373)", fontSize: "11px" }}>
                Type
              </span>
              <br />
              {getMediaTypeLabel()}
            </div>
            {shape.blipFill.compressionState && (
              <div>
                <span style={{ color: "var(--text-tertiary, #737373)", fontSize: "11px" }}>
                  Compression
                </span>
                <br />
                {shape.blipFill.compressionState}
              </div>
            )}
            {shape.blipFill.dpi && (
              <div>
                <span style={{ color: "var(--text-tertiary, #737373)", fontSize: "11px" }}>
                  DPI
                </span>
                <br />
                {shape.blipFill.dpi}
              </div>
            )}
            {shape.media && (
              <div>
                <span style={{ color: "var(--text-tertiary, #737373)", fontSize: "11px" }}>
                  Media Reference
                </span>
                <br />
                <code style={{ fontSize: "10px" }}>
                  {shape.media.audioCd && "Audio CD"}
                  {shape.media.audioFile && `Audio: ${shape.media.audioFile.link ?? "embedded"}`}
                  {shape.media.videoFile && `Video: ${shape.media.videoFile.link ?? "embedded"}`}
                  {shape.media.wavAudioFile && "WAV Audio (embedded)"}
                  {shape.media.quickTimeFile && "QuickTime"}
                </code>
              </div>
            )}
          </div>
        </Accordion>
      )}

      <Accordion title="Transform" defaultExpanded>
        {shape.properties.transform && (
          <TransformEditor
            value={shape.properties.transform}
            onChange={(transform) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, transform },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Crop (Source Rect)" defaultExpanded={false}>
        <FieldRow>
          <FieldGroup label="L" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.left ?? 0) as import("../../pptx/domain/types").Percent}
              onChange={(v) => handleSourceRectChange("left", v as number)}
            />
          </FieldGroup>
          <FieldGroup label="R" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.right ?? 0) as import("../../pptx/domain/types").Percent}
              onChange={(v) => handleSourceRectChange("right", v as number)}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="T" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.top ?? 0) as import("../../pptx/domain/types").Percent}
              onChange={(v) => handleSourceRectChange("top", v as number)}
            />
          </FieldGroup>
          <FieldGroup label="B" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.bottom ?? 0) as import("../../pptx/domain/types").Percent}
              onChange={(v) => handleSourceRectChange("bottom", v as number)}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow style={{ marginTop: "4px" }}>
          <Toggle
            checked={shape.blipFill.stretch ?? false}
            onChange={(stretch) =>
              onChange({
                ...shape,
                blipFill: { ...shape.blipFill, stretch },
              })
            }
            label="Stretch"
          />
          <Toggle
            checked={shape.blipFill.rotateWithShape ?? true}
            onChange={(rotateWithShape) =>
              onChange({
                ...shape,
                blipFill: { ...shape.blipFill, rotateWithShape },
              })
            }
            label="Rotate"
          />
        </FieldRow>
      </Accordion>

      <Accordion title="Effects" defaultExpanded={false}>
        {shape.properties.effects && (
          <EffectsEditor
            value={shape.properties.effects}
            onChange={(effects) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, effects },
              })
            }
          />
        )}
      </Accordion>
    </>
  );
}

/**
 * CxnShape editor panel
 */
function CxnShapePanel({
  shape,
  onChange,
}: {
  readonly shape: CxnShape;
  readonly onChange: (shape: CxnShape) => void;
}) {
  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Connections" defaultExpanded={false}>
        <FieldGroup label="Connection Points">
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                Start: {shape.nonVisual.startConnection
                  ? `Shape ${shape.nonVisual.startConnection.shapeId}, Site ${shape.nonVisual.startConnection.siteIndex}`
                  : "None"}
              </span>
              {shape.nonVisual.startConnection && (
                <button
                  type="button"
                  onClick={() => onChange({
                    ...shape,
                    nonVisual: { ...shape.nonVisual, startConnection: undefined },
                  })}
                  style={{
                    padding: "2px 6px",
                    fontSize: "10px",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                End: {shape.nonVisual.endConnection
                  ? `Shape ${shape.nonVisual.endConnection.shapeId}, Site ${shape.nonVisual.endConnection.siteIndex}`
                  : "None"}
              </span>
              {shape.nonVisual.endConnection && (
                <button
                  type="button"
                  onClick={() => onChange({
                    ...shape,
                    nonVisual: { ...shape.nonVisual, endConnection: undefined },
                  })}
                  style={{
                    padding: "2px 6px",
                    fontSize: "10px",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </FieldGroup>
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.properties.transform && (
          <TransformEditor
            value={shape.properties.transform}
            onChange={(transform) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, transform },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Geometry" defaultExpanded={false}>
        {shape.properties.geometry && (
          <GeometryEditor
            value={shape.properties.geometry}
            onChange={(geometry) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, geometry },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Line Style" defaultExpanded>
        {shape.properties.line && (
          <LineEditor
            value={shape.properties.line}
            onChange={(line) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, line },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Effects" defaultExpanded={false}>
        {shape.properties.effects && (
          <EffectsEditor
            value={shape.properties.effects}
            onChange={(effects) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, effects },
              })
            }
          />
        )}
      </Accordion>
    </>
  );
}

/**
 * GrpShape editor panel
 */
function GrpShapePanel({
  shape,
  onChange,
  onUngroup,
  onSelectChild,
}: {
  readonly shape: GrpShape;
  readonly onChange: (shape: GrpShape) => void;
  readonly onUngroup: () => void;
  readonly onSelectChild: (childId: string) => void;
}) {
  // Extract base Transform from GroupTransform for TransformEditor
  const groupTransform = shape.properties.transform;
  const baseTransform = groupTransform
    ? {
        x: groupTransform.x,
        y: groupTransform.y,
        width: groupTransform.width,
        height: groupTransform.height,
        rotation: groupTransform.rotation,
        flipH: groupTransform.flipH,
        flipV: groupTransform.flipV,
      }
    : undefined;

  const handleTransformChange = (
    newTransform: import("../../pptx/domain/types").Transform
  ) => {
    const existingGroupTransform = shape.properties.transform;
    onChange({
      ...shape,
      properties: {
        ...shape.properties,
        transform: existingGroupTransform
          ? {
              ...existingGroupTransform,
              ...newTransform,
            }
          : undefined,
      },
    });
  };

  // Get shape type label
  const getShapeTypeLabel = (child: Shape): string => {
    switch (child.type) {
      case "sp": {
        const geometry = child.properties.geometry;
        return geometry?.type === "preset" ? geometry.preset : "Shape";
      }
      case "pic":
        return "Picture";
      case "cxnSp":
        return "Connector";
      case "grpSp":
        return "Group";
      case "graphicFrame":
        return child.content.type === "table"
          ? "Table"
          : child.content.type === "chart"
            ? "Chart"
            : child.content.type === "diagram"
              ? "Diagram"
              : "Graphic";
      default:
        return child.type;
    }
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Group Info" defaultExpanded>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Ungroup button */}
          <button
            type="button"
            onClick={onUngroup}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              backgroundColor: "var(--bg-secondary, #1a1a1a)",
              border: "1px solid var(--border-subtle, #333)",
              borderRadius: "6px",
              color: "var(--text-primary, #fff)",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Ungroup ({shape.children.length} shapes)
          </button>

          {/* Children list */}
          <FieldGroup label="Children">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {shape.children.map((child, index) => {
                const childId = "nonVisual" in child ? child.nonVisual.id : undefined;
                const childName =
                  "nonVisual" in child
                    ? child.nonVisual.name || `Shape ${index + 1}`
                    : `Shape ${index + 1}`;
                const typeLabel = getShapeTypeLabel(child);

                return (
                  <button
                    key={childId ?? index}
                    type="button"
                    onClick={() => childId && onSelectChild(childId)}
                    disabled={!childId}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-tertiary, #111111)",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: childId ? "pointer" : "default",
                      textAlign: "left",
                      color: "var(--text-secondary, #a1a1a1)",
                    }}
                  >
                    <span>{childName}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-tertiary, #737373)",
                        backgroundColor: "var(--bg-secondary, #1a1a1a)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {typeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>
        </div>
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {baseTransform && (
          <TransformEditor
            value={baseTransform}
            onChange={handleTransformChange}
          />
        )}
      </Accordion>

      <Accordion title="Fill" defaultExpanded={false}>
        {shape.properties.fill && (
          <FillEditor
            value={shape.properties.fill}
            onChange={(fill) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, fill },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Effects" defaultExpanded={false}>
        {shape.properties.effects && (
          <EffectsEditor
            value={shape.properties.effects}
            onChange={(effects) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, effects },
              })
            }
          />
        )}
      </Accordion>
    </>
  );
}

/**
 * GraphicFrame (table) editor panel
 */
function TableFramePanel({
  shape,
  table,
  onChange,
}: {
  readonly shape: GraphicFrame;
  readonly table: Table;
  readonly onChange: (shape: GraphicFrame) => void;
}) {
  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Table" defaultExpanded>
        <TableEditor
          value={table}
          onChange={(newTable) =>
            onChange({
              ...shape,
              content:
                shape.content.type === "table"
                  ? { ...shape.content, data: { table: newTable } }
                  : shape.content,
            })
          }
        />
      </Accordion>
    </>
  );
}

/**
 * GraphicFrame (chart) editor panel
 */
function ChartFramePanel({
  shape,
  chart,
  onChange,
}: {
  readonly shape: GraphicFrame;
  readonly chart: Chart;
  readonly onChange: (shape: GraphicFrame) => void;
}) {
  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Chart" defaultExpanded>
        <ChartEditor
          value={chart}
          onChange={(newChart) =>
            onChange({
              ...shape,
              content:
                shape.content.type === "chart"
                  ? {
                      ...shape.content,
                      data: {
                        ...shape.content.data,
                        parsedChart: newChart,
                      },
                    }
                  : shape.content,
            })
          }
        />
      </Accordion>
    </>
  );
}

/**
 * GraphicFrame (diagram/SmartArt) editor panel
 */
function DiagramFramePanel({
  shape,
  onChange,
}: {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
}) {
  const diagramData =
    shape.content.type === "diagram" ? shape.content.data : undefined;

  const handleDataModelChange = (dataModel: DiagramDataModel) => {
    if (shape.content.type !== "diagram") return;
    onChange({
      ...shape,
      content: {
        ...shape.content,
        data: {
          ...shape.content.data,
          dataModel,
        },
      },
    });
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Diagram" defaultExpanded>
        {diagramData?.dataModel ? (
          <DiagramEditor
            value={diagramData.dataModel}
            onChange={handleDataModelChange}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            {diagramData?.parsedContent ? (
              <span>
                Diagram with {diagramData.parsedContent.shapes.length} shapes
                (data model not available)
              </span>
            ) : (
              <span>Diagram content not loaded</span>
            )}
          </div>
        )}
      </Accordion>
    </>
  );
}

/**
 * GraphicFrame (OLE object) editor panel
 */
function OleFramePanel({
  shape,
  onChange,
}: {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
}) {
  const oleData =
    shape.content.type === "oleObject" ? shape.content.data : undefined;

  const handleOleDataChange = (newOleData: OleReference) => {
    if (shape.content.type !== "oleObject") return;
    onChange({
      ...shape,
      content: {
        ...shape.content,
        data: newOleData,
      },
    });
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="OLE Object" defaultExpanded>
        {oleData ? (
          <OleObjectEditor
            value={oleData}
            onChange={handleOleDataChange}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              color: "var(--text-tertiary, #737373)",
              fontSize: "12px",
            }}
          >
            OLE object data not available
          </div>
        )}
      </Accordion>
    </>
  );
}

/**
 * Unknown shape type panel
 */
function UnknownShapePanel({ shape }: { readonly shape: Shape }) {
  return (
    <div
      style={{
        padding: "16px",
        color: "var(--editor-text-secondary, #888)",
        fontSize: "12px",
      }}
    >
      Unknown shape type: {shape.type}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Property panel for editing selected shape properties.
 *
 * Displays appropriate editors based on shape type:
 * - SpShape: NonVisual, Transform, Geometry, Fill, Line, Effects, Text
 * - PicShape: NonVisual, Transform, Crop (sourceRect), Stretch/Rotate, Effects
 * - CxnShape: NonVisual, Connections, Transform, Geometry, Line style, Effects
 * - GrpShape: NonVisual, Group info, Transform, Fill, Effects
 * - GraphicFrame (table): NonVisual, Transform, Table
 * - GraphicFrame (chart): NonVisual, Transform, Chart
 * - GraphicFrame (diagram): NonVisual, Transform, Diagram info
 * - GraphicFrame (oleObject): NonVisual, Transform, OLE Object info
 * - ContentPartShape: External content reference (read-only)
 */
export function PropertyPanel({ className, style }: PropertyPanelProps) {
  const { selectedShapes, primaryShape, slide, dispatch } = useSlideEditor();
  const { updateShape } = useSlideState();

  const handleShapeChange = useCallback(
    (newShape: Shape) => {
      const id = "nonVisual" in newShape ? newShape.nonVisual.id : undefined;
      if (id) {
        updateShape(id, () => newShape);
      }
    },
    [updateShape]
  );

  const handleBackgroundChange = useCallback(
    (background: Background | undefined) => {
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (s) => ({ ...s, background }),
      });
    },
    [dispatch]
  );

  const handleTransitionChange = useCallback(
    (transition: SlideTransition | undefined) => {
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (s) => ({ ...s, transition }),
      });
    },
    [dispatch]
  );

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    overflow: "auto",
    ...style,
  };

  // No selection - show slide properties
  if (selectedShapes.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          transition={slide.transition}
          onBackgroundChange={handleBackgroundChange}
          onTransitionChange={handleTransitionChange}
        />
      </div>
    );
  }

  // Multiple selection
  if (selectedShapes.length > 1) {
    return (
      <div className={className} style={containerStyle}>
        <MultiSelectState count={selectedShapes.length} />
      </div>
    );
  }

  // Single selection
  const shape = primaryShape;
  if (!shape) {
    // Fallback to slide properties if shape not found
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          transition={slide.transition}
          onBackgroundChange={handleBackgroundChange}
          onTransitionChange={handleTransitionChange}
        />
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {shape.type === "sp" && (
        <SpShapePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "pic" && (
        <PicShapePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "cxnSp" && (
        <CxnShapePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "grpSp" && (
        <GrpShapePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
          onUngroup={() => dispatch({ type: "UNGROUP_SHAPE", shapeId: shape.nonVisual.id })}
          onSelectChild={(childId) => dispatch({ type: "SELECT", shapeId: childId, addToSelection: false })}
        />
      )}
      {shape.type === "graphicFrame" && shape.content.type === "table" && (
        <TableFramePanel
          shape={shape}
          table={shape.content.data.table}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "graphicFrame" &&
        shape.content.type === "chart" &&
        shape.content.data.parsedChart && (
          <ChartFramePanel
            shape={shape}
            chart={shape.content.data.parsedChart}
            onChange={(s) => handleShapeChange(s)}
          />
        )}
      {shape.type === "graphicFrame" &&
        shape.content.type === "chart" &&
        !shape.content.data.parsedChart && (
          <div
            style={{
              padding: "16px",
              color: "var(--editor-text-secondary, #888)",
              fontSize: "12px",
            }}
          >
            Chart data not loaded
          </div>
        )}
      {shape.type === "graphicFrame" && shape.content.type === "diagram" && (
        <DiagramFramePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "graphicFrame" && shape.content.type === "oleObject" && (
        <OleFramePanel
          shape={shape}
          onChange={(s) => handleShapeChange(s)}
        />
      )}
      {shape.type === "graphicFrame" && shape.content.type === "unknown" && (
        <UnknownShapePanel shape={shape} />
      )}
      {shape.type === "contentPart" && (
        <div
          style={{
            padding: "16px",
            color: "var(--editor-text-secondary, #888)",
            fontSize: "12px",
          }}
        >
          Content Part (external content reference)
        </div>
      )}
    </div>
  );
}
