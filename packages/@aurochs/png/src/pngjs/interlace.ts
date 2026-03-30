/**
 * @file Adam7 interlace support for PNG
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

type ImagePass = {
  width: number;
  height: number;
  index: number;
};

const imagePasses = [
  { x: [0], y: [0] },
  { x: [4], y: [0] },
  { x: [0, 4], y: [4] },
  { x: [2, 6], y: [0, 4] },
  { x: [0, 2, 4, 6], y: [2, 6] },
  { x: [1, 3, 5, 7], y: [0, 2, 4, 6] },
  { x: [0, 1, 2, 3, 4, 5, 6, 7], y: [1, 3, 5, 7] },
];

/**
 * Compute the sub-image dimensions for each Adam7 interlace pass.
 */
export function getImagePasses(width: number, height: number): ImagePass[] {
  const xLeftOver = width % 8;
  const yLeftOver = height % 8;
  const xRepeats = (width - xLeftOver) / 8;
  const yRepeats = (height - yLeftOver) / 8;

  return imagePasses.reduce<ImagePass[]>((images, pass, i) => {
    const passWidth = xRepeats * pass.x.length + pass.x.filter((v) => v < xLeftOver).length;
    const passHeight = yRepeats * pass.y.length + pass.y.filter((v) => v < yLeftOver).length;
    if (passWidth > 0 && passHeight > 0) {
      images.push({ width: passWidth, height: passHeight, index: i });
    }
    return images;
  }, []);
}

/**
 * Return a function that maps interlaced (x, y, pass) to a pixel buffer offset.
 */
export function getInterlaceIterator(width: number): (x: number, y: number, pass: number) => number {
  return (x: number, y: number, pass: number): number => {
    const outerXLeftOver = x % imagePasses[pass].x.length;
    const outerX =
      ((x - outerXLeftOver) / imagePasses[pass].x.length) * 8 +
      imagePasses[pass].x[outerXLeftOver];
    const outerYLeftOver = y % imagePasses[pass].y.length;
    const outerY =
      ((y - outerYLeftOver) / imagePasses[pass].y.length) * 8 +
      imagePasses[pass].y[outerYLeftOver];
    return outerX * 4 + outerY * width * 4;
  };
}
