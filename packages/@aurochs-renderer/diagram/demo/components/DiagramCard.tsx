/**
 * @file Individual diagram display card
 *
 * Renders a simple SVG preview of the diagram shapes.
 */

import { useMemo } from "react";
import type { DiagramSample, DiagramShape } from "../fixtures";

type Props = {
  readonly item: DiagramSample;
  readonly isSelected: boolean;
  readonly onClick: () => void;
};

const styles = {
  card: {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  cardSelected: {
    transform: "scale(1.02)",
    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
  },
  preview: {
    padding: "20px",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "220px",
  },
  info: {
    padding: "12px 16px",
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "4px",
  },
  description: {
    fontSize: "12px",
    color: "#64748b",
  },
  meta: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  stat: {
    padding: "2px 8px",
    fontSize: "11px",
    borderRadius: "4px",
    background: "#f1f5f9",
    color: "#475569",
  },
  category: {
    padding: "2px 8px",
    fontSize: "11px",
    borderRadius: "4px",
    background: "#e0e7ff",
    color: "#4338ca",
  },
};

function renderShape(shape: DiagramShape): string {
  const { x, y, width, height, fill, text, type } = shape;
  const fillColor = fill ?? "#4472C4";
  const textX = x + width / 2;
  const textY = y + height / 2;

  switch (type) {
    case "rectangle":
      return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fillColor}" rx="2" opacity="0.9"/>
        ${text ? `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-family="sans-serif">${text}</text>` : ""}
      `;
    case "roundRect":
      return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fillColor}" rx="8" opacity="0.9"/>
        ${text ? `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="11" font-family="sans-serif">${text}</text>` : ""}
      `;
    case "ellipse":
      const cx = x + width / 2;
      const cy = y + height / 2;
      return `
        <ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" fill="${fillColor}" opacity="0.7"/>
        ${text ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="11" font-family="sans-serif" font-weight="bold">${text}</text>` : ""}
      `;
    case "arrow":
      const endX = x + width;
      const midY = y + height / 2;
      return `
        <line x1="${x}" y1="${midY}" x2="${endX - 8}" y2="${midY}" stroke="#666" stroke-width="2"/>
        <polygon points="${endX},${midY} ${endX - 10},${midY - 5} ${endX - 10},${midY + 5}" fill="#666"/>
      `;
    case "text":
      return `
        <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="#333" font-size="12" font-family="sans-serif">${text ?? ""}</text>
      `;
    default:
      return "";
  }
}

export function DiagramCard({ item, isSelected, onClick }: Props) {
  const svg = useMemo(() => {
    const shapeSvg = item.shapes.map(renderShape).join("");

    // Calculate viewBox based on shapes
    let maxX = 0;
    let maxY = 0;
    for (const shape of item.shapes) {
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    }

    const padding = 20;
    const viewWidth = maxX + padding;
    const viewHeight = maxY + padding;

    return `
      <svg width="300" height="180" viewBox="0 0 ${viewWidth} ${viewHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${shapeSvg}
      </svg>
    `;
  }, [item.shapes]);

  const cardStyle = {
    ...styles.card,
    ...(isSelected ? styles.cardSelected : {}),
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={styles.preview}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div style={styles.info}>
        <div style={styles.title}>{item.name}</div>
        <div style={styles.description}>{item.description}</div>
        <div style={styles.meta}>
          <span style={styles.category}>{item.category}</span>
          <span style={styles.stat}>{item.shapes.length} shapes</span>
          {item.connections.length > 0 && (
            <span style={styles.stat}>{item.connections.length} connections</span>
          )}
        </div>
      </div>
    </div>
  );
}
