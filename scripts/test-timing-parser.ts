/**
 * @file Test timing parser with real PPTX files
 *
 * Usage: bun run scripts/test-timing-parser.ts [pptx-file]
 */

import { parseTiming } from "../src/pptx/parser/timing-parser";
import { parseXml, isXmlElement, type XmlElement } from "../src/xml";
import JSZip from "jszip";
import * as fs from "node:fs";

const filePath = process.argv[2] ?? "./fixtures/internal/keyframes.pptx";

console.log(`Testing timing parser with: ${filePath}`);

async function main() {
  const file = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(file);

  // Find all slide files
  const slideFiles = Object.keys(zip.files).filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/));
  console.log(`Found ${slideFiles.length} slides`);

  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)?.async("string");
    if (!xml) {
      continue;
    }

    const doc = parseXml(xml);

    // Find p:timing element
    function findTiming(el: unknown): XmlElement | null {
      if (!isXmlElement(el)) {
        return null;
      }
      if (el.name === "p:timing") {
        return el;
      }
      for (const child of el.children) {
        const found = findTiming(child);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const timing = findTiming(doc.children[0]);

    if (timing) {
      console.log(`\n=== ${slideFile} ===`);
      const result = parseTiming(timing);
      console.log(JSON.stringify(result, null, 2));
    }
  }

  console.log("\nDone!");
}

main();
