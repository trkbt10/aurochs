/**
 * @file Zoom type definitions
 */

/**
 * Zoom mode type.
 * - 'fit': Automatically fits content to the viewport (dynamic scaling on resize)
 * - number: Fixed zoom value (e.g., 0.5, 1, 1.5)
 */
export type ZoomMode = "fit" | number;
