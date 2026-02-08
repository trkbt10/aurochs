/**
 * @file Unique shape ID generation utilities
 */

/**
 * Generate a unique shape ID
 */
export function generateShapeId(existingIds: readonly string[]): string {
  const maxId = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return String(maxId + 1);
}
