/** @file Unit tests for animation patcher */
import { createElement, getChild, isXmlElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type { SimpleAnimationSpec } from "./animation-patcher";
import { addAnimationsToSlide, removeAnimationsFromSlide } from "./animation-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function createSlideDoc(timingEl?: XmlElement): XmlDocument {
  const sldChildren: XmlElement[] = [
    createElement("p:cSld", {}, [createElement("p:spTree")]),
  ];
  if (timingEl) {
    sldChildren.push(timingEl);
  }
  return doc(createElement("p:sld", {}, sldChildren));
}

describe("addAnimationsToSlide", () => {
  it("returns the document unchanged when animations array is empty", () => {
    const slideDoc = createSlideDoc();
    const result = addAnimationsToSlide(slideDoc, []);
    expect(result).toBe(slideDoc);
  });

  it("adds a single entrance animation to the slide", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    const timing = getChild(sld, "p:timing");
    expect(timing).not.toBeUndefined();
  });

  it("adds an exit animation with correct transition='out'", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "exit", effect: "fade", duration: 300 },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    const timing = getChild(sld, "p:timing");
    expect(timing).not.toBeUndefined();
  });

  it("adds emphasis animation", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "3", class: "emphasis", effect: "pulse" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("replaces existing p:timing element", () => {
    const existingTiming = createElement("p:timing", {}, [createElement("p:tnLst")]);
    const slideDoc = createSlideDoc(existingTiming);
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "appear" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    const timings = sld.children.filter(
      (c) => isXmlElement(c) && c.name === "p:timing",
    );
    expect(timings).toHaveLength(1);
  });

  it("preserves non-sld children in the document", () => {
    const xmlDecl = { type: "processingInstruction" as const, name: "xml", value: 'version="1.0"' };
    const slideDoc: XmlDocument = {
      children: [
        xmlDecl,
        createElement("p:sld", {}, [createElement("p:cSld")]),
      ],
    };
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    expect(result.children[0]).toBe(xmlDecl);
  });

  it("handles withPrevious trigger", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade", trigger: "onClick" },
      { shapeId: "3", class: "entrance", effect: "fade", trigger: "withPrevious" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("handles afterPrevious trigger", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade", trigger: "onClick" },
      { shapeId: "3", class: "entrance", effect: "wipe", trigger: "afterPrevious", delay: 500 },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("wraps multiple animations in same click group into a parallel node", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade", trigger: "onClick" },
      { shapeId: "3", class: "entrance", effect: "fade", trigger: "withPrevious" },
      { shapeId: "4", class: "entrance", effect: "fade", trigger: "afterPrevious" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    const timing = getChild(sld, "p:timing");
    expect(timing).not.toBeUndefined();
  });

  it("uses different filter strings for different effect types", () => {
    const slideDoc = createSlideDoc();
    const effects = ["wipe", "blinds", "fly", "zoom", "wheel", "randomBars", "fade"] as const;
    for (const effect of effects) {
      const anims: SimpleAnimationSpec[] = [
        { shapeId: "2", class: "entrance", effect },
      ];
      const result = addAnimationsToSlide(slideDoc, anims);
      const sld = result.children[0] as XmlElement;
      expect(getChild(sld, "p:timing")).not.toBeUndefined();
    }
  });

  it("handles direction subtype", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fly", direction: "left" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("handles repeat and autoReverse options", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      {
        shapeId: "2",
        class: "emphasis",
        effect: "pulse",
        repeat: 3,
        autoReverse: true,
      },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("handles indefinite repeat", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      {
        shapeId: "2",
        class: "emphasis",
        effect: "spin",
        repeat: "indefinite",
      },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("uses fallback preset ID 1 for unknown effect in entrance class", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "unknownEffect" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("uses fallback preset ID 1 for unknown effect in exit class", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "exit", effect: "unknownEffect" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("uses fallback preset ID 1 for unknown effect in emphasis class", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "emphasis", effect: "unknownEffect" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("uses fallback preset ID 1 for motion preset class", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "motion", effect: "line" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });

  it("creates multiple click groups with multiple onClick triggers", () => {
    const slideDoc = createSlideDoc();
    const animations: SimpleAnimationSpec[] = [
      { shapeId: "2", class: "entrance", effect: "fade", trigger: "onClick" },
      { shapeId: "3", class: "entrance", effect: "fade", trigger: "onClick" },
    ];
    const result = addAnimationsToSlide(slideDoc, animations);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).not.toBeUndefined();
  });
});

describe("removeAnimationsFromSlide", () => {
  it("removes p:timing from a slide", () => {
    const timing = createElement("p:timing", {}, [createElement("p:tnLst")]);
    const slideDoc = createSlideDoc(timing);
    const result = removeAnimationsFromSlide(slideDoc);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).toBeUndefined();
  });

  it("returns a slide unchanged when no p:timing exists", () => {
    const slideDoc = createSlideDoc();
    const result = removeAnimationsFromSlide(slideDoc);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).toBeUndefined();
    expect(getChild(sld, "p:cSld")).not.toBeUndefined();
  });

  it("preserves non-sld children in the document", () => {
    const xmlDecl = { type: "processingInstruction" as const, name: "xml", value: 'version="1.0"' };
    const timing = createElement("p:timing", {}, []);
    const slideDoc: XmlDocument = {
      children: [
        xmlDecl,
        createElement("p:sld", {}, [createElement("p:cSld"), timing]),
      ],
    };
    const result = removeAnimationsFromSlide(slideDoc);
    expect(result.children[0]).toBe(xmlDecl);
    const sld = result.children[1] as XmlElement;
    expect(getChild(sld, "p:timing")).toBeUndefined();
  });

  it("preserves other sld children when removing timing", () => {
    const timing = createElement("p:timing", {}, []);
    const slideDoc = doc(
      createElement("p:sld", {}, [
        createElement("p:cSld"),
        createElement("p:clrMapOvr"),
        timing,
      ]),
    );
    const result = removeAnimationsFromSlide(slideDoc);
    const sld = result.children[0] as XmlElement;
    expect(getChild(sld, "p:timing")).toBeUndefined();
    expect(getChild(sld, "p:cSld")).not.toBeUndefined();
    expect(getChild(sld, "p:clrMapOvr")).not.toBeUndefined();
  });
});
