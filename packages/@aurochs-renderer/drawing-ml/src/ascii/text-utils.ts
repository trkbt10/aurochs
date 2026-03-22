/**
 * @file Common text utilities for ASCII rendering
 */

/** Wrap text to fit within the given width, breaking at word boundaries. */
export function wrapText(text: string, width: number): readonly string[] {
  if (width <= 0) {
    return [];
  }

  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    const currentLine = { value: "" };

    for (const word of words) {
      if (word.length === 0) {
        continue;
      }

      if (currentLine.value.length === 0) {
        // First word on the line — force it even if too long
        if (word.length > width) {
          // Break long words
          for (let i = 0; i < word.length; i += width) {
            lines.push(word.substring(i, i + width));
          }
          currentLine.value = "";
          // If the last chunk is a full line, reset
          if (lines.length > 0 && lines[lines.length - 1]!.length < width) {
            currentLine.value = lines.pop()!;
          }
        } else {
          currentLine.value = word;
        }
      } else if (currentLine.value.length + 1 + word.length <= width) {
        currentLine.value += " " + word;
      } else {
        lines.push(currentLine.value);
        if (word.length > width) {
          for (let i = 0; i < word.length; i += width) {
            lines.push(word.substring(i, i + width));
          }
          currentLine.value = "";
          if (lines.length > 0 && lines[lines.length - 1]!.length < width) {
            currentLine.value = lines.pop()!;
          }
        } else {
          currentLine.value = word;
        }
      }
    }

    if (currentLine.value.length > 0) {
      lines.push(currentLine.value);
    }
  }

  return lines;
}
