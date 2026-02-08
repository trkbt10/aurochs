/**
 * @file Bullet rendering for text paragraphs
 *
 * Renders character and picture bullets for paragraphs.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet Properties)
 */

import type { ReactNode } from "react";
import type { LayoutParagraphResult } from "../../../text-layout";
import { PT_TO_PX } from "@aurochs-office/pptx/domain/unit-conversion";

// =============================================================================
// Constants
// =============================================================================

/**
 * Image bullet vertical offset factor (relative to font size).
 */
const IMAGE_BULLET_OFFSET_FACTOR = 0.8;

// =============================================================================
// Bullet Rendering
// =============================================================================

/**
 * Render bullet for a paragraph.
 *
 * Supports:
 * - Character bullets (text element)
 * - Picture bullets (image element)
 *
 * @param para - Layout paragraph result containing bullet info
 * @param key - React key for the element
 * @returns Bullet element or null if no bullet
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4.1-4 (buAutoNum, buChar, buBlip, buNone)
 */
export function renderBullet(para: LayoutParagraphResult, key: number): ReactNode {
  if (para.bullet === undefined || para.lines.length === 0) {
    return null;
  }

  const firstLine = para.lines[0];
  const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
  const bulletY = firstLine.y as number;
  const bulletFontSize = (para.bullet.fontSize as number) * PT_TO_PX;

  // Picture bullet
  if (para.bullet.imageUrl !== undefined) {
    return renderPictureBullet({
      x: bulletX,
      y: bulletY,
      size: bulletFontSize,
      imageUrl: para.bullet.imageUrl,
      key,
    });
  }

  // Character bullet
  return renderCharacterBullet({
    x: bulletX,
    y: bulletY,
    fontSize: bulletFontSize,
    char: para.bullet.char,
    color: para.bullet.color,
    fontFamily: para.bullet.fontFamily,
    key,
  });
}

/**
 * Render picture bullet as image element.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4.3 (buBlip)
 */
function renderPictureBullet({
  x,
  y,
  size,
  imageUrl,
  key,
}: {
  x: number;
  y: number;
  size: number;
  imageUrl: string;
  key: number;
}): ReactNode {
  const imageY = y - size * IMAGE_BULLET_OFFSET_FACTOR;

  return (
    <image
      key={`bullet-${key}`}
      href={imageUrl}
      x={x}
      y={imageY}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

/**
 * Render character bullet as text element.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4.4 (buChar)
 */
function renderCharacterBullet({
  x,
  y,
  fontSize,
  char,
  color,
  fontFamily,
  key,
}: {
  x: number;
  y: number;
  fontSize: number;
  char: string;
  color: string;
  fontFamily: string;
  key: number;
}): ReactNode {
  return (
    <text key={`bullet-${key}`} x={x} y={y} fontSize={`${fontSize}px`} fill={color} fontFamily={fontFamily}>
      {char}
    </text>
  );
}
