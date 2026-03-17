/** @file Build SVG path data strings from PDF path operations. */
import type { PdfPath, PdfPathOp, PdfPoint } from "@aurochs/pdf/domain";
import { formatSvgNumber } from "./number-format";

function toSvgY(pdfY: number, pageHeight: number): number {
  return pageHeight - pdfY;
}

function pointToSvgText(point: PdfPoint, pageHeight: number): string {
  return `${formatSvgNumber(point.x)} ${formatSvgNumber(toSvgY(point.y, pageHeight))}`;
}

function rectToPath(rect: Extract<PdfPathOp, { type: "rect" }>, pageHeight: number): string {
  const p1 = { x: rect.x, y: rect.y };
  const p2 = { x: rect.x + rect.width, y: rect.y };
  const p3 = { x: rect.x + rect.width, y: rect.y + rect.height };
  const p4 = { x: rect.x, y: rect.y + rect.height };
  return `M ${pointToSvgText(p1, pageHeight)} L ${pointToSvgText(p2, pageHeight)} L ${pointToSvgText(p3, pageHeight)} L ${pointToSvgText(p4, pageHeight)} Z`;
}

/** Convert a PDF path to an SVG path data string, flipping Y coordinates. */
export function buildSvgPathData(path: PdfPath, pageHeight: number): string {
  const commands: string[] = [];
  const currentPointState: { value: PdfPoint | null } = { value: null };

  for (const operation of path.operations) {
    if (operation.type === "moveTo") {
      commands.push(`M ${pointToSvgText(operation.point, pageHeight)}`);
      currentPointState.value = operation.point;
      continue;
    }

    if (operation.type === "lineTo") {
      commands.push(`L ${pointToSvgText(operation.point, pageHeight)}`);
      currentPointState.value = operation.point;
      continue;
    }

    if (operation.type === "curveTo") {
      commands.push(
        `C ${pointToSvgText(operation.cp1, pageHeight)} ${pointToSvgText(operation.cp2, pageHeight)} ${pointToSvgText(operation.end, pageHeight)}`,
      );
      currentPointState.value = operation.end;
      continue;
    }

    if (operation.type === "curveToV") {
      const cp1 = currentPointState.value ?? operation.cp2;
      commands.push(
        `C ${pointToSvgText(cp1, pageHeight)} ${pointToSvgText(operation.cp2, pageHeight)} ${pointToSvgText(operation.end, pageHeight)}`,
      );
      currentPointState.value = operation.end;
      continue;
    }

    if (operation.type === "curveToY") {
      commands.push(
        `C ${pointToSvgText(operation.cp1, pageHeight)} ${pointToSvgText(operation.end, pageHeight)} ${pointToSvgText(operation.end, pageHeight)}`,
      );
      currentPointState.value = operation.end;
      continue;
    }

    if (operation.type === "rect") {
      commands.push(rectToPath(operation, pageHeight));
      currentPointState.value = { x: operation.x, y: operation.y };
      continue;
    }

    commands.push("Z");
  }

  return commands.join(" ");
}
