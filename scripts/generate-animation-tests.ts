/**
 * @file Animation and transition test file generator
 *
 * Creates PPTX files for testing slide transitions and animations.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 * @see MS-OE376 Part 4 Section 4.6.3 (Filter Effects)
 */

import JSZip from "jszip";
import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// Types
// =============================================================================

type TransitionType =
  | "fade"
  | "push"
  | "wipe"
  | "split"
  | "blinds"
  | "checker"
  | "circle"
  | "dissolve"
  | "comb"
  | "cover"
  | "cut"
  | "diamond"
  | "wheel"
  | "plus"
  | "random"
  | "randomBar"
  | "newsflash"
  | "strips"
  | "wedge"
  | "zoom"
  | "pull"
  | "none";

type TransitionSpeed = "slow" | "med" | "fast";

type TransitionDirection = "d" | "l" | "r" | "u" | "ld" | "lu" | "rd" | "ru";

type SlideTransition = {
  type: TransitionType;
  speed?: TransitionSpeed;
  direction?: TransitionDirection;
  advanceOnClick?: boolean;
  advanceAfter?: number; // milliseconds
};

type AnimationPreset = {
  presetId: number;
  presetClass: "entr" | "exit" | "emph" | "path";
  presetSubtype?: number;
  filter?: string;
  duration?: number;
};

type ShapeAnimation = {
  shapeId: number;
  preset: AnimationPreset;
};

type SlideConfig = {
  title: string;
  shapes: ShapeConfig[];
  transition?: SlideTransition;
  animations?: ShapeAnimation[];
};

type ShapeConfig = {
  id: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
};

// =============================================================================
// XML Templates
// =============================================================================

const CONTENT_TYPES_TEMPLATE = (slideCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n  ")}
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

const PRESENTATION_RELS_TEMPLATE = (slideCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n  ")}
  <Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const PRESENTATION_TEMPLATE = (slideCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("\n    ")}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const SLIDE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const SLIDE_MASTER_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="FFFFFF"/>
        </a:solidFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

// =============================================================================
// XML Generators
// =============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate transition XML element.
 * @see ECMA-376 Part 1, Section 19.3.1.50 (transition)
 */
function generateTransitionXml(transition: SlideTransition): string {
  const attrs: string[] = [];
  if (transition.speed) {
    attrs.push(`spd="${transition.speed}"`);
  }
  if (transition.advanceOnClick !== undefined) {
    attrs.push(`advClick="${transition.advanceOnClick ? "1" : "0"}"`);
  }
  if (transition.advanceAfter !== undefined) {
    attrs.push(`advTm="${transition.advanceAfter}"`);
  }

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  // Map transition type to element
  // @see ECMA-376 Part 1, Section 19.5
  const typeElement = getTransitionTypeElement(transition.type, transition.direction);

  return `<p:transition${attrStr}>${typeElement}</p:transition>`;
}

function getTransitionTypeElement(type: TransitionType, direction?: TransitionDirection): string {
  switch (type) {
    case "blinds":
      return `<p:blinds dir="${direction === "d" || direction === "u" ? "vert" : "horz"}"/>`;
    case "checker":
      return `<p:checker dir="${direction === "d" || direction === "u" ? "vert" : "horz"}"/>`;
    case "circle":
      return "<p:circle/>";
    case "comb":
      return `<p:comb dir="${direction === "d" || direction === "u" ? "vert" : "horz"}"/>`;
    case "cover":
      return `<p:cover dir="${direction ?? "l"}"/>`;
    case "cut":
      return "<p:cut/>";
    case "diamond":
      return "<p:diamond/>";
    case "dissolve":
      return "<p:dissolve/>";
    case "fade":
      return "<p:fade/>";
    case "newsflash":
      return "<p:newsflash/>";
    case "plus":
      return "<p:plus/>";
    case "pull":
      return `<p:pull dir="${direction ?? "l"}"/>`;
    case "push":
      return `<p:push dir="${direction ?? "l"}"/>`;
    case "random":
      return "<p:random/>";
    case "randomBar":
      return `<p:randomBar dir="${direction === "d" || direction === "u" ? "vert" : "horz"}"/>`;
    case "split":
      return `<p:split dir="${direction === "d" || direction === "u" ? "vert" : "horz"}" orient="horz"/>`;
    case "strips":
      return `<p:strips dir="${direction ?? "ld"}"/>`;
    case "wedge":
      return "<p:wedge/>";
    case "wheel":
      return '<p:wheel spokes="4"/>';
    case "wipe":
      return `<p:wipe dir="${direction ?? "l"}"/>`;
    case "zoom":
      return '<p:zoom dir="in"/>';
    case "none":
    default:
      return "";
  }
}

/**
 * Generate timing/animation XML.
 * @see ECMA-376 Part 1, Section 19.5 (Timing)
 */
function generateTimingXml(animations: ShapeAnimation[]): string {
  if (animations.length === 0) return "";

  const animationNodes = animations.map((anim, index) => {
    const { shapeId, preset } = anim;
    const duration = preset.duration ?? 500;
    const filter = preset.filter ?? "fade";

    return `<p:par>
              <p:cTn id="${index + 3}" presetID="${preset.presetId}" presetClass="${preset.presetClass}" presetSubtype="${preset.presetSubtype ?? 0}" fill="hold" nodeType="clickEffect">
                <p:stCondLst>
                  <p:cond delay="0"/>
                </p:stCondLst>
                <p:childTnLst>
                  <p:set>
                    <p:cBhvr>
                      <p:cTn id="${index + 4}" dur="1" fill="hold">
                        <p:stCondLst>
                          <p:cond delay="0"/>
                        </p:stCondLst>
                      </p:cTn>
                      <p:tgtEl>
                        <p:spTgt spid="${shapeId}"/>
                      </p:tgtEl>
                      <p:attrNameLst>
                        <p:attrName>style.visibility</p:attrName>
                      </p:attrNameLst>
                    </p:cBhvr>
                    <p:to>
                      <p:strVal val="visible"/>
                    </p:to>
                  </p:set>
                  <p:animEffect transition="in" filter="${filter}">
                    <p:cBhvr>
                      <p:cTn id="${index + 5}" dur="${duration}"/>
                      <p:tgtEl>
                        <p:spTgt spid="${shapeId}"/>
                      </p:tgtEl>
                    </p:cBhvr>
                  </p:animEffect>
                </p:childTnLst>
              </p:cTn>
            </p:par>`;
  }).join("\n          ");

  return `<p:timing>
    <p:tnLst>
      <p:par>
        <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
          <p:childTnLst>
            <p:seq concurrent="1" nextAc="seek">
              <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
                <p:childTnLst>
                  ${animationNodes}
                </p:childTnLst>
              </p:cTn>
              <p:prevCondLst>
                <p:cond evt="onPrev" delay="0">
                  <p:tgtEl>
                    <p:sldTgt/>
                  </p:tgtEl>
                </p:cond>
              </p:prevCondLst>
              <p:nextCondLst>
                <p:cond evt="onNext" delay="0">
                  <p:tgtEl>
                    <p:sldTgt/>
                  </p:tgtEl>
                </p:cond>
              </p:nextCondLst>
            </p:seq>
          </p:childTnLst>
        </p:cTn>
      </p:par>
    </p:tnLst>
  </p:timing>`;
}

function generateShapeXml(shape: ShapeConfig): string {
  const fill = shape.fill
    ? `<a:solidFill><a:srgbClr val="${shape.fill}"/></a:solidFill>`
    : `<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>`;

  return `<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shape.id}" name="Shape ${shape.id}"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${shape.x}" y="${shape.y}"/>
            <a:ext cx="${shape.width}" cy="${shape.height}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          ${fill}
          <a:ln w="12700">
            <a:solidFill>
              <a:schemeClr val="tx1"/>
            </a:solidFill>
          </a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="2400"/>
              <a:t>${escapeXml(shape.text)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
}

function generateSlideXml(config: SlideConfig): string {
  const shapesXml = config.shapes.map(generateShapeXml).join("\n      ");
  const transitionXml = config.transition ? generateTransitionXml(config.transition) : "";
  const timingXml = config.animations ? generateTimingXml(config.animations) : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      ${shapesXml}
    </p:spTree>
  </p:cSld>
  ${transitionXml}
  ${timingXml}
</p:sld>`;
}

// =============================================================================
// PPTX Generation
// =============================================================================

async function generatePptx(slides: SlideConfig[], outputPath: string): Promise<void> {
  const zip = new JSZip();
  const slideCount = slides.length;

  // Add required files
  zip.file("[Content_Types].xml", CONTENT_TYPES_TEMPLATE(slideCount));
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS_TEMPLATE(slideCount));
  zip.file("ppt/presentation.xml", PRESENTATION_TEMPLATE(slideCount));

  // Add slides
  for (let i = 0; i < slideCount; i++) {
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, SLIDE_RELS_XML);
    zip.file(`ppt/slides/slide${i + 1}.xml`, generateSlideXml(slides[i]));
  }

  // Add layout/master/theme
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS_XML);
  zip.file("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS_XML);
  zip.file("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML);
  zip.file("ppt/theme/theme1.xml", THEME_XML);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write ZIP file
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

// =============================================================================
// Test Slide Configurations
// =============================================================================

/**
 * Slide transitions demo - each slide demonstrates a different transition
 */
const transitionSlides: SlideConfig[] = [
  {
    title: "Fade Transition",
    shapes: [{ id: 2, text: "Fade", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4F81BD" }],
    transition: { type: "fade", speed: "med" },
  },
  {
    title: "Push Left",
    shapes: [{ id: 2, text: "Push Left", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "C0504D" }],
    transition: { type: "push", direction: "l", speed: "med" },
  },
  {
    title: "Wipe Right",
    shapes: [{ id: 2, text: "Wipe Right", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "9BBB59" }],
    transition: { type: "wipe", direction: "r", speed: "med" },
  },
  {
    title: "Blinds Horizontal",
    shapes: [{ id: 2, text: "Blinds", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "8064A2" }],
    transition: { type: "blinds", direction: "l", speed: "med" },
  },
  {
    title: "Circle",
    shapes: [{ id: 2, text: "Circle", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4BACC6" }],
    transition: { type: "circle", speed: "med" },
  },
  {
    title: "Diamond",
    shapes: [{ id: 2, text: "Diamond", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "F79646" }],
    transition: { type: "diamond", speed: "med" },
  },
  {
    title: "Dissolve",
    shapes: [{ id: 2, text: "Dissolve", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "1F497D" }],
    transition: { type: "dissolve", speed: "slow" },
  },
  {
    title: "Checker",
    shapes: [{ id: 2, text: "Checker", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4F81BD" }],
    transition: { type: "checker", direction: "l", speed: "med" },
  },
  {
    title: "Wheel",
    shapes: [{ id: 2, text: "Wheel", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "C0504D" }],
    transition: { type: "wheel", speed: "med" },
  },
  {
    title: "Plus",
    shapes: [{ id: 2, text: "Plus", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "9BBB59" }],
    transition: { type: "plus", speed: "med" },
  },
  {
    title: "Wedge",
    shapes: [{ id: 2, text: "Wedge", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "8064A2" }],
    transition: { type: "wedge", speed: "med" },
  },
  {
    title: "Random Bar",
    shapes: [{ id: 2, text: "Random Bar", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4BACC6" }],
    transition: { type: "randomBar", direction: "l", speed: "med" },
  },
];

/**
 * Shape animations demo - entrance effects
 */
const animationSlides: SlideConfig[] = [
  {
    title: "Fade Entrance",
    shapes: [
      { id: 2, text: "Fade In", x: 500000, y: 2000000, width: 2500000, height: 1200000, fill: "4F81BD" },
      { id: 3, text: "Box 2", x: 3500000, y: 2000000, width: 2500000, height: 1200000, fill: "C0504D" },
      { id: 4, text: "Box 3", x: 6500000, y: 2000000, width: 2500000, height: 1200000, fill: "9BBB59" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 10, presetClass: "entr", filter: "fade" } },
      { shapeId: 3, preset: { presetId: 10, presetClass: "entr", filter: "fade" } },
      { shapeId: 4, preset: { presetId: 10, presetClass: "entr", filter: "fade" } },
    ],
  },
  {
    title: "Wipe Entrance",
    shapes: [
      { id: 2, text: "Wipe", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "8064A2" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 22, presetClass: "entr", presetSubtype: 1, filter: "wipe(right)", duration: 750 } },
    ],
  },
  {
    title: "Blinds Entrance",
    shapes: [
      { id: 2, text: "Blinds", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4BACC6" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 3, presetClass: "entr", presetSubtype: 10, filter: "blinds(horizontal)", duration: 500 } },
    ],
  },
  {
    title: "Box Entrance",
    shapes: [
      { id: 2, text: "Box In", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "F79646" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 4, presetClass: "entr", presetSubtype: 16, filter: "box(in)", duration: 500 } },
    ],
  },
  {
    title: "Circle Entrance",
    shapes: [
      { id: 2, text: "Circle In", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "1F497D" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 5, presetClass: "entr", presetSubtype: 16, filter: "circle(in)", duration: 500 } },
    ],
  },
  {
    title: "Diamond Entrance",
    shapes: [
      { id: 2, text: "Diamond In", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4F81BD" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 6, presetClass: "entr", presetSubtype: 16, filter: "diamond(in)", duration: 500 } },
    ],
  },
  {
    title: "Dissolve Entrance",
    shapes: [
      { id: 2, text: "Dissolve", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "C0504D" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 8, presetClass: "entr", filter: "dissolve", duration: 750 } },
    ],
  },
  {
    title: "Strips Entrance",
    shapes: [
      { id: 2, text: "Strips", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "9BBB59" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 18, presetClass: "entr", presetSubtype: 6, filter: "strips(downRight)", duration: 500 } },
    ],
  },
  {
    title: "Plus Entrance",
    shapes: [
      { id: 2, text: "Plus In", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "8064A2" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 13, presetClass: "entr", presetSubtype: 16, filter: "plus(in)", duration: 500 } },
    ],
  },
  {
    title: "Wheel Entrance",
    shapes: [
      { id: 2, text: "Wheel", x: 3000000, y: 2500000, width: 3000000, height: 1500000, fill: "4BACC6" },
    ],
    animations: [
      { shapeId: 2, preset: { presetId: 21, presetClass: "entr", presetSubtype: 4, filter: "wheel(4)", duration: 1000 } },
    ],
  },
];

// =============================================================================
// Main
// =============================================================================

async function main() {
  const outputDir = path.join(process.cwd(), "fixtures/animation");

  // Generate transition demo
  await generatePptx(transitionSlides, path.join(outputDir, "transitions-demo.pptx"));

  // Generate animation demo
  await generatePptx(animationSlides, path.join(outputDir, "animations-demo.pptx"));

  console.log("\nGenerated test files in fixtures/animation/:");
  console.log("  - transitions-demo.pptx (12 slides with different transitions)");
  console.log("  - animations-demo.pptx (10 slides with different entrance animations)");
}

main().catch(console.error);
