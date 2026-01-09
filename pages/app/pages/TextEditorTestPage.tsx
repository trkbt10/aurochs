/**
 * @file Text Editor Test Page
 *
 * Focused test page for PPTX editor inline text editing.
 */

import { useMemo, useState } from "react";
import {
  EditorConfigProvider,
  Panel,
  Accordion,
  FieldGroup,
  PixelsEditor,
  DegreesEditor,
  MixedRunPropertiesEditor,
  MixedParagraphPropertiesEditor,
  FillEditor,
  LineEditor,
  EffectsEditor,
  createDefaultColor,
  createDefaultLine,
  createDefaultEffects,
  createDefaultTextBody,
} from "@lib/pptx-editor";
import type { Slide, TextBody, TextRun } from "@lib/pptx/domain";
import { px, deg, pt, type Pixels } from "@lib/pptx/domain";
import { SlideRendererSvg } from "@lib/pptx/render/react";
import { layoutTextBody, toLayoutInput } from "@lib/pptx/render/text-layout";
import { createPagesFontCatalog } from "../fonts/pages-font-catalog";
import { TextEditController } from "../../../src/pptx-editor/slide/text-edit";
import type { TextSelection, CursorPosition, SelectionChangeEvent } from "../../../src/pptx-editor/slide/text-edit";
import {
  applyRunPropertiesToSelection,
  applyParagraphPropertiesToSelection,
} from "../../../src/pptx-editor/slide/text-edit/input-support/run-formatting";
import {
  extractTextProperties,
  getEffectiveRunPropertiesAtCursor,
  type TextSelectionContext,
} from "../../../src/pptx-editor/editors/text/text-property-extractor";
import { getExtractionValue, isMixed } from "../../../src/pptx-editor/editors/text/mixed-properties";
import { testSlideSize, testColorContext } from "../components/drawing-ml-tests";
import "./DrawingMLTestPage.css";
import "./SlideshowPage.css";

type TextEditorTestPageProps = {
  readonly onBack: () => void;
};

function createTextRun(text: string, properties?: TextBody["paragraphs"][number]["runs"][number]["properties"]): TextRun {
  return { type: "text", text, properties };
}

function getRunLength(run: TextRun): number {
  switch (run.type) {
    case "text":
      return run.text.length;
    case "break":
      return 1;
    case "field":
      return run.text.length;
  }
}

function getParagraphLength(textBody: TextBody, paragraphIndex: number): number {
  const paragraph = textBody.paragraphs[paragraphIndex];
  if (!paragraph) {
    return 0;
  }
  return paragraph.runs.reduce((sum, run) => sum + getRunLength(run), 0);
}

function getSelectionForCursor(textBody: TextBody, position: CursorPosition): TextSelection | null {
  const paragraph = textBody.paragraphs[position.paragraphIndex];
  if (!paragraph) {
    return null;
  }

  // eslint-disable-next-line no-restricted-syntax -- accumulation for offsets
  let offset = 0;
  for (const run of paragraph.runs) {
    const runLength = getRunLength(run);
    const runEnd = offset + runLength;
    if (position.charOffset <= runEnd) {
      return {
        start: { paragraphIndex: position.paragraphIndex, charOffset: offset },
        end: { paragraphIndex: position.paragraphIndex, charOffset: runEnd },
      };
    }
    offset = runEnd;
  }

  return null;
}

function getSelectionForBody(textBody: TextBody): TextSelection | null {
  if (textBody.paragraphs.length === 0) {
    return null;
  }
  const lastIndex = textBody.paragraphs.length - 1;
  const endOffset = getParagraphLength(textBody, lastIndex);
  return {
    start: { paragraphIndex: 0, charOffset: 0 },
    end: { paragraphIndex: lastIndex, charOffset: endOffset },
  };
}

/**
 * Demo page for inline text editing + formatting UI.
 */
export function TextEditorTestPage({ onBack }: TextEditorTestPageProps) {
  const fontCatalog = useMemo(() => createPagesFontCatalog(), []);
  const slideWidth = Number(testSlideSize.width);
  const slideHeight = Number(testSlideSize.height);

  const initialTextBody = useMemo<TextBody>(() => {
    const base = createDefaultTextBody();
    const firstParagraph = base.paragraphs[0];
    return {
      ...base,
      paragraphs: [
        {
          ...firstParagraph,
          runs: [
            createTextRun("Mixed ", { fontFamily: "Inter", fontSize: pt(16) }),
            createTextRun("weights", { fontFamily: "Inter", fontSize: pt(16), bold: true }),
            createTextRun(" and ", { fontFamily: "Inter", fontSize: pt(16) }),
            createTextRun("sizes", { fontFamily: "Inter", fontSize: pt(22), italic: true }),
            createTextRun(" with ", { fontFamily: "Georgia", fontSize: pt(18) }),
            createTextRun("color", {
              fontFamily: "Georgia",
              fontSize: pt(18),
              color: { spec: { type: "srgb", value: "C0392B" } },
            }),
            createTextRun(" and ", { fontFamily: "Georgia", fontSize: pt(18) }),
            createTextRun("outline", {
              fontFamily: "Georgia",
              fontSize: pt(18),
              textOutline: createDefaultLine(),
            }),
            createTextRun("."),
          ],
        },
        {
          ...firstParagraph,
          runs: [
            createTextRun("Font mix: ", { fontFamily: "Arial", fontSize: pt(14) }),
            createTextRun("Serif", { fontFamily: "Times New Roman", fontSize: pt(18) }),
            createTextRun(" / "),
            createTextRun("Mono", { fontFamily: "Courier New", fontSize: pt(14), bold: true }),
            createTextRun(" / "),
            createTextRun("Sans", { fontFamily: "Verdana", fontSize: pt(16), italic: true }),
            createTextRun("."),
          ],
        },
        {
          ...firstParagraph,
          runs: [
            createTextRun("Text effects: ", { fontFamily: "Inter", fontSize: pt(16) }),
            createTextRun("Glow + Shadow", {
              fontFamily: "Inter",
              fontSize: pt(20),
              effects: {
                glow: {
                  color: createDefaultColor("00BFFF"),
                  radius: px(6),
                },
                shadow: {
                  type: "outer",
                  color: createDefaultColor("000000"),
                  blurRadius: px(6),
                  distance: px(6),
                  direction: deg(45),
                },
              },
            }),
          ],
        },
      ],
    };
  }, []);

  const [textBounds, setTextBounds] = useState({
    x: px(80),
    y: px(80),
    width: px(640),
    height: px(180),
    rotation: 0,
  });

  const slide = useMemo<Slide>(
    () => ({
      background: {
        fill: {
          type: "solidFill",
          color: { spec: { type: "srgb", value: "FFFFFF" } },
        },
      },
      shapes: [],
    }),
    []
  );

  const [lastComplete, setLastComplete] = useState<string | null>(null);
  const [currentTextBody, setCurrentTextBody] = useState<TextBody>(initialTextBody);
  const [selectionContext, setSelectionContext] = useState<TextSelectionContext>({ type: "none" });

  const extractedProperties = useMemo(
    () => extractTextProperties(currentTextBody, selectionContext),
    [currentTextBody, selectionContext]
  );

  const layoutResult = useMemo(() => {
    const input = toLayoutInput({
      body: currentTextBody,
      width: textBounds.width,
      height: textBounds.height,
      colorContext: testColorContext,
    });
    return layoutTextBody(input);
  }, [currentTextBody, textBounds.height, textBounds.width]);

  const updateBounds = (
    patch: Partial<{ x: Pixels; y: Pixels; width: Pixels; height: Pixels; rotation: number }>
  ) => {
    setTextBounds((prev) => ({ ...prev, ...patch }));
  };

  const resolveSelection = (
    context: TextSelectionContext,
    textBody: typeof currentTextBody
  ): TextSelection | null => {
    if (context.type === "selection") {
      return context.selection;
    }
    if (context.type === "cursor") {
      return getSelectionForCursor(textBody, context.position);
    }
    if (context.type === "shape") {
      return getSelectionForBody(textBody);
    }
    return null;
  };

  const handleApplyRunProperties = (update: Parameters<typeof applyRunPropertiesToSelection>[2]) => {
    const selection = resolveSelection(selectionContext, currentTextBody);
    if (!selection) {
      return;
    }
    const next = applyRunPropertiesToSelection(currentTextBody, selection, update);
    setCurrentTextBody(next);
  };

  const handleApplyParagraphProperties = (update: Parameters<typeof applyParagraphPropertiesToSelection>[2]) => {
    if (extractedProperties.paragraphIndices.length === 0) {
      return;
    }
    const next = applyParagraphPropertiesToSelection(
      currentTextBody,
      extractedProperties.paragraphIndices,
      update
    );
    setCurrentTextBody(next);
  };

  const handleSelectionChange = (event: SelectionChangeEvent) => {
    setCurrentTextBody(event.textBody);
    if (event.selection) {
      setSelectionContext({ type: "selection", selection: event.selection });
    } else if (event.cursorPosition) {
      setSelectionContext({ type: "cursor", position: event.cursorPosition });
    } else {
      setSelectionContext({ type: "none" });
    }
  };

  const runProperties = extractedProperties.runProperties;
  const fillValue =
    !isMixed(runProperties.fill) ? getExtractionValue(runProperties.fill) : undefined;
  const outlineValue =
    !isMixed(runProperties.textOutline) ? getExtractionValue(runProperties.textOutline) : undefined;
  const effectiveRunProperties = useMemo(() => {
    if (selectionContext.type === "cursor") {
      return getEffectiveRunPropertiesAtCursor(currentTextBody, selectionContext.position);
    }
    return extractedProperties.runRanges[0]?.run.properties;
  }, [currentTextBody, extractedProperties.runRanges, selectionContext]);

  return (
    <EditorConfigProvider config={{ locale: "en-US", fontCatalog }}>
      <div className="drawingml-test-page">
        <header className="test-header">
          <button className="back-button" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="header-info">
            <h1 className="test-title">Text Editor Test</h1>
            <div className="section-indicator">pptx-editor</div>
          </div>
        </header>

        <main className="test-content">
          <section className="test-section">
            <h3>Text Edit Controller</h3>
            <p className="section-description">
              Inline text editing overlay from src/pptx-editor/slide/text-edit.
            </p>
            <div className="test-examples">
              <div className="text-editor-layout">
                <Panel title="Text Edit Settings" width="100%">
                  <FieldGroup label="X" inline>
                    <PixelsEditor
                      value={textBounds.x}
                      onChange={(value) => updateBounds({ x: value })}
                    />
                  </FieldGroup>
                  <FieldGroup label="Y" inline>
                    <PixelsEditor
                      value={textBounds.y}
                      onChange={(value) => updateBounds({ y: value })}
                    />
                  </FieldGroup>
                  <FieldGroup label="Width" inline>
                    <PixelsEditor
                      value={textBounds.width}
                      onChange={(value) => updateBounds({ width: value })}
                    />
                  </FieldGroup>
                  <FieldGroup label="Height" inline>
                    <PixelsEditor
                      value={textBounds.height}
                      onChange={(value) => updateBounds({ height: value })}
                    />
                  </FieldGroup>
                  <FieldGroup label="Rotate" inline>
                    <DegreesEditor
                      value={deg(textBounds.rotation)}
                      onChange={(value) => updateBounds({ rotation: Number(value) })}
                    />
                  </FieldGroup>
                </Panel>
                <Panel title="Text Edit Canvas" width="100%">
                  <div className="slideshow-slide-container">
                    <SlideRendererSvg
                      slide={slide}
                      slideSize={testSlideSize}
                      colorContext={testColorContext}
                    />
                    <TextEditController
                      bounds={textBounds}
                      textBody={currentTextBody}
                      colorContext={testColorContext}
                      slideWidth={slideWidth}
                      slideHeight={slideHeight}
                      onComplete={setLastComplete}
                      onCancel={() => setLastComplete(null)}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                </Panel>
                <Panel title="Text Formatting" width="100%">
                  <Accordion title="Character" defaultExpanded>
                    <MixedRunPropertiesEditor
                      value={runProperties}
                      onChange={handleApplyRunProperties}
                      showSpacing={true}
                    />
                  </Accordion>
                  <Accordion title="Paragraph" defaultExpanded={false}>
                    <MixedParagraphPropertiesEditor
                      value={extractedProperties.paragraphProperties}
                      onChange={handleApplyParagraphProperties}
                      showSpacing={true}
                      showIndentation={true}
                    />
                  </Accordion>
                  <Accordion title="Text Fill" defaultExpanded={false}>
                    <FieldGroup label="Fill">
                      <FillEditor
                        value={fillValue ?? { type: "solidFill", color: createDefaultColor("000000") }}
                        onChange={(value) => handleApplyRunProperties({ fill: value })}
                      />
                    </FieldGroup>
                  </Accordion>
                  <Accordion title="Text Outline" defaultExpanded={false}>
                    <FieldGroup label="Outline">
                      <LineEditor
                        value={outlineValue ?? createDefaultLine()}
                        onChange={(value) => handleApplyRunProperties({ textOutline: value })}
                      />
                    </FieldGroup>
                  </Accordion>
                  <Accordion title="Text Effects" defaultExpanded={false}>
                    <EffectsEditor
                      value={effectiveRunProperties?.effects ?? createDefaultEffects()}
                      onChange={(value) => handleApplyRunProperties({ effects: value })}
                    />
                  </Accordion>
                </Panel>
              </div>
              <div className="pattern-info">Last commit</div>
              <pre className="pattern-names">
                {lastComplete ?? "Press Enter to commit, Esc to cancel."}
              </pre>
              <div className="pattern-info">Layout result</div>
              <pre className="pattern-names">{JSON.stringify(layoutResult, null, 2)}</pre>
            </div>
          </section>
        </main>
      </div>
    </EditorConfigProvider>
  );
}
